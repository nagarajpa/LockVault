import type { VaultData, Message, MessageResponse, VaultEntry } from "@shared/types";
import {
  initializeVault,
  unlockVault,
  saveEntry,
  deleteEntry,
  syncVault,
  hasExistingVault,
  getEntriesForUrl,
  exportVault,
} from "@shared/vaultManager";
import {
  generatePassword,
  DEFAULT_OPTIONS,
} from "@shared/passwordGenerator";

const AUTO_LOCK_MINUTES = 15;
const ALARM_NAME = "lockvault-auto-lock";

let derivedKey: CryptoKey | null = null;
let currentVault: VaultData | null = null;

async function getAccessToken(): Promise<string | null> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: false });
    return result?.token ?? null;
  } catch {
    return null;
  }
}

async function getAccessTokenInteractive(): Promise<string> {
  const result = await chrome.identity.getAuthToken({ interactive: true });
  if (!result?.token) {
    throw new Error("Authentication failed");
  }
  return result.token;
}

function lock() {
  derivedKey = null;
  currentVault = null;
  chrome.alarms.clear(ALARM_NAME);
}

function resetAutoLock() {
  chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: AUTO_LOCK_MINUTES });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    lock();
  }
});

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // keep the message channel open for async response
  }
);

async function handleMessage(message: Message): Promise<MessageResponse> {
  try {
    switch (message.type) {
      case "GET_STATE": {
        const exists = await hasExistingVault();
        return {
          success: true,
          data: {
            isUnlocked: derivedKey !== null && currentVault !== null,
            isFirstTime: !exists,
            syncStatus: "synced",
            lastSynced: currentVault?.last_updated ?? null,
          },
        };
      }

      case "SETUP": {
        const { password } = message.payload as { password: string };
        let token: string | null = null;
        try {
          token = await getAccessTokenInteractive();
        } catch {
          // Offline setup is fine
        }
        const { vault, key } = await initializeVault(password, token);
        derivedKey = key;
        currentVault = vault;
        resetAutoLock();
        return { success: true, data: { vault } };
      }

      case "UNLOCK": {
        const { password } = message.payload as { password: string };
        const { vault, key } = await unlockVault(password);
        derivedKey = key;
        currentVault = vault;
        resetAutoLock();

        // Background sync after unlock
        const token = await getAccessToken();
        if (token && derivedKey) {
          syncVault(vault, derivedKey, token).then((result) => {
            currentVault = result.vault;
          }).catch(() => {});
        }

        return { success: true, data: { vault } };
      }

      case "LOCK": {
        lock();
        return { success: true };
      }

      case "GET_VAULT": {
        if (!currentVault || !derivedKey) {
          return { success: false, error: "Vault is locked" };
        }
        resetAutoLock();
        return { success: true, data: { vault: currentVault } };
      }

      case "SAVE_ENTRY": {
        if (!currentVault || !derivedKey) {
          return { success: false, error: "Vault is locked" };
        }
        const entry = message.payload as VaultEntry;
        const token = await getAccessToken();
        currentVault = await saveEntry(
          entry,
          currentVault,
          derivedKey,
          token
        );
        resetAutoLock();
        return { success: true, data: { vault: currentVault } };
      }

      case "DELETE_ENTRY": {
        if (!currentVault || !derivedKey) {
          return { success: false, error: "Vault is locked" };
        }
        const { entryId } = message.payload as { entryId: string };
        const delToken = await getAccessToken();
        currentVault = await deleteEntry(
          entryId,
          currentVault,
          derivedKey,
          delToken
        );
        resetAutoLock();
        return { success: true, data: { vault: currentVault } };
      }

      case "GENERATE_PASSWORD": {
        const options = message.payload ?? DEFAULT_OPTIONS;
        const password = generatePassword(
          options as typeof DEFAULT_OPTIONS
        );
        return { success: true, data: { password } };
      }

      case "GET_ENTRIES_FOR_URL": {
        if (!currentVault || !derivedKey) {
          return { success: false, error: "Vault is locked" };
        }
        const { hostname } = message.payload as { hostname: string };
        const entries = await getEntriesForUrl(currentVault, hostname);
        resetAutoLock();
        return { success: true, data: { entries } };
      }

      case "SYNC_VAULT": {
        if (!currentVault || !derivedKey) {
          return { success: false, error: "Vault is locked" };
        }
        const syncToken = await getAccessTokenInteractive();
        const result = await syncVault(
          currentVault,
          derivedKey,
          syncToken
        );
        currentVault = result.vault;
        return {
          success: true,
          data: { vault: currentVault, merged: result.merged },
        };
      }

      case "EXPORT_VAULT": {
        if (!currentVault || !derivedKey) {
          return { success: false, error: "Vault is locked" };
        }
        const exported = await exportVault(currentVault, derivedKey);
        return { success: true, data: { exported } };
      }

      default:
        return { success: false, error: `Unknown message type` };
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}
