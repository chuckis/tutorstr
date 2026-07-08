# AIHomeworkPanel — UI-слой

**Статус:** реализовано. AI-бот (`ai-assistant/`) уже работает — принимает ДЗ, шлёт в OpenRouter, возвращает NEED_FIX или автоматически эскалирует репетитору.

## Как это работает

1. **Студент** отправляет ДЗ через `Composer` → `sendHomeworkMessage` → kind 4 DM с тегом `lesson:{lessonId}`
2. **Бот** получает, шлёт в LLM, отвечает в тот же тред:
   - `NEED_FIX` — JSON `{type:"review_result", status:"NEED_FIX", feedback, suggestions}` → студенту
   - `APPROVED` — JSON `{type:"escalation", status:"APPROVED_BY_AI", ...}` → репетитору (авто-эскалация)
3. **Фронт** парсит ответы бота: если JSON с `type: "review_result"` → `VerdictBubble`, иначе → `MessageBubble`
4. **TypingIndicator** — таймаут 12с после отправки, снимается при получении ответа от бота

## Что построено

```
features/ai-assistant/
  types.ts                         // + MessageAuthor
  components/
    AIHomeworkPanel.tsx             // контейнер: isAwaiting, парсинг сообщений
    ChatThread.tsx                  // рендер: MessageBubble | VerdictBubble
    MessageBubble.tsx               // текстовые сообщения (student/assistant)
    AttachmentBubble.tsx            // attachment-сообщения
    VerdictBubble.tsx               // JSON-вердикты: NEED_FIX / APPROVED
    TypingIndicator.tsx             // пульсирующие точки
    Composer.tsx                    // input + attachment + send
    AttachmentPreviewChip.tsx       // превью файла
    QuickChipsRow.tsx               // быстрые чипсы
    ServiceUnavailableState.tsx     // AI недоступен
    AIAssistantBadge.tsx            // существующий
```

## Пропсы AIHomeworkPanel

```ts
type AIHomeworkPanelProps = {
  lessonId: string;
  messages: EncryptedMessage[];
  assistantPubkey: string | null;
  tutorPubkey: string;
  studentPubkey: string;
  isServiceAvailable: boolean;
  onSendHomework: (text: string, attachment?: File) => Promise<void>;
  onOpenTutorChat: () => void;
  viewerRole: AccountRole;
};
```

## Conditional rendering (LessonsTab.tsx)

```tsx
const aiStore = useAIAssistantStore();

{aiStore.isEnabled ? (
  <AIHomeworkPanel
    messages={messagesByThread[threadInfo.threadKey] || []}
    assistantPubkey={aiStore.assistantPubkey}
    isServiceAvailable={aiStore.isAvailable && !!aiStore.assistantPubkey}
    onSendHomework={(text, file) =>
      onSendHomework(aiStore.assistantPubkey!, text, selectedLesson.tutorId, threadInfo.threadKey)
    }
    onOpenTutorChat={() => /* scroll to chat */ }
    viewerRole={viewerRole}
    ...
  />
) : null}
```

## Парсинг вердиктов

`ChatThread.parseVerdict(content)`:
- Пробует `JSON.parse`
- Если `{type:"review_result", status:"NEED_FIX"}` → `VerdictBubble` с issues/suggestions
- Иначе → `MessageBubble` (plain text)

## Design tokens

| Элемент | Стиль |
|---|---|
| Баббл бота | `#f2f2f2`, `radius 16px` |
| Баббл студента | `#141414`, текст белый |
| Verdict NEED_FIX | `#b5790a` текст, `#fbf1de` фон |
| Verdict APPROVED | `#1e8e5a` текст, `#e7f5ee` фон |
| Typing indicator | 3 точки, opacity пульсация 1.2s |

## Приёмочные критерии

- [x] Модуль скрыт если `isEnabled === false`
- [x] При недоступности — `ServiceUnavailableState` с переходом в чат
- [x] Сообщения рендерятся из `props.messages`, не из `useState`
- [x] JSON-вердикты от бота парсятся и рендерятся как `VerdictBubble`
- [x] `isAwaitingAssistant` — таймаут 12с, снимается при ответе бота
- [x] Состояние не пропадает при переключении вкладок (источник — стор)
- [x] `Composer` задизейблен пока `isAwaitingAssistant === true`
