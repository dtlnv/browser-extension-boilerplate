import { toast } from "sonner";
import { availableLanguages, changeLanguage, getCurrentLanguage, t } from "@/i18n";
import { isFirefox, isSafari } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function LanguageSelect() {
  const handleLanguageChange = async (locale: string) => {
    await changeLanguage(locale as any);
    toast.success(<span>{t("language-changed", { language: locale })}</span>);
  };

  return isFirefox || isSafari ? (
    <select
      className="rounded-md border border-input bg-popover px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      onChange={(e) => handleLanguageChange(e.target.value)}
      defaultValue={getCurrentLanguage()}
    >
      {Object.entries(availableLanguages)
        .sort(([_, nameA], [__, nameB]) => nameA.localeCompare(nameB))
        .map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
    </select>
  ) : (
    <div className="border-b border-border/60 last:border-0">
      <Select onValueChange={handleLanguageChange} defaultValue={getCurrentLanguage()}>
        <SelectTrigger className="w-full justify-between">
          <SelectValue placeholder={t("select-language")} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(availableLanguages)
            .sort(([_, nameA], [__, nameB]) => nameA.localeCompare(nameB))
            .map(([code, name]) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
