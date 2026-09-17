import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initInstallCapture } from "./pwa/install";
import "./styles.css";

initInstallCapture();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
