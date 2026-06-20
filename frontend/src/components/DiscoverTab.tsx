import {
  Booking,
  AccountRole,
  EncryptedMessage,
  UserProfile,
  SlotOccupancy,
  TimeSlot,
  TutorDirectoryQuery,
  makeSlotAllocationKey,
  makeSlotBidKey
} from "../hooks/hookTypes";
import { UserProfileEvent, TutorScheduleEvent } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { isProfileEmpty } from "../utils/normalize";
import { slotDurationMinutes } from "../utils/dateTimeLocal";
import { Avatar } from "./Avatar";
import { FilterBar } from "./FilterBar";
import { DetailPageLayout } from "./DetailPageLayout";
import { Spinner } from "./Spinner";
import { StudentDetailView } from "./StudentDetailView";
import { TutorCard } from "./TutorCard";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";
import { ReputationBadge } from "./ReputationBadge";
import { ReviewList } from "./ReviewList";
import { useReviewsForSubject } from "../hooks/useReviewsForSubject";
import { useState, useMemo } from "react";
import { BlogPostList } from "./blog/BlogPostList";
import { useTutorBlog } from "../hooks/useTutorBlog";
import { useSlotFilter } from "../hooks/useSlotFilter";

type DiscoverTabProps = {
  selectedTutor: UserProfileEvent | null;
  onSelectTutor: (entry: UserProfileEvent | null) => void;
  profile: UserProfile;
  directoryQuery: TutorDirectoryQuery;
  onDirectoryQueryChange: (next: TutorDirectoryQuery) => void;
  filteredTutors: UserProfileEvent[];
  schedules: Record<string, TutorScheduleEvent>;
  discoverStatus: string;
  onRequestPublishedSlot: (tutorPubkey: string, slot: TimeSlot) => void;
  messagesByThread: Record<string, EncryptedMessage[]>;
  onSendMessage: (recipientPubkey: string, text: string, threadKey?: string) => void;
  onSendMessageWithFiles: (
    recipientPubkey: string,
    text: string,
    files: File[],
    threadKey?: string
  ) => void | Promise<void>;
  messageStatus: string;
  studentPubkey: string;
  activeBidBySlotAndStudent: Record<string, Booking>;
  winnerByAllocationKey: Record<string, SlotOccupancy>;
  role: AccountRole;
  loading: boolean;
  mutedPubkeys: Set<string>;
  onBlockUser: (pubkey: string) => Promise<void>;
  onReportUser: (targetPubkey: string, reason: string, options?: { eventId?: string; label?: string }) => Promise<void>;
  onSelectBlogPost?: (data: { post: any; authorId: string }) => void;
};

export function DiscoverTab({
  selectedTutor,
  onSelectTutor,
  profile,
  directoryQuery,
  onDirectoryQueryChange,
  filteredTutors,
  schedules,
  discoverStatus,
  onRequestPublishedSlot,
  messagesByThread,
  onSendMessage,
  onSendMessageWithFiles,
  messageStatus,
  studentPubkey,
  activeBidBySlotAndStudent,
  winnerByAllocationKey,
  role,
  loading,
  onSelectBlogPost,
  mutedPubkeys,
  onBlockUser,
  onReportUser,
}: DiscoverTabProps) {
  const { t, formatDateTime, formatNumber } = useI18n();
  const isNewcomerProfile = isProfileEmpty(profile);
  const isStudent = role === "student";
  const visibleTutors = useMemo(
    () => filteredTutors.filter((t) => !mutedPubkeys.has(t.pubkey)),
    [filteredTutors, mutedPubkeys]
  );
  const selectedTutorPubkey = selectedTutor?.pubkey ?? "";
  const { reviews, reputation } = useReviewsForSubject(selectedTutorPubkey);

  // ── Hooks must be unconditional (NOT inside if (selectedTutor)) ──
  const occupiedKeys = useMemo(
    () => new Set(Object.keys(winnerByAllocationKey)),
    [winnerByAllocationKey]
  );
  const tutorSchedule = selectedTutor ? schedules[selectedTutor.pubkey]?.schedule : undefined;
  const { futureSlots } = useSlotFilter(
    tutorSchedule,
    selectedTutor?.pubkey ?? "",
    occupiedKeys
  );
  const displaySlots = useMemo(
    () => futureSlots.filter((s) => {
      const key = makeSlotAllocationKey(selectedTutor?.pubkey ?? "", s);
      const occ = winnerByAllocationKey[key];
      if (occ && occ.studentId === studentPubkey) return false;
      return true;
    }),
    [futureSlots, selectedTutor?.pubkey, winnerByAllocationKey, studentPubkey]
  );

  function getSlotState(tutorPubkey: string, slot: TimeSlot) {
    const slotBidKey = makeSlotBidKey(tutorPubkey, studentPubkey, slot);
    const activeBid = activeBidBySlotAndStudent[slotBidKey];
    if (activeBid && activeBid.status === "pending") {
      return "requested";
    }

    const slotAllocationKey = makeSlotAllocationKey(tutorPubkey, slot);
    if (winnerByAllocationKey[slotAllocationKey]) {
      return "unavailable";
    }

    return "available";
  }

  function getSlotActionLabel(slotState: "available" | "requested" | "unavailable") {
    if (slotState === "requested") {
      return t("discover.requested");
    }
    if (slotState === "unavailable") {
      return t("discover.unavailable");
    }
    return t("discover.requestSlot");
  }

  if (selectedTutor) {
    const isStudentView = selectedTutor.profile.role === "student";

    if (isStudentView) {
      return (
        <StudentDetailView
          profile={selectedTutor}
          viewerRole={role}
          onBack={() => window.history.back()}
          onSendMessage={onSendMessage}
          onSendMessageWithFiles={onSendMessageWithFiles}
          messagesByThread={messagesByThread}
          messageStatus={messageStatus}
        />
      );
    }

    return (
      <DetailPageLayout
        backLabel={t("discover.backToDiscover")}
        onBack={() => window.history.back()}
      >
        <article className="panel">
          <div className="tutor-profile-header">
            <Avatar url={selectedTutor.profile.avatarUrl} role={selectedTutor.profile.role ?? "tutor"} size="lg" />
            <div>
              <h2>
                {selectedTutor.profile.name || t("common.states.unnamedTutor")}
              </h2>
              <ReputationBadge reputation={reputation} />
              <p className="muted">
                {selectedTutor.profile.languages.join(", ") || t("common.states.notSet")}
              </p>
          </div>
          <div className="request-actions" style={{ marginTop: "0.5rem" }}>
            <Button variant="ghost" size="sm"
              onClick={() => onBlockUser(selectedTutor.pubkey)}
            >
              {t("moderation.block")}
            </Button>
            <Button variant="ghost" size="sm"
              onClick={() => onReportUser(selectedTutor.pubkey, "Spam")}
            >
              {t("moderation.reportUser")}
            </Button>
          </div>
            </div>
          <p>{selectedTutor.profile.bio || t("common.states.noBioYet")}</p>
          {selectedTutor.profile.subjects.length > 0 ? (
            <div className="chips">
              {selectedTutor.profile.subjects.map((subject) => (
                <span key={subject}>{subject}</span>
              ))}
            </div>
          ) : null}
          <p className="muted">
            {t("discover.rate")}:{" "}
            {selectedTutor.profile.hourlyRate
              ? t("discover.hourlyRate", {
                  count: formatNumber(selectedTutor.profile.hourlyRate)
                })
              : t("common.states.notSet")}
          </p>
          {(() => {
            const schedParts = [selectedTutor.profile.workHours, selectedTutor.profile.timezone].filter(Boolean);
            const schedInfo = schedParts.join(" \u00b7 ");
            return schedInfo ? <p className="tutor-card-schedule">{schedInfo}</p> : null;
          })()}
          <div className="stack">
            <h3>{t("discover.publishedSlots")}</h3>
            {(() => {
              return displaySlots.length > 0 ? (
                <ul className="slot-list">
                  {displaySlots.map((slot, index) => {
                    const slotState = getSlotState(
                      selectedTutor.pubkey,
                      slot
                    );

                    return (
                      <li key={`${slot.start}-${index}`}>
                        <div className="request-actions">
                          <span>
                            {formatDateTime(slot.start)} · {t("lessons.minutes", { count: slotDurationMinutes(slot.start, slot.end) })}
                          </span>
                          <Button variant="primary"
                            type="button"
                            disabled={
                              slotState !== "available" || !isStudent
                            }
                            onClick={() =>
                              onRequestPublishedSlot(selectedTutor.pubkey, slot)
                            }
                          >
                            {getSlotActionLabel(slotState)}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted">{t("discover.noSlots")}</p>
              );
            })()}
            {discoverStatus ? (
              <p className="muted">{discoverStatus}</p>
            ) : null}
          </div>
        </article>

        <article className="panel">
          <h3>{t("review.title")} ({reputation.reviewCount})</h3>
          <ReviewList reviews={reviews} />
        </article>

        <TutorBlogSection
          tutorId={selectedTutor.pubkey}
          onSelectPost={(post) => {
            if (onSelectBlogPost) {
              onSelectBlogPost({ post, authorId: selectedTutor.pubkey });
            }
          }}
        />

      </DetailPageLayout>
    );
  }

  return (
    <section className="tab-panel discover-tab">
      <div className="stack">
        {isNewcomerProfile ? (
          <article className="panel discover-empty-profile-callout">
            <h3>{t("discover.emptyProfileTitle")}</h3>
            <p className="muted">{t("discover.emptyProfileBody")}</p>
          </article>
        ) : null}

        <FilterBar
          query={directoryQuery}
          onChange={onDirectoryQueryChange}
        />

        {loading ? (
          <Spinner label={t("common.states.loading")} />
        ) : (
          <div className="card-grid">
            {visibleTutors.length === 0 ? (
              <EmptyState description={t("discover.noTutors")} />
            ) : (
              visibleTutors.map((entry) => (
                <TutorCard
                  key={entry.pubkey}
                  entry={entry}
                  onSelect={(next) => onSelectTutor(next)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}

type TutorBlogSectionProps = {
  tutorId: string;
  onSelectPost: (post: any) => void;
};

function TutorBlogSection({ tutorId, onSelectPost }: TutorBlogSectionProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { posts, loading } = useTutorBlog(tutorId);

  const publishedPosts = posts.filter((p) => p.status === "published");

  if (!open) {
    return (
      <article className="panel">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t("blog.title")} ({publishedPosts.length})
        </Button>
      </article>
    );
  }

  return (
    <article className="panel">
      <div className="stack">
        <div className="blog-section-header">
          <h3>{t("blog.title")}</h3>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t("common.buttons.cancel")}
          </Button>
        </div>
        <BlogPostList
          posts={publishedPosts}
          loading={loading}
          onSelectPost={onSelectPost}
        />
      </div>
    </article>
  );
}
