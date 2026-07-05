import pkg from "./package.json";

export type ExtensionTarget = "chromium" | "firefox" | "safari";
export type BuildEnv = "dev" | "prod";

const EXTENSION_NAME = "Extension Boilerplate";

// Placeholder Firefox add-on ID. Replace with your own before publishing to AMO
// (either a UUID in braces like this, or an email-style string).
const GECKO_ID_PLACEHOLDER = "{6a9c1c31-4c8c-4c1a-9f3a-1a2b3c4d5e6f}";

const ICONS = {
  "16": "icons/icon-16.png",
  "32": "icons/icon-32.png",
  "48": "icons/icon-48.png",
  "128": "icons/icon-128.png",
};

function baseManifest() {
  return {
    manifest_version: 3 as const,
    name: EXTENSION_NAME,
    description: "__MSG_extDescription__",
    version: pkg.version,
    default_locale: "en",
    icons: ICONS,
    action: {
      default_popup: "popup.html",
      default_icon: ICONS,
    },
    permissions: ["storage"],
    host_permissions: [] as string[],
    content_scripts: [
      {
        matches: ["http://*/*", "https://*/*"],
        js: ["content.js"],
        run_at: "document_idle" as const,
      },
    ],
  };
}

/**
 * The only field that legitimately differs in shape per browser. Our bundler
 * emits IIFE (classic script) output for background.js, so no target needs
 * `"type": "module"` here — Safari's old manifest set that unnecessarily.
 */
function backgroundFor(
  target: ExtensionTarget,
): { service_worker: string } | { scripts: string[] } {
  if (target === "firefox") {
    return { scripts: ["background.js"] };
  }
  return { service_worker: "background.js" };
}

export function buildManifest(target: ExtensionTarget, env: BuildEnv): Record<string, unknown> {
  const manifest: Record<string, unknown> = {
    ...baseManifest(),
    // Dev builds get a distinguishable name so you can load dev + prod side by side.
    name: env === "dev" ? `${EXTENSION_NAME} (Dev)` : EXTENSION_NAME,
    background: backgroundFor(target),
  };

  if (target === "firefox") {
    manifest.browser_specific_settings = {
      gecko: {
        id: GECKO_ID_PLACEHOLDER,
        strict_min_version: "109.0",
      },
    };
  }

  return manifest;
}
