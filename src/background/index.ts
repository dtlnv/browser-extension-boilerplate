import browser from "webextension-polyfill";
import { logger } from "@/lib/logger";
import { onMessage, sendMessage, sendMessageToTab } from "@/lib/messaging";

logger.log(`background started — target=${__TARGET__} env=${__APP_ENV__}`);

browser.runtime.onInstalled.addListener((details) => {
  logger.log("onInstalled:", details.reason);
});

onMessage({
  ping: async () => ({ pong: true, timestamp: Date.now() }),

  getActiveTabInfo: async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error("No active tab found");
    }
    return sendMessageToTab(tab.id, "getPageInfo", undefined);
  },

  getActiveTabTitle: async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error("No active tab found");
    }
    return { title: tab.title ?? "", url: tab.url ?? "" };
  },
});

// Side panel (chromium only — see manifest.config.ts): push the active tab's
// title/url so an open panel updates live. sendMessage throwing here just
// means no side panel is currently open — expected, not an error.
async function broadcastActiveTab(tab: browser.Tabs.Tab) {
  try {
    await sendMessage("activeTabChanged", { title: tab.title ?? "", url: tab.url ?? "" });
  } catch {
    // No listener — side panel isn't open.
  }
}

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  await broadcastActiveTab(await browser.tabs.get(tabId));
});

browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  // tab.active guards against a background tab's title change overwriting the panel.
  if (changeInfo.title && tab.active) {
    void broadcastActiveTab(tab);
  }
});
