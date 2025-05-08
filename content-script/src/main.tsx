import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import cssText from "./index.css?inline";

const container = document.createElement("div");
const shadowRoot = container.attachShadow({ mode: "open" });
document.body.appendChild(container);

const style = document.createElement("style");
style.textContent = cssText;
shadowRoot.appendChild(style);

const reactRoot = document.createElement("div");
shadowRoot.appendChild(reactRoot);

const root = createRoot(reactRoot);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
