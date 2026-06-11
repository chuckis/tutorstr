import { useEffect, useState } from "react";
import { AccountRole, UserProfile, AvailabilityMode, AVAILABILITY_MODES } from "../hooks/hookTypes";
import { COMMON_TIMEZONES } from "../domain/profile";
import { useI18n } from "../i18n/I18nProvider";
import { parseList } from "../utils/normalize";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Select } from "./ui/Select";

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
      <Input
        label={t("profile.form.name")}
        value={profile.name}
        onChange={(event) =>
          onChange({ ...profile, name: event.target.value })
        }
        placeholder={t("profile.form.namePlaceholder")}
      />

      <Textarea
        label={t("profile.form.bio")}
        value={profile.bio}
        onChange={(event) =>
          onChange({ ...profile, bio: event.target.value })
        }
        rows={4}
        placeholder={t("profile.form.bioPlaceholder")}
      />

      {showTutorFields ? (
        <Input
          label={t("profile.form.subjects")}
          value={subjectsInput}
          onChange={(event) => {
            setSubjectsInput(event.target.value);
          }}
          onBlur={(event) => commitListField("subjects", event.target.value)}
          placeholder={t("profile.form.subjectsPlaceholder")}
        />
      ) : null}

      <Input
        label={t("profile.form.languages")}
        value={languagesInput}
        onChange={(event) => {
          setLanguagesInput(event.target.value);
        }}
        onBlur={(event) => commitListField("languages", event.target.value)}
        placeholder={t("profile.form.languagesPlaceholder")}
      />

      {showTutorFields ? (
        <Input
          label={t("profile.form.hourlyRate")}
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
      ) : null}

      {showTutorFields ? (
        <Select
          label={t("profile.form.availabilityMode")}
          value={profile.availabilityMode ?? ""}
          onChange={(event) =>
            onChange({
              ...profile,
              availabilityMode: (event.target.value || undefined) as AvailabilityMode | undefined
            })
          }
          placeholder={t("profile.form.notSpecified")}
          options={AVAILABILITY_MODES.map((mode) => ({
            value: mode,
            label: t(`profile.form.${mode}`)
          }))}
        />
      ) : null}

      {showTutorFields ? (
        <Select
          label={t("profile.form.timezone")}
          value={profile.timezone ?? ""}
          onChange={(event) =>
            onChange({
              ...profile,
              timezone: event.target.value || undefined
            })
          }
          placeholder={t("profile.form.timezonePlaceholder")}
          options={COMMON_TIMEZONES.map((tz) => ({
            value: tz,
            label: tz
          }))}
        />
      ) : null}

      {showTutorFields ? (
        <Input
          label={t("profile.form.workHours")}
          value={profile.workHours ?? ""}
          onChange={(event) =>
            onChange({
              ...profile,
              workHours: event.target.value || undefined
            })
          }
          placeholder={t("profile.form.workHoursPlaceholder")}
        />
      ) : null}

      <Input
        label={t("profile.form.avatarUrl")}
        value={profile.avatarUrl}
        onChange={(event) =>
          onChange({ ...profile, avatarUrl: event.target.value })
        }
        placeholder={t("profile.form.avatarPlaceholder")}
      />

      <Button variant="primary" type="submit">{t("profile.form.publish")}</Button>
    </form>
  );
}
