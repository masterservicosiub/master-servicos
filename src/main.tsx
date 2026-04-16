import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPushNotifications } from "./lib/pushNotifications";

// Init push notifications on native
initPushNotifications();

createRoot(document.getElementById("root")!).render(<App />);
