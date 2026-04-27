## 1. Goal

Enable **multi-language support** in Tutor Hub with:

* scalable architecture (no rewrite later)
* minimal friction for adding new languages
* correct handling of:

  * UI text
  * dynamic content (slots, profiles)
  * dates/timezones
  * pluralization

---

## 2. Scope

### Must be localized:

* UI (buttons, labels, forms)
* onboarding / profile / scheduling
* notifications (Nostr events → UI)
* validation errors
* empty states

### Optional (phase 2):

* tutor-generated content (bios, lessons)
* SEO / metadata
* emails / push notifications

---

## 3. Architecture Overview

Localization = **2 layers**

### 3.1 Internationalization (i18n) — code layer

* language detection
* translation loading
* formatting (dates, numbers)

### 3.2 Localization (l10n) — content layer

* translations
* cultural adaptation

👉 Important:
Localization is NOT string replacement — it's part of architecture ([i18n-best-practices][1])

---

## 4. Tech Stack Decision

### Recommended:

* `i18next` (frontend)
* JSON resource files
* Intl API for formatting

---

## 5. File Structure

```
/public/locales/
  en/
    common.json
    profile.json
    schedule.json
  uk/
    common.json
    profile.json
    schedule.json
```

### Rules:

* split by **feature namespace**
* NOT one giant file (scales poorly)

---

## 6. Translation Keys Convention

### Format:

```
feature.component.element
```

### Examples:

```
profile.form.name.label
profile.form.name.placeholder
schedule.slot.book.button
schedule.slot.book.success
```

### Anti-pattern:

❌ `"Save"`
✅ `"common.button.save"`

---

## 7. Usage Pattern (Code)

### DO:

```ts
t('profile.form.name.label')
```

### DO (with variables):

```ts
t('schedule.slot.available', { count })
```

### DO NOT:

```ts
"Hello " + userName
```

Use placeholders instead ([i18n-best-practices][1])

---

## 8. Pluralization

Must support plural rules:

```json
{
  "slot": {
    "one": "{{count}} slot available",
    "other": "{{count}} slots available"
  }
}
```

👉 Many languages have >2 forms → MUST use ICU-style pluralization ([Better i18n][2])

---

## 9. Locale Detection

Priority order:

1. User preference (stored)
2. Browser language
3. Default (`en`)

---

## 10. Language Switching

### Requirements:

* dropdown selector
* show names in native language:

  * English
  * Українська
* persist choice (localStorage / profile)

### URL strategy:

```
/en/profile
/uk/profile
```

---

## 11. Formatting (CRITICAL)

### NEVER format manually

Use Intl:

```ts
new Intl.DateTimeFormat(locale)
new Intl.NumberFormat(locale)
```

👉 Dates and numbers differ per locale ([i18n-best-practices][1])

---

## 12. Dynamic Content (Tutor Hub specific)

### Problem:

Nostr content is NOT localized

### Strategy:

#### Option A (MVP):

* show original language
* mark with language tag

#### Option B (advanced):

* auto-translate via AI
* store translation cache

---

## 13. RTL Support (future)

Prepare for:

* Arabic
* Hebrew

### Requirements:

* CSS logical props (`margin-inline-start`)
* no hardcoded left/right

👉 RTL must be designed early ([Better i18n][3])

---

## 14. UI Constraints

### MUST:

* flexible widths
* no fixed button sizes

Reason:

* German text = +30–40% longer ([Better i18n][4])

---

## 15. Workflow (IMPORTANT)

Treat localization as pipeline:

```
Dev → String extraction → Translation → Review → Integration → Testing
```

([GitScrum Docs][5])

---

## 16. Rules for Developers (Codex MUST enforce)

### 🔴 Forbidden:

* hardcoded strings
* string concatenation
* manual plural logic

### 🟢 Required:

* all text via `t()`
* keys exist in all locales
* fallback configured

---

## 17. Testing

### Must include:

* pseudo-localization:

  ```
  Héllöö Wørłd
  ```
* missing key detection
* switching language runtime

---

## 18. Performance

### Strategy:

* lazy-load locale files
* load only current namespace

---

## 19. Migration Plan (for existing code)

1. scan for strings
2. extract → keys
3. replace with `t()`
4. create base `en.json`
5. add `uk.json`

---

## 20. MVP Languages

Start with:

* English (source)
* Ukrainian

Later:

* Polish
* Spanish

---

## 21. Example

### JSON

```json
{
  "profile": {
    "title": "Tutor Profile",
    "save": "Save"
  }
}
```

### Code

```ts
<h1>{t('profile.title')}</h1>
<button>{t('profile.save')}</button>
```

---

## 22. Acceptance Criteria

* language switch works without reload
* no hardcoded UI text remains
* all screens render correctly in `uk`
* pluralization works
* dates formatted per locale

---

## 23. Future Extensions

* AI-assisted translation pipeline
* crowd translation (tutors contribute)
* per-user language preference in Nostr profile
