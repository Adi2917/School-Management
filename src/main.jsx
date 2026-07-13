import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./theme.css";
import "./premium.css";
import "./final-polish.css";
import "./scroll-fix.css";
import "./result-final.css";
import "./bugfix.css";
import "./functional-premium.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
