import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Deploy: `php artisan deploy` greps main-*.js for this literal (minified bundles drop component names).
(globalThis as unknown as Record<string, string>).__LIVEGRID_BUILD_VERIFY__ =
  "LIVEGRID_BUILD_VERIFY_AppLayout_stack_2026";

createRoot(document.getElementById("root")!).render(<App />);
