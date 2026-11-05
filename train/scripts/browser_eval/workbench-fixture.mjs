// Candidate-only workbench fixture: mounts the ACTUAL snapshot
// Workbench component as-is — real component, real styles, real React
// root. No production route, no component test props, no alternate UI.
// The module body runs only when the page loads it (the server serves it
// exclusively at /workbench on the candidate arm).

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Workbench } from "@/components/chess/workbench.tsx";
import "@/styles.css";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("tinyaz fixture: missing #root element");
}

createRoot(rootElement).render(createElement(Workbench));
