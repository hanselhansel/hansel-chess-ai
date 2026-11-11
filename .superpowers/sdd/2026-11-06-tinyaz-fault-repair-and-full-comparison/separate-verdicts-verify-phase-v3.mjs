// Independent readback CLI. A readback exit0 preserves experimental exit2.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { assertReleasedInputs, json, write, PHASES } from './separate-verdicts-shared-v3.mjs';
import { openV3ReadOnlyGraphContext, readPhase } from './separate-verdicts-graph-v3.mjs';

export async function verifyV3Phase(phase, releasePath) {
  assert(PHASES.includes(phase));
  const { release, context } = await openV3ReadOnlyGraphContext({ releasePath, purpose: 'phase-readback' });
  let result, primary, failed = false;
  try {
    const out = path.join(release.orchestrationRoot, phase);
    context.assertLive();
    const command = json(path.join(out, 'result.json'));
    context.assertLive();
    result = await readPhase(release, phase, command, context);
    context.assertLive(); assertReleasedInputs(release); context.assertLive();
  } catch (error) { failed = true; primary = error; }
  try { await context.close(); } catch (error) { if (!failed) { failed = true; primary = error; } }
  if (failed) throw primary;
  const verified = { ...result, actualVerifierOwnerSettled: true };
  write(path.join(release.orchestrationRoot, phase, 'verification.json'), verified);
  return verified;
}
if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 5, 'usage: --verify <phase> <controller-release.json>');
    assert.equal(process.argv[2], '--verify');
    console.log(JSON.stringify(await verifyV3Phase(process.argv[3], process.argv[4])));
  } catch (error) {
    console.error(String(error?.stack ?? error));
    process.exitCode = 1;
  }
}
