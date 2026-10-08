import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./v2.css"; // visual da versão 2.0 (vem depois e sobrescreve o antigo)

createRoot(document.getElementById("root")).render(<App />);
