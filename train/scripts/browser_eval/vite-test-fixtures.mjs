// TEST-only faithful Vite configureServer/Connect call boundary.
// Fake Vite server: the route plugin's configureServer installs the
// captured middleware; listen/bind/transform are spied.
export const fakeVite = ({ address, closeError } = {}) => {
  const calls = { middlewares: [], server: null, postHooks: [] };
  const middlewares = (req, res, next) => {
    // Connect's callable app requires an actual request even before dispatch.
    const originalUrl = req.url;
    req.originalUrl ??= originalUrl;
    let index = 0;
    const dispatch = (error) => {
      if (error || index === calls.middlewares.length) {
        return next?.(error);
      }
      const handler = calls.middlewares[index];
      index += 1;
      return handler(req, res, dispatch);
    };
    return dispatch();
  };
  middlewares.use = (handler) => {
    calls.middlewares.push(handler);
    return middlewares;
  };
  const server = {
    middlewares,
    httpServer: { address: () => address ?? { address: "127.0.0.1", port: 19001 } },
    listen: async () => {
      server.listened = (server.listened ?? 0) + 1;
    },
    close: async () => {
      server.closed = (server.closed ?? 0) + 1;
      if (closeError !== undefined) throw closeError;
    },
    transformIndexHtml: async (url, html) => {
      server.transforms = [...(server.transforms ?? []), { url, html }];
      return html;
    },
  };
  calls.server = server;
  calls.createServer = async (options) => {
    calls.options = options;
    calls.postHooks = [];
    for (const plugin of options.plugins) {
      if (plugin && typeof plugin.configureServer === "function") {
        calls.postHooks.push(await plugin.configureServer(server));
      }
    }
    for (const hook of calls.postHooks) {
      if (hook) {
        hook();
      }
    }
    return server;
  };
  // The faithful {calls,createServer} shape — every owner drives the
  // SAME recorded calls object through vite.calls.* and the SAME spy
  // through vite.createServer.
  return { calls, createServer: calls.createServer };
};
