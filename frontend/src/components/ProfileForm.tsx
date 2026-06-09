import { useEffect, useState } from "react";
import { AccountRole, UserProfile, AvailabilityMode, AVAILABILITY_MODES } from "../hooks/hookTypes";
import { COMMON_TIMEZONES } from "../domain/profile";
import { useI18n } from "../i18n/I18nProvider";
import { parseList } from "../utils/normalize";

type ProfileFormMode = "tutor" | "student";

type ProfileFormProps = {
  profile: UserProfile;
  onChange: (next: UserProfile) => void;
  onSubmit: (next: UserProfile) => void;
  role: AccountRole;
  mode?: ProfileFormMode;
};

function profileFormMode(role: AccountRole): ProfileFormMode {
  return role === "student" ? "student" : "tutor";
}

export function ProfileForm({
  profile,
  onChange,
  onSubmit,
  role,
  mode
}: ProfileFormProps) {
  const { t } = useI18n();
  const resolvedMode = mode ?? profileFormMode(role);
  const showTutorFields = resolvedMode === "tutor";
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

      {showTutorFields ? (
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
      ) : null}

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

      {showTutorFields ? (
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
      ) : null}

      {showTutorFields ? (
        <label>
          {t("profile.form.availabilityMode")}
          <select
            value={profile.availabilityMode ?? ""}
            onChange={(event) =>
              onChange({
                ...profile,
                availabilityMode: (event.target.value || undefined) as AvailabilityMode | undefined
              })
            }
          >
            <option value="">{t("profile.form.notSpecified")}</option>
            {AVAILABILITY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`profile.form.${mode}`)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showTutorFields ? (
        <label>
          {t("profile.form.timezone")}
          <select
            value={profile.timezone ?? ""}
            onChange={(event) =>
              onChange({
                ...profile,
                timezone: event.target.value || undefined
              })
            }
          >
            <option value="">{t("profile.form.timezonePlaceholder")}</option>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showTutorFields ? (
        <label>
          {t("profile.form.workHours")}
          <input
            value={profile.workHours ?? ""}
            onChange={(event) =>
              onChange({
                ...profile,
                workHours: event.target.value || undefined
              })
            }
            placeholder={t("profile.form.workHoursPlaceholder")}
          />
        </label>
      ) : null}

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
