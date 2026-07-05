import { logger } from "@/lib/logger";
import { onMessage } from "@/lib/messaging";

logger.log(`content script injected on ${location.href}`);

onMessage({
  getPageInfo: async () => ({ title: document.title, url: location.href }),
});
