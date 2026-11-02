import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";


Office.onReady(() => {
    createRoot(document.getElementById("root")).render(
        <StrictMode>
            <App />
        </StrictMode>
    );
});
