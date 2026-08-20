import { useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { onMessage, sendMessage } from "@/lib/messaging";

export function App() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  // onMessage has no unsubscribe (shared with background/content, where a
  // listener is meant to live for the whole context) — guard registration
  // instead, so this effect stays idempotent if it ever runs more than once
  // per mount (e.g. under StrictMode).
  const registered = useRef(false);

  useEffect(() => {
    if (!registered.current) {
      registered.current = true;
      onMessage({
        activeTabChanged: async (payload) => {
          setTitle(payload.title);
          setUrl(payload.url);
          return { received: true };
        },
      });
    }

    sendMessage("getActiveTabTitle", undefined).then(({ title, url }) => {
      setTitle(title);
      setUrl(url);
    });
  }, []);

  return (
    <div className="flex flex-col gap-2 p-4">
      <h1 className="text-sm font-semibold">{t("sidepanel-heading")}</h1>
      {title ? (
        <>
          <p className="text-sm">{title}</p>
          <p className="break-all text-xs text-muted-foreground">{url}</p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{t("sidepanel-empty")}</p>
      )}
    </div>
  );
}
