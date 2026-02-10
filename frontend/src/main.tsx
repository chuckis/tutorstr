import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Minimal registration; ignore errors in dev.
      });
    });
  }
}

registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
