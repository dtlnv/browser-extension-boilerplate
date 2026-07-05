import { useState } from "react";
import { LanguageSelect } from "@/components/language-select";
import { ThemeSelect } from "@/components/theme-select";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { sendMessage } from "@/lib/messaging";

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

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
