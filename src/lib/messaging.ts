import browser from "webextension-polyfill";

/**
 * Extend this interface with your own actions. Each key is an action name;
 * `request`/`response` define its payload/return types. Full autocomplete and
 * type safety flow from here into sendMessage/sendMessageToTab/onMessage.
 */
export interface MessageMap {
  ping: { request: undefined; response: { pong: true; timestamp: number } };
  getActiveTabInfo: { request: undefined; response: { title: string; url: string } };
  getPageInfo: { request: undefined; response: { title: string; url: string } };
  getActiveTabTitle: { request: undefined; response: { title: string; url: string } };
  activeTabChanged: { request: { title: string; url: string }; response: { received: true } };
}

export type MessageAction = keyof MessageMap;

interface OutgoingMessage<K extends MessageAction> {
  __ext_action: K;
  payload: MessageMap[K]["request"];
}

type ResponseEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

function isExtensionMessage(msg: unknown): msg is OutgoingMessage<MessageAction> {
  return typeof msg === "object" && msg !== null && "__ext_action" in msg;
}

function unwrap<T>(response: ResponseEnvelope<T> | undefined, action: string): T {
  if (!response) {
    throw new Error(`No response received for action "${action}"`);
  }
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.data;
}

/** Call from the popup or content script -> background. */
export async function sendMessage<K extends MessageAction>(
  action: K,
  payload: MessageMap[K]["request"],
): Promise<MessageMap[K]["response"]> {
  const message: OutgoingMessage<K> = { __ext_action: action, payload };
  const response = (await browser.runtime.sendMessage(message)) as
    | ResponseEnvelope<MessageMap[K]["response"]>
    | undefined;
  return unwrap(response, action);
}

/**
 * Call from the background -> a specific tab's content script. If the content
 * script is unreachable (stale/unloaded, e.g. after navigation), the tab is
 * reloaded instead of just failing silently.
 */
export async function sendMessageToTab<K extends MessageAction>(
  tabId: number,
  action: K,
  payload: MessageMap[K]["request"],
): Promise<MessageMap[K]["response"]> {
  const message: OutgoingMessage<K> = { __ext_action: action, payload };
  try {
    const response = (await browser.tabs.sendMessage(tabId, message)) as
      | ResponseEnvelope<MessageMap[K]["response"]>
      | undefined;
    return unwrap(response, action);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Could not establish connection")) {
      await browser.tabs.reload(tabId);
      throw new Error(
        `Content script unreachable in tab ${tabId}; tab reloaded — retry the action.`,
      );
    }
    throw error;
  }
}

type Handlers = {
  [K in MessageAction]?: (
    payload: MessageMap[K]["request"],
    sender: browser.Runtime.MessageSender,
  ) => MessageMap[K]["response"] | Promise<MessageMap[K]["response"]>;
};

/**
 * Register handlers for incoming messages. Used identically in the background
 * and content script. Call ONCE per context with all of that context's handlers.
 */
export function onMessage(handlers: Handlers): void {
  browser.runtime.onMessage.addListener(
    (message: unknown, sender: browser.Runtime.MessageSender) => {
      if (!isExtensionMessage(message)) {
        return undefined; // not ours — let other listeners see it
      }
      const handler = handlers[message.__ext_action];
      if (!handler) {
        return undefined; // unrecognized here — don't claim it, avoids hanging the sender
      }

      return (async (): Promise<ResponseEnvelope<unknown>> => {
        try {
          const data = await handler(message.payload as never, sender);
          return { ok: true, data };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
      })();
    },
  );
}
