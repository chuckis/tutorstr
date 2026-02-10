tutorstr/
├─ README.md
├─ docs/
│  ├─ spec.md                # MVP spec (тот файл, что мы сделали)
│  ├─ nostr-kinds.md         # описание кастомных kinds (NIP-style)
│  └─ architecture.md
│
├─ frontend/
│  ├─ index.html
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ tsconfig.json
│  ├─ public/
│  │  └─ manifest.webmanifest
│  └─ src/
│     ├─ main.tsx
│     ├─ app.tsx
│     ├─ styles/
│     ├─ pages/
│     │  ├─ Home.tsx
│     │  ├─ TutorList.tsx
│     │  ├─ TutorProfile.tsx
│     │  ├─ Dashboard.tsx
│     │  └─ Login.tsx
│     ├─ components/
│     │  ├─ TutorCard.tsx
│     │  ├─ ScheduleView.tsx
│     │  └─ BookingForm.tsx
│     ├─ nostr/
│     │  ├─ client.ts        # pool, relays, filters
│     │  ├─ kinds.ts         # enum custom kinds
│     │  ├─ events.ts        # builders/parsers
│     │  └─ encryption.ts
│     ├─ state/
│     │  └─ session.ts
│     └─ pwa/
│        └─ sw.ts
│
├─ relay/
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ src/
│     ├─ index.ts            # WS server
│     ├─ config.ts
│     ├─ storage/
│     │  ├─ db.ts
│     │  └─ migrations.ts
│     ├─ handlers/
│     │  ├─ publish.ts
│     │  └─ subscribe.ts
│     ├─ indexer/
│     │  └─ tutorIndex.ts
│     └─ moderation/
│        └─ denylist.ts
│
└─ .github/
   ├─ ISSUE_TEMPLATE/
   │  ├─ feature.md
   │  └─ bug.md
   └─ workflows/
      └─ ci.yml
