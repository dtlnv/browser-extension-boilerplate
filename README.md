# Browser Extension Boilerplate

A minimal, production-ready boilerplate for building browser extensions targeting **Chrome/Chromium, Firefox, and Safari** (Manifest V3) from a single codebase.

Built with **Bun** (package manager, bundler, and script runner), **React 19**, **shadcn/ui**, **Tailwind CSS v4**, **TypeScript**, and **Biome**.

## Quick start

```sh
bun install
bun run dev:chromium
```

Then load the unpacked extension:
- **Chrome/Edge/Brave**: `chrome://extensions` → enable Developer mode → "Load unpacked" → select `build/chromium`.
- **Firefox**: `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on" → pick any file inside `build/firefox`.
- **Safari**: see the [Safari section](#safari) below — it needs one extra step.

Open the popup and click the two demo buttons — "Ping background" and "Get active tab info" — to see the popup, service worker, and content script talking to each other. The popup also demonstrates language switching, dark/light/system theming, and toast notifications.

## Build commands

| Command | What it does |
|---|---|
| `bun run dev:chromium` / `dev:firefox` / `dev:safari` | Build for that target (dev, unminified) and watch for changes |
| `bun run build:chromium` / `build:firefox` / `build:safari` | Production build for that target |
| `bun run build:all` | Production build for all three targets |
| `bun run zip:chromium` / `zip:firefox` / `zip:safari` | Production build + zip archive for store submission |
| `bun run zip:all` | Zip all three targets |
| `bun run lint` / `lint:fix` / `format` | Biome check / fix / format |
| `bun run typecheck` | `tsc --noEmit` |

There is no HMR: `--watch` does a full rebuild on file changes (150ms debounce, single-flight — a burst of changes while a build is running queues at most one more rebuild instead of piling up) and prints the rebuild time. Reload the unpacked extension in the browser manually after each rebuild — this is intentional, to keep the build predictable rather than adding dev-only magic.

## Project structure

```
manifest.config.ts       # single source of truth for manifest.json, all 3 targets
scripts/
  build.ts               # bun-native build orchestrator (no webpack)
  zip.ts                 # packages build/<target> into a .zip
src/
  background/index.ts     # service worker entry — register onMessage handlers here
  content/index.ts        # content script entry — register onMessage handlers here
  popup/                  # React popup (entry, root component, Tailwind styles)
  components/
    ui/                    # shadcn/ui primitives (button, select, sonner toaster, etc.)
    theme-provider.tsx      # dark/light/system theme context (localStorage-backed)
    theme-select.tsx        # theme switcher — falls back to a native <select> on Firefox/Safari
    language-select.tsx     # language switcher — same native-<select> fallback
  i18n/
    index.ts               # t() / initI18N() / changeLanguage() — see i18n section below
    locales/                # de, en, es, es_la, fr, pl, pt_br, pt_pt UI strings
  lib/
    messaging.ts           # typed sendMessage / sendMessageToTab / onMessage
    storage.ts              # typed browser.storage.local wrapper
    logger.ts               # namespaced console wrapper
    utils.ts                # cn() classname helper, isFirefox / isSafari checks
public/
  icons/                  # extension icons (16/32/48/128px)
  _locales/               # standard Chrome i18n messages (manifest name/description)
```

## How the build works

`scripts/build.ts` runs on Bun directly (`bun scripts/build.ts --target=... --env=...`), no separate compile step:
1. On the first run, cleans `build/<target>` (`build/safari/Resources` for Safari). Watch-mode rebuilds skip this and overwrite files in place instead — deleting and recreating the output directory on every rebuild was found to occasionally confuse the recursive `fs.watch` on `public/` into firing phantom events and cascading into repeated rebuilds.
2. Runs three `Bun.build()` calls in parallel — one each for `background/index.ts`, `content/index.ts`, `popup/index.tsx` — each producing a single self-contained IIFE script (`background.js`, `content.js`, `popup.js`).
3. Compiles `popup/styles.css` (Tailwind v4) via the standalone `@tailwindcss/cli` into `popup.css`.
4. Writes `manifest.json` from `manifest.config.ts`, and copies `public/icons`, `public/_locales`, and `popup/index.html`.

`manifest.config.ts` is the only place manifest differences between browsers live — everything else (icons, permissions, content script matches) is shared. This avoids the classic problem of three hand-maintained JSON files silently drifting apart.

## How to extend messaging

Add a new action to the `MessageMap` in [src/lib/messaging.ts](src/lib/messaging.ts):

```ts
export interface MessageMap {
  // ...existing entries
  myAction: { request: { foo: string }; response: { bar: number } };
}
```

Implement the handler in whichever context receives it (background or content), inside `onMessage({...})`:

```ts
onMessage({
  myAction: async ({ foo }) => ({ bar: foo.length }),
});
```

Call it from the sending side:

```ts
const { bar } = await sendMessage("myAction", { foo: "hi" }); // popup/content -> background
const { bar } = await sendMessageToTab(tabId, "myAction", { foo: "hi" }); // background -> a tab's content script
```

`onMessage` should be called once per context with all of that context's handlers. `sendMessageToTab` automatically reloads the target tab if its content script is unreachable (e.g. after navigation) and throws a retryable error.

## Storage

```ts
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";

await setStorageItem("count", 1);
const count = await getStorageItem<number>("count");
await removeStorageItem("count");
```

Thin wrapper over `browser.storage.local` (via `webextension-polyfill`) — no key/value obfuscation. Add your own encryption at the point where you actually need it, rather than baking in a false sense of security here.

## i18n

Two independent i18n systems, for two different purposes:

- **`src/i18n`** — runtime UI strings for React components. `t(key, data?)` looks up the current language (persisted via `browser.storage.local`, see [src/i18n/index.ts](src/i18n/index.ts)) with English as a fallback. 8 languages ship by default (`de, en, es, es_la, fr, pl, pt_br, pt_pt`); add more by dropping a new `src/i18n/locales/<code>.json` and adding it to `availableLanguages`/`locales` in `index.ts`.
- **`public/_locales/<lang>/messages.json`** — the standard Chrome extension i18n mechanism, used only for the manifest itself (`manifest.config.ts`'s `description: "__MSG_extDescription__"` resolves against it). See the [Chrome i18n docs](https://developer.chrome.com/docs/extensions/reference/api/i18n) for the message format.

**Important ordering rule**: `t()` is synchronous and reads whatever language `initI18N()` last loaded from storage. The popup entry point ([src/popup/index.tsx](src/popup/index.tsx)) awaits `initI18N()` *before* mounting React, so the first render always sees the correct persisted language. Don't call `t()` anywhere that can run before `initI18N()` resolves (e.g. don't move it to fire-and-forget at module load) — that reintroduces a race where the UI briefly (or, on browsers where storage access is slower, not-so-briefly) shows the wrong language.

Language and theme switching (`ThemeSelect` / `LanguageSelect` in [src/components](src/components)) render a native `<select>` on Firefox/Safari instead of the custom Radix one, working around a Radix `Select` bug where it doesn't update its displayed value on open in those browsers.

## Theming & toasts

[src/components/theme-provider.tsx](src/components/theme-provider.tsx) is a small self-contained dark/light/system theme context backed by `localStorage` (not `next-themes` — there's no Next.js here). The Sonner `Toaster` ([src/components/ui/sonner.tsx](src/components/ui/sonner.tsx)) reads its theme from this same provider via `useTheme()`, so toasts always match whatever the user picked in `ThemeSelect`.

## Safari

Safari doesn't support loading unpacked web extensions directly — it needs an Xcode wrapper:

```sh
bun run build:safari
xcrun safari-web-extension-converter build/safari/Resources
```

Then open the generated Xcode project, run it once to register the app, and enable the extension in Safari's Settings → Extensions. This conversion step is manual and outside the scope of `build.ts`.

## Icons

`public/icons/` ships with plain placeholder PNGs (16/32/48/128px) — replace them with real artwork before publishing.

## Publishing

`bun run zip:chromium` (or `:firefox` / `:safari`) builds and produces `extension-<target>-v<version>.zip` at the repo root. Store submission itself (Chrome Web Store, AMO, App Store Connect) is manual.

## Testing

No test framework is set up by default — `bun test` is available out of the box if you want to add tests later.

## Known limitations

- `Bun.build`'s `format: "iife"` output was verified end-to-end (service worker, content script, and popup all load and message each other correctly in Chrome), but is documented by Bun as experimental — re-verify after upgrading Bun.
- Safari's MV3 service-worker background support is newer than Chromium/Firefox's — test manually in Safari after the Xcode conversion step above.
- `--watch` uses recursive `fs.watch`, which isn't guaranteed on Linux; a per-subdirectory fallback kicks in automatically if the recursive form isn't supported (only affects dev-mode convenience, not `build:*`/`zip:*`).
- After switching language via `LanguageSelect`, already-rendered text elsewhere in the popup doesn't reactively update (language lives in a plain module variable, not React state) — it takes effect the next time the popup is opened. Wire it into React context/state if you need instant in-place updates.
