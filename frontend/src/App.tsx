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

type TutorProfileEvent = {
  pubkey: string;
  created_at: number;
  profile: TutorProfile;
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

function normalizeProfile(input: Partial<TutorProfile> | null | undefined) {
  return {
    ...emptyProfile,
    ...input,
    subjects: Array.isArray(input?.subjects) ? input?.subjects : [],
    languages: Array.isArray(input?.languages) ? input?.languages : []
  };
}

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
  const [activeView, setActiveView] = useState<"directory" | "profile">(
    "directory"
  );
  const [tutors, setTutors] = useState<Record<string, TutorProfileEvent>>({});
  const [selectedTutor, setSelectedTutor] = useState<TutorProfileEvent | null>(
    null
  );
  const [subjectFilter, setSubjectFilter] = useState<string>("");

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
          const parsed = normalizeProfile(
            JSON.parse(event.content) as TutorProfile
          );
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

  useEffect(() => {
    const unsubscribe = nostrClient.subscribe(
      { kinds: [30000], limit: 200 },
      (event) => {
        try {
          const parsed = normalizeProfile(
            JSON.parse(event.content) as TutorProfile
          );
          setTutors((prev) => {
            const existing = prev[event.pubkey];
            if (existing && existing.created_at >= event.created_at) {
              return prev;
            }
            return {
              ...prev,
              [event.pubkey]: {
                pubkey: event.pubkey,
                created_at: event.created_at,
                profile: parsed
              }
            };
          });
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => unsubscribe();
  }, []);

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

  const filteredTutors = Object.values(tutors).filter((entry) => {
    if (!subjectFilter.trim()) {
      return true;
    }
    const term = subjectFilter.trim().toLowerCase();
    return entry.profile.subjects.some((subject) =>
      subject.toLowerCase().includes(term)
    );
  });

  return (
    <main className="app">
      <section className="card">
        <h1>Tutorstr</h1>
        <p className="muted">Tutor Hub MVP console.</p>

        <div className="tabs">
          <button
            type="button"
            className={activeView === "directory" ? "active" : ""}
            onClick={() => setActiveView("directory")}
          >
            Directory
          </button>
          <button
            type="button"
            className={activeView === "profile" ? "active" : ""}
            onClick={() => setActiveView("profile")}
          >
            My Profile
          </button>
        </div>

        <div className="identity">
          <span>npub</span>
          <strong>{keypair.npub}</strong>
        </div>

        {activeView === "directory" ? (
          <div className="directory">
            <label className="filter">
              Filter by subject
              <input
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                placeholder="calculus"
              />
            </label>

            {selectedTutor ? (
              <div className="profile-view">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setSelectedTutor(null)}
                >
                  Back to directory
                </button>
                <h2>{selectedTutor.profile.name || "Unnamed Tutor"}</h2>
                <p>{selectedTutor.profile.bio || "No bio provided yet."}</p>
                <div className="chips">
                  {selectedTutor.profile.subjects.map((subject) => (
                    <span key={subject}>{subject}</span>
                  ))}
                </div>
                <div className="meta">
                  <span>
                    Languages:{" "}
                    {selectedTutor.profile.languages.join(", ") || "—"}
                  </span>
                  <span>
                    Rate:{" "}
                    {selectedTutor.profile.hourlyRate
                      ? `$${selectedTutor.profile.hourlyRate}/hr`
                      : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="card-grid">
                {filteredTutors.length === 0 ? (
                  <p className="muted">No tutors found yet.</p>
                ) : (
                  filteredTutors.map((entry) => (
                    <button
                      key={entry.pubkey}
                      type="button"
                      className="tutor-card"
                      onClick={() => setSelectedTutor(entry)}
                    >
                      <h3>{entry.profile.name || "Unnamed Tutor"}</h3>
                      <p>{entry.profile.bio || "No bio provided."}</p>
                      <div className="chips">
                        {entry.profile.subjects.slice(0, 3).map((subject) => (
                          <span key={subject}>{subject}</span>
                        ))}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
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
        )}

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
