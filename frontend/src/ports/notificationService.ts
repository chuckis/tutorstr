export type NotificationType = "success" | "error" | "info" | "warning";

export type NotificationAction = {
  label: string;
  onClick: () => void;
};

export type NotificationOptions = {
  duration?: number;
  action?: NotificationAction;
  sound?: boolean;
  dedupKey?: string;
};

export interface NotificationService {
  notify(message: string, type?: NotificationType, options?: NotificationOptions): void;
  success(message: string, options?: NotificationOptions): void;
  warning(message: string, options?: NotificationOptions): void;
  error(message: string, options?: NotificationOptions): void;
  info(message: string, options?: NotificationOptions): void;
  playSound(): void;
  setSoundEnabled(enabled: boolean): void;
  isSoundEnabled(): boolean;
}
