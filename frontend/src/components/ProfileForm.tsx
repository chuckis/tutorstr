import { useEffect, useState } from "react";
import { TutorProfile } from "../types/nostr";
import { useI18n } from "../i18n/I18nProvider";
import { parseList } from "../utils/normalize";

type ProfileFormProps = {
  profile: TutorProfile;
  onChange: (next: TutorProfile) => void;
  onSubmit: (next: TutorProfile) => void;
};

export function ProfileForm({ profile, onChange, onSubmit }: ProfileFormProps) {
  const { t } = useI18n();
  const [subjectsInput, setSubjectsInput] = useState(profile.subjects.join(", "));
  const [languagesInput, setLanguagesInput] = useState(profile.languages.join(", "));

  useEffect(() => {
    setSubjectsInput(profile.subjects.join(", "));
  }, [profile.subjects]);

  useEffect(() => {
    setLanguagesInput(profile.languages.join(", "));
  }, [profile.languages]);

  function commitListField(field: "subjects" | "languages", value: string) {
    onChange({
      ...profile,
      [field]: parseList(value)
    });
  }

  return (
    <form
      className="profile-form"
      onSubmit={(event) => {
        event.preventDefault();
        const nextProfile = {
          ...profile,
          subjects: parseList(subjectsInput),
          languages: parseList(languagesInput)
        };
        onChange(nextProfile);
        onSubmit(nextProfile);
      }}
    >
      <label>
        {t("profile.form.name")}
        <input
          value={profile.name}
          onChange={(event) =>
            onChange({ ...profile, name: event.target.value })
          }
          placeholder={t("profile.form.namePlaceholder")}
        />
      </label>

      <label>
        {t("profile.form.bio")}
        <textarea
          value={profile.bio}
          onChange={(event) =>
            onChange({ ...profile, bio: event.target.value })
          }
          rows={4}
          placeholder={t("profile.form.bioPlaceholder")}
        />
      </label>

      <label>
        {t("profile.form.subjects")}
        <input
          value={subjectsInput}
          onChange={(event) => {
            setSubjectsInput(event.target.value);
          }}
          onBlur={(event) => commitListField("subjects", event.target.value)}
          placeholder={t("profile.form.subjectsPlaceholder")}
        />
      </label>

      <label>
        {t("profile.form.languages")}
        <input
          value={languagesInput}
          onChange={(event) => {
            setLanguagesInput(event.target.value);
          }}
          onBlur={(event) => commitListField("languages", event.target.value)}
          placeholder={t("profile.form.languagesPlaceholder")}
        />
      </label>

      <label>
        {t("profile.form.hourlyRate")}
        <input
          type="number"
          min="0"
          value={profile.hourlyRate}
          onChange={(event) =>
            onChange({
              ...profile,
              hourlyRate: Number(event.target.value)
            })
          }
        />
      </label>

      <label>
        {t("profile.form.avatarUrl")}
        <input
          value={profile.avatarUrl}
          onChange={(event) =>
            onChange({ ...profile, avatarUrl: event.target.value })
          }
          placeholder={t("profile.form.avatarPlaceholder")}
        />
      </label>

      <button type="submit">{t("profile.form.publish")}</button>
    </form>
  );
}
