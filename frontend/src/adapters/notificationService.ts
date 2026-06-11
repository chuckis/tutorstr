import { NotificationService, NotificationType, NotificationOptions, NotificationAction } from "../ports/notificationService";

export type ToastEntry = {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
  action?: NotificationAction;
};

export class NotificationManager implements NotificationService {
  private _soundEnabled = true;
  private shownKeys = new Set<string>();
  private dedupCleanupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private showToast: (entry: Omit<ToastEntry, "id">) => string,
  ) {}

  notify(message: string, type: NotificationType = "info", options?: NotificationOptions): void {
    const dedupKey = options?.dedupKey ?? `${type}:${message}`;
    if (this.shownKeys.has(dedupKey)) return;

    this.shownKeys.add(dedupKey);

    if (this.dedupCleanupTimer === null) {
      this.dedupCleanupTimer = setTimeout(() => {
        this.shownKeys.clear();
        this.dedupCleanupTimer = null;
      }, 10_000);
    }

    this.showToast({
      message,
      type,
      duration: options?.duration ?? 4000,
      action: options?.action,
    });

    if (options?.sound !== false) {
      this.playSound();
    }
  }

  success(message: string, options?: NotificationOptions): void {
    this.notify(message, "success", options);
  }

  warning(message: string, options?: NotificationOptions): void {
    this.notify(message, "warning", options);
  }

  error(message: string, options?: NotificationOptions): void {
    this.notify(message, "error", options);
  }

  info(message: string, options?: NotificationOptions): void {
    this.notify(message, "info", options);
  }

  playSound(): void {
    if (!this._soundEnabled) return;

    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio not available — silent fallback
    }
  }

  setSoundEnabled(enabled: boolean): void {
    this._soundEnabled = enabled;
  }

  isSoundEnabled(): boolean {
    return this._soundEnabled;
  }
}
