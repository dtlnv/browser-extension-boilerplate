// Injected at build time via Bun.build's `define` option in scripts/build.ts.
declare const __EXTENSION_NAME__: string;
declare const __TARGET__: "chromium" | "firefox" | "safari";
declare const __APP_ENV__: "dev" | "prod";

// Chrome-only Side Panel API — no @types/chrome dependency; only the one
// method this codebase calls is declared (see src/popup/App.tsx).
declare const chrome: {
  sidePanel: {
    open(options: { tabId?: number; windowId?: number }): Promise<void>;
  };
};
