import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { PercuProStoreProvider } from "./core/store";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PercuProStoreProvider>
      <App />
    </PercuProStoreProvider>
  </React.StrictMode>
);
