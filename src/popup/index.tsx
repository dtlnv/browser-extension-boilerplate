import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { initI18N } from "@/i18n";
import { App } from "./App";

const container = document.getElementById("popup-root");
if (!container) {
  throw new Error("popup-root element not found");
}

// Must resolve before the first render: t() is synchronous and reads whatever
// language initI18N() last set, so React must not call it before storage
// (browser.storage.local) has actually returned the saved language.
initI18N().then(() => {
  createRoot(container).render(
    <ThemeProvider>
      <App />
      <Toaster position="top-center" />
    </ThemeProvider>,
  );
});
