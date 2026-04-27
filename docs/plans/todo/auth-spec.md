# Nostr PWA Authentication Spec

Two onboarding flows covering all user types:

1. **"Create new profile"** — for newcomers (key generation inside the PWA).
2. **"I already have a key"** — for Nostr-savvy users (import existing `nsec`, hex, or seed phrase).

---

## 🔧 Common Technical Mechanics (both flows)

Once the user chooses a flow and the PWA obtains a private key (generated or imported):

1. **Derive public key (npub)** from the private key (via `nostr-tools` or `@noble/curves`).
2. **Encrypt the private key** using the Web Crypto API (AES-GCM). The encryption key can be derived:
   - from a passphrase entered by the user *(recommended)*,
   - or from a static key hardcoded in the app *(less secure, simpler)*.
   - **Recommendation:** let the user set a master password to decrypt the vault.
3. **Persist to `localStorage`:**
   - Encrypted private key (base64).
   - Public key (hex and/or npub).
   - Metadata (schema version, salt, etc.).
4. **On every signing action** (send message, like, post):
   - Retrieve the encrypted private key from `localStorage`.
   - Decrypt it (prompt for master password if required).
   - Sign the Nostr event.
   - **Do not persist the decrypted key** — keep it in memory only for the duration of signing.

> ⚠️ **CRITICAL: The PWA must never transmit the private key to any server. All key operations (generation, encryption, signing) happen exclusively on the client.**

---

## Flow 1 — "Create New Profile" (newcomers)

### Technical steps

1. **Generate key pair**
   Use `generatePrivateKey()` from `nostr-tools` (or raw `crypto.getRandomValues`):
   ```js
   import { generatePrivateKey, getPublicKey } from 'nostr-tools';
   const sk = generatePrivateKey(); // 64-char hex string
   const pk = getPublicKey(sk);    // 64-char hex public key
   ```

2. **Warn and display the secret**
   Show the user their `nsec` (encoded private key) via `nip19.nsecEncode(sk)`.
   Message: *"This is the only way to recover your account. Store it securely."*

3. **Confirm backup**
   Require a checkbox or re-entry of `nsec` before proceeding. Only then encrypt and store.

4. **Export option (optional)**
   In settings, allow the user to view their `nsec` again — gated behind master password or re-authentication.

### UI recommendations

| Screen | Elements |
|---|---|
| Welcome / flow selection | Large "Create New Profile" button with caption: *"Your secret key stays with you only."* |
| Key generation | Spinner / "Generating your key…" |
| Display nsec | Large `nsec1...` text field, "Copy" button. **Bold red warning: "Never share this. Don't lose it. We cannot recover it."** |
| Confirm backup | Checkbox: "I have saved my secret key in a safe place." "Continue" button activates only after check. |
| After login | Main PWA screen. Settings → "Show my secret key" (protected by re-entry of master password or biometrics). |

> ⚠️ **CRITICAL: The nsec display screen must not auto-dismiss or be skippable. The "Continue" button must remain disabled until the user explicitly confirms backup.**

---

## Flow 2 — "I Already Have a Key" (import)

### Technical steps

1. **Accept user input**
   Support three formats:
   - `nsec1...` (encoded private key) — parse via `nip19.decode()`.
   - 64-character hex string `[0-9a-f]` — raw private key.
   - BIP-39 seed phrase (12 or 24 words) — derive private key via `bip39` + `@scure/bip32` (or `nostr-tools` extension).

2. **Validate**
   Confirm that a valid public key can be derived from the input and that the result is a valid 64-char hex string.

3. **Clear the input field immediately**

   > ⚠️ **CRITICAL: Never log the entered value. Wipe it from memory as soon as validation succeeds. Do not include it in any error reports or analytics.**

4. **Encrypt and store**
   Same scheme as Flow 1: AES-GCM encrypt the private key, store in `localStorage`.

5. **Redirect to main screen**
   No extra confirmations needed (unless prompting for a master password).

### UI recommendations

| Screen | Elements |
|---|---|
| Flow selection | "Sign in with key" or "Import existing profile" button. |
| Import form | Text field (type `password` with show/hide toggle). Hint: *"Paste your nsec, hex key, or seed phrase."* |
| "Import" button | Enabled only when field is non-empty. Triggers validation on click. |
| Error | *"Invalid key format. Please try again."* |
| Success | Save key, redirect to home. Message: *"Welcome, [npub]!"* |
| Optional | Checkbox: "Encrypt vault with a master password" — if implemented, prompt for password + confirmation after key entry. |

---

## 🎨 Common UI: Initial Flow Selection Screen

Two large cards side by side:

```
┌─────────────────────────────────────┐
│           Welcome!                   │
│   Your data never leaves this app.   │
├─────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐  │
│  │ 🆕           │ │ 🔑           │  │
│  │ Create new   │ │ I already    │  │
│  │ profile      │ │ have a key   │  │
│  └──────────────┘ └──────────────┘  │
│                                     │
│       (link: "What is a key?")       │
└─────────────────────────────────────┘
```

After either flow → navigate to the main app. If `localStorage` already contains a key, show the main screen directly with an option to log out or switch accounts.

---

## 🧠 Additional Considerations

- **XSS protection:** enforce a strict `Content-Security-Policy`, don't load unvetted third-party scripts. `localStorage` is accessible to any script on the page — an encrypted key is far better than a plaintext one.

- **Master password for the vault *(strongly recommended)*:** on first key generation or import, ask the user to set a password used to encrypt the local vault. Even if an attacker gains access to `localStorage`, they cannot decrypt the key without the password.

  > ⚠️ **CRITICAL: If no master password is implemented, document the risk clearly. A stolen device or XSS attack gives direct access to the stored key.**

- **Logout / account switch:** "Log out" button wipes the key from `localStorage` and returns the user to the flow selection screen.

- **Key export:** Settings → show `nsec` (identity confirmation required, e.g. master password).

- **Read-only mode (out of scope for v1):** allow viewing public data by `npub` without signing — a possible third flow for later.

---

## 🚀 Summary

| Flow | Target user | Technical core | UI focus |
|---|---|---|---|
| Create new profile | Newcomer | Key generation via `crypto.getRandomValues`, show `nsec`, mandatory backup confirmation | Prominent warning, copy button, checkbox |
| I have a key | Experienced user | Parse `nsec` / hex / seed, validate, encrypt immediately | Clean input field, import button, inline validation |

Both flows require **no server**, work **offline** (except for relay-dependent actions), and give the user full control over their keys.