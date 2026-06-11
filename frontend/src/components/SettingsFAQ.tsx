import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/Button";

const FAQ_IDS = [
  "dataStorage",
  "whatIsRelay",
  "privateKeySafety",
  "changeRole",
  "bookLesson",
  "privateKey",
] as const;

export function SettingsFAQ() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="settings-article">
      {FAQ_IDS.map((id, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={id} className="settings-faq-item">
            <Button variant="ghost"
              type="button"
              className="settings-faq-question"
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span>{t(`profile.faq.${id}_q`)}</span>
              <ChevronDown
                size={16}
                className={`settings-faq-chevron ${isOpen ? "open" : ""}`}
              />
            </Button>
            {isOpen ? (
              <p className="settings-faq-answer">{t(`profile.faq.${id}_a`)}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
