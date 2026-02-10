import { useEffect, useMemo, useState } from "react";
import { nostrClient } from "./nostr/client";
import "./App.css";

type TutorProfile = {
  name: string;
  bio: string;
  subjects: string[];
  languages: string[];
  hourlyRate: number;
  avatarUrl: string;
};

const PROFILE_STORAGE = "tutorhub:profile";

const emptyProfile: TutorProfile = {
  name: "",
  bio: "",
  subjects: [],
  languages: [],
  hourlyRate: 0,
  avatarUrl: ""
};

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function App() {
  const [profile, setProfile] = useState<TutorProfile>(emptyProfile);
  const [status, setStatus] = useState<string>("");
  const [lastEventId, setLastEventId] = useState<string>("");

  const keypair = useMemo(() => nostrClient.getOrCreateKeypair(), []);

  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_STORAGE);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TutorProfile;
        setProfile(parsed);
      } catch {
        // ignore invalid cache
      }
    }

    const unsubscribe = nostrClient.subscribe(
      { kinds: [30000], authors: [keypair.pubkey], limit: 1 },
      (event) => {
        try {
          const parsed = JSON.parse(event.content) as TutorProfile;
          setProfile(parsed);
          localStorage.setItem(PROFILE_STORAGE, JSON.stringify(parsed));
          setLastEventId(event.id);
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => unsubscribe();
  }, [keypair.pubkey]);

  async function handlePublish(event: React.FormEvent) {
    event.preventDefault();
    setStatus("Publishing...");

    const tags: string[][] = [
      ["t", "role:tutor"],
      ...profile.subjects.map((subject) => ["t", `subject:${subject}`]),
      ...profile.languages.map((language) => ["t", `language:${language}`])
    ];

    try {
      const published = await nostrClient.publishReplaceableEvent(
        30000,
        JSON.stringify(profile),
        tags
      );
      localStorage.setItem(PROFILE_STORAGE, JSON.stringify(profile));
      setLastEventId(published.id);
      setStatus("Profile published.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to publish profile."
      );
    }
  }

  return (
    <main className="app">
      <section className="card">
        <h1>Tutorstr</h1>
        <p className="muted">Tutor profile publishing (kind 30000).</p>

        <div className="identity">
          <span>npub</span>
          <strong>{keypair.npub}</strong>
        </div>

        <form className="profile-form" onSubmit={handlePublish}>
          <label>
            Name
            <input
              value={profile.name}
              onChange={(event) =>
                setProfile({ ...profile, name: event.target.value })
              }
              placeholder="Ada Lovelace"
            />
          </label>

          <label>
            Bio
            <textarea
              value={profile.bio}
              onChange={(event) =>
                setProfile({ ...profile, bio: event.target.value })
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
                setProfile({
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
                setProfile({
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
                setProfile({
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
                setProfile({ ...profile, avatarUrl: event.target.value })
              }
              placeholder="https://example.com/avatar.png"
            />
          </label>

          <button type="submit">Publish Profile</button>
        </form>

        <div className="status">
          <span>{status}</span>
          {lastEventId ? (
            <span className="muted">Last event: {lastEventId}</span>
          ) : null}
        </div>
      </section>
    </main>
  );
}
