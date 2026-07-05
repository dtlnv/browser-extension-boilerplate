import browser from "webextension-polyfill";
import { logger } from "@/lib/logger";
import { onMessage, sendMessageToTab } from "@/lib/messaging";

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
});
