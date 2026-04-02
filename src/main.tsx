import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Load Google Fonts specified in the PRD (Poppins + Quicksand as defaults)
const link = document.createElement("link");
link.rel = "stylesheet";
link.href =
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&display=swap";
document.head.appendChild(link);

createRoot(document.getElementById("root")!).render(<App />);
