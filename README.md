# LockVault

A zero-knowledge, cloud-synced password manager built as a Chrome Extension. Your passwords are encrypted locally with AES-256-GCM before being stored in a hidden Google Drive folder that only LockVault can access.

## Features

- **Zero-Knowledge Encryption** -- Your master password never leaves your device. All encryption and decryption happens locally using the Web Crypto API.
- **Google Drive Sync** -- Encrypted vault stored in Drive's hidden `appDataFolder`. No custom backend, no server costs.
- **Password Generator** -- CSPRNG-based generator with configurable length (8-128), character pools, and real-time entropy display.
- **Autofill** -- Detects password fields on any webpage and offers to fill credentials via a Shadow DOM dropdown.
- **Organized Vault** -- Categories (Work, Personal, Finance, Social), favorites, and instant search.

## Architecture

```
┌─────────────────────────────────────────┐
│              Chrome Extension            │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Popup   │  │ Content  │  │ Service│ │
│  │  (React) │  │ Scripts  │  │ Worker │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │            │      │
│       └──────────────┴────────────┘      │
│                      │                   │
│            chrome.runtime.sendMessage    │
│                      │                   │
│              ┌───────┴──────┐            │
│              │ Shared Core  │            │
│              │  - crypto.ts │            │
│              │  - driveApi  │            │
│              │  - vault mgr │            │
│              └───────┬──────┘            │
└──────────────────────┼───────────────────┘
                       │
            ┌──────────┴──────────┐
            │   Google Drive API   │
            │   (appDataFolder)    │
            └─────────────────────┘
```

## Security Model

| Layer | Implementation |
|-------|---------------|
| Key Derivation | PBKDF2 with 600,000 iterations (OWASP 2023 recommendation) |
| Encryption | AES-256-GCM with random 12-byte IV per operation |
| Storage | Encrypted blob in Google Drive's `appDataFolder` (app-only access) |
| Master Password | Never stored -- derived key lives only in service worker memory |
| Auto-Lock | CryptoKey wiped from memory after 15 minutes of inactivity |
| Autofill UI | Shadow DOM isolation prevents page CSS/JS interference |

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud project with the Drive API enabled

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/LockVault.git
   cd LockVault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create an OAuth 2.0 Client ID (type: Chrome Extension)
   - Copy the Client ID
   - Update `public/manifest.json` and replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

### Development

```bash
npm run dev
```

This starts Vite with hot module replacement via the CRXJS plugin. Changes to the popup UI update in real-time.

## Project Structure

```
src/
├── shared/                  # Platform-agnostic core modules
│   ├── crypto.ts            # PBKDF2 + AES-256-GCM via Web Crypto API
│   ├── driveApi.ts          # Google Drive REST API (appDataFolder)
│   ├── passwordGenerator.ts # CSPRNG generator + entropy calculation
│   ├── vaultManager.ts      # Vault lifecycle, sync, merge logic
│   └── types.ts             # TypeScript interfaces
├── popup/                   # React popup UI (Tailwind CSS)
│   ├── components/          # UnlockScreen, VaultList, Generator, etc.
│   └── hooks/               # useVault state management
├── background/              # Manifest V3 service worker
│   └── serviceWorker.ts     # OAuth, vault state, auto-lock, messaging
└── content/                 # Content scripts
    └── autofill.ts          # Password field detection + Shadow DOM fill UI
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| Build | Vite + @crxjs/vite-plugin |
| Extension | Chrome Manifest V3 |
| Encryption | Web Crypto API (native) |
| Storage | Google Drive API (appDataFolder) |

## License

MIT
