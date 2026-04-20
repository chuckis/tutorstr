import { ProfileForm } from "./ProfileForm";
import { ScheduleForm } from "./ScheduleForm";
import { TutorProfile, TutorSchedule } from "../types/nostr";

type ProfileTabProps = {
  npub: string;
  pubkey: string;
  profile: TutorProfile;
  onProfileChange: (profile: TutorProfile) => void;
  onPublishProfile: () => void;
  schedule: TutorSchedule;
  onScheduleChange: (schedule: TutorSchedule) => void;
  onPublishSchedule: () => void;
  relayInput: string;
  onRelayInputChange: (value: string) => void;
  relayStatus: string;
  onUpdateRelays: () => void;
  onLogout: () => void;
  scheduleStatus: string;
  profileStatus: string;
  lastEventId?: string;
};

export function ProfileTab({
  npub,
  pubkey,
  profile,
  onProfileChange,
  onPublishProfile,
  schedule,
  onScheduleChange,
  onPublishSchedule,
  relayInput,
  onRelayInputChange,
  relayStatus,
  onUpdateRelays,
  onLogout,
  scheduleStatus,
  profileStatus,
  lastEventId
}: ProfileTabProps) {
  return (
    <section className="tab-panel profile-tab">
      <article className="panel">
        <h3>Identity</h3>
        <p className="muted">npub</p>
        <p className="identity-value">{npub}</p>
        <p className="muted">pubkey (hex)</p>
        <p className="identity-value">{pubkey}</p>
      </article>

      <ProfileForm
        profile={profile}
        onChange={onProfileChange}
        onSubmit={onPublishProfile}
      />
      <ScheduleForm
        schedule={schedule}
        onChange={onScheduleChange}
        onSubmit={onPublishSchedule}
      />

      <article className="panel">
        <h3>Relay configuration</h3>
        <label className="filter">
          Relays (comma-separated)
          <textarea
            rows={3}
            value={relayInput}
            onChange={(event) => onRelayInputChange(event.target.value)}
          />
        </label>
        <button type="button" onClick={onUpdateRelays}>
          Save relays
        </button>
        {relayStatus ? <p className="muted">{relayStatus}</p> : null}
      </article>

      <article className="panel">
        <h3>Session</h3>
        <button type="button" className="ghost-action" onClick={onLogout}>
          Logout
        </button>
      </article>

      <div className="status">
        <span>{scheduleStatus || profileStatus}</span>
        {lastEventId ? <span className="muted">Last event: {lastEventId}</span> : null}
      </div>
    </section>
  );
}
