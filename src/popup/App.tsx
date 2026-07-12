import { useState } from "react";
import browser from "webextension-polyfill";
import { LanguageSelect } from "@/components/language-select";
import { ThemeSelect } from "@/components/theme-select";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { sendMessage } from "@/lib/messaging";
import { isFirefox, isSafari } from "@/lib/utils";

export function App() {
  const [pingResult, setPingResult] = useState("");
  const [tabInfo, setTabInfo] = useState("");
  const [error, setError] = useState("");

  async function handlePing() {
    setError("");
    try {
      setPingResult(JSON.stringify(await sendMessage("ping", undefined)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleGetTabInfo() {
    setError("");
    try {
      setTabInfo(JSON.stringify(await sendMessage("getActiveTabInfo", undefined)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleOpenSidePanel() {
    setError("");
    try {
      const window = await browser.windows.getCurrent();
      if (!window.id) {
        throw new Error("No current window id");
      }
      await chrome.sidePanel.open({ windowId: window.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-sm font-semibold">Extension Boilerplate</h1>

      <LanguageSelect />
      <ThemeSelect />

      <Button onClick={handlePing}>{t("ping-background")}</Button>
      {pingResult && <p className="text-xs text-muted-foreground">{pingResult}</p>}

      <Button variant="secondary" onClick={handleGetTabInfo}>
        {t("get-active-tab-info")}
      </Button>
      {tabInfo && <p className="text-xs text-muted-foreground">{tabInfo}</p>}

      {!isFirefox && !isSafari && (
        <Button variant="outline" onClick={handleOpenSidePanel}>
          {t("open-sidepanel")}
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
