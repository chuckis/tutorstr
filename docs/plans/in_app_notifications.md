# In-App Notifications and NotificationService

## Цель

Улучшить информирование пользователя о важных событиях без использования серверных push-уведомлений.
Реализовать локальную систему уведомлений, работающую при открытом приложении.

## Требования

### 1. In-App уведомления

Система всплывающих уведомлений (toast notifications) при событиях:
- новая заявка на урок
- подтверждение урока
- отмена урока
- новое сообщение в чате
- изменение статуса бронирования

Поведение:
- отображаются поверх интерфейса
- автоматически исчезают через несколько секунд
- могут быть закрыты вручную
- поддерживают переход к связанному экрану по клику

### 2. Звуковые уведомления

Короткий звуковой сигнал при:
- новой заявке
- новом сообщении
- подтверждении урока

Требования:
- звук не воспроизводится повторно при повторной загрузке данных
- возможность централизованно отключить звук
- настройки для будущего переключателя "Sound Notifications"

### 3. NotificationService — абстракция

Ответственность:
- показ toast-уведомлений
- воспроизведение звука
- обработка переходов по уведомлению
- предотвращение дублирования уведомлений

### 4. Интеграция

Все уведомления вызываются через NotificationService.
Запрещено вызывать toast напрямую из компонентов или бизнес-логики.

## Архитектура

### Слои

| Слой | Файл | Назначение |
|------|------|------------|
| Ports | `ports/notificationService.ts` | Интерфейс `NotificationService` |
| Adapters | `adapters/notificationService.ts` | Класс `NotificationManager` |
| Hooks | `hooks/NotificationContext.tsx` | React Context + Provider |
| Components | `components/ui/ToastContainer.tsx` | Стек toast-уведомлений |
| Hooks | `hooks/useAppController.ts` | Интеграция точек уведомлений |
| App | `App.tsx` | `<NotificationProvider>` обёртка |

### Интерфейс порта

```typescript
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
```

### De-дупликация

`NotificationManager` хранит `Set<dedupKey>` с авто-очисткой через 10 секунд.
Ключ формируется как `type:message` или из `options.dedupKey`.

### Звук

Web Audio API: `OscillatorNode` — короткий сигнал 660Hz, 200ms.
Звук не блокирует UI, не требует аудиофайлов.

### Интеграционные точки

- **Новая заявка (tutor)**: `useAppController` — отслеживание `latestIncomingRequestTs`
- **Новое сообщение**: `useAppController` — отслеживание `messages.length`
- **Подтверждение/отклонение заявки**: `respondToRequestById` в `useAppController`
- **Изменение статуса бронирования**: `useAppController` — отслеживание `statusesList`
- **Изменение статуса урока**: после `changeLessonStatus`
