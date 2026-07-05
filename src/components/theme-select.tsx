import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/i18n";
import { isFirefox, isSafari } from "@/lib/utils";
import { useTheme } from "./theme-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function ThemeSelect() {
  const { setTheme, theme } = useTheme();

  const onChange = (value: "dark" | "light" | "system") => {
    setTheme(value);
    toast.success(t("theme-changed", { theme: value }));
  };

  // if firefox or safari, show a regular select because of some weird bug with the custom select where it doesn't update the value on open
  return isFirefox || isSafari ? (
    <select
      className="rounded-md border border-input bg-popover px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      onChange={(e) => onChange(e.target.value as any)}
      value={theme}
    >
      <option value="light">{t("theme.light")}</option>
      <option value="dark">{t("theme.dark")}</option>
      <option value="system">{t("theme.system")}</option>
    </select>
  ) : (
    <div className="border-b border-border/60 last:border-0">
      <Select value={theme} onValueChange={onChange}>
        <SelectTrigger className="w-full justify-between">
          <SelectValue placeholder={t("select-theme")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">
            <Sun className="mr-2 h-4 w-4" />
            {t("theme.light")}
          </SelectItem>
          <SelectItem value="dark">
            <Moon className="mr-2 h-4 w-4" />
            {t("theme.dark")}
          </SelectItem>
          <SelectItem value="system">
            <Monitor className="mr-2 h-4 w-4" />
            {t("theme.system")}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
