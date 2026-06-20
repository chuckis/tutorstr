# Review UI Fix — LessonAgreements prop type mismatch

**Status:** Fix applied

## Problem

`ReviewForm` в `LessonsTab` не показывается, потому что:

1. **App.tsx:342** передаёт `lessonAgreements={lessonsState.lessonAgreements.agreements}` — это `LessonAgreementEvent[]` (массив).  
   `LessonsTab` ожидает `Record<string, LessonAgreementEvent>` (объект, ключ — `lessonId`).  
   → `lessonAgreements[selectedLesson.id]` всегда `undefined`  
   → `showReviewForm` всегда `false`  
   → форма отзыва не рендерится.

2. **useReviewsForSubject.ts:12** вызывает `useLessons(subjectPubkey)`, что создаёт второй инстанс хука с cross-relay эффектом для пустого/чужого pubkey — лишние подписки и запросы.

## Fix

### 1. App.tsx — agreements → agreementMap

```diff
- lessonAgreements={lessonsState.lessonAgreements.agreements}
+ lessonAgreements={lessonsState.lessonAgreements.agreementMap}
```

`agreementMap` — это `lessonStore.byId` (`Record<string, LessonAgreementEvent>`), ключи совпадают с `lessonId`.

### 2. useReviewsForSubject — заменить useLessons на прямой селектор

```diff
- import { useLessons } from "./useLessons";
+ import { useLessonStore } from "../stores/lessonStore";
...
- const { lessons } = useLessons(subjectPubkey);
+ const completedLessonsCount = useLessonStore((s) =>
+   Object.values(s.byId).filter(
+     (a) => a.tutorPubkey === subjectPubkey && a.agreement.status === "completed"
+   ).length
+ );
```

Без вызова `useLessons` — без cross-relay эффектов, без лишних сабскрипшенов.
