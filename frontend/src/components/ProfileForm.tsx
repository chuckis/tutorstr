import { TutorProfile } from "../types/nostr";
import { parseList } from "../utils/normalize";

type ProfileFormProps = {
  profile: TutorProfile;
  onChange: (next: TutorProfile) => void;
  onSubmit: () => void;
};

export function ProfileForm({ profile, onChange, onSubmit }: ProfileFormProps) {
  return (
    <form
      className="profile-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label>
        Name
        <input
          value={profile.name}
          onChange={(event) =>
            onChange({ ...profile, name: event.target.value })
          }
          placeholder="Ada Lovelace"
        />
      </label>

      <label>
        Bio
        <textarea
          value={profile.bio}
          onChange={(event) =>
            onChange({ ...profile, bio: event.target.value })
          }
          rows={4}
          placeholder="I help students master math and CS fundamentals."
        />
      </label>

      <label>
        Subjects (comma-separated)
        <input
          value={profile.subjects.join(", ")}
          onChange={(event) =>
            onChange({
              ...profile,
              subjects: parseList(event.target.value)
            })
          }
          placeholder="algebra, calculus, data structures"
        />
      </label>

      <label>
        Languages (comma-separated)
        <input
          value={profile.languages.join(", ")}
          onChange={(event) =>
            onChange({
              ...profile,
              languages: parseList(event.target.value)
            })
          }
          placeholder="English, Spanish"
        />
      </label>

      <label>
        Hourly rate (USD)
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
        Avatar URL
        <input
          value={profile.avatarUrl}
          onChange={(event) =>
            onChange({ ...profile, avatarUrl: event.target.value })
          }
          placeholder="https://example.com/avatar.png"
        />
      </label>

      <button type="submit">Publish Profile</button>
    </form>
  );
}
