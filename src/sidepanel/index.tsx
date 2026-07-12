import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import { initI18N } from "@/i18n";
import { App } from "./App";

const container = document.getElementById("sidepanel-root");
if (!container) {
  throw new Error("sidepanel-root element not found");
}

initI18N().then(() => {
  createRoot(container).render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
});
