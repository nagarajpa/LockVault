import type {
  VaultData,
  VaultRegistry,
  Message,
  MessageResponse,
  VaultEntry,
} from "@shared/types";
import {
  initializeVault,
  unlockVault,
  saveEntry,
  deleteEntry,
  bulkAddEntries,
  syncVault,
  hasExistingVault,
  getEntriesForUrl,
  exportVault,
  createVaultDb,
  switchVault,
  renameVaultDb,
  deleteVaultDb,
  loadRegistry,
} from "@shared/vaultManager";
import {
  generatePassword,
  DEFAULT_OPTIONS,
} from "@shared/passwordGenerator";

const AUTO_LOCK_MINUTES = 15;
const ALARM_NAME = "lockvault-auto-lock";

let derivedKey: CryptoKey | null = null;
let currentVault: VaultData | null = null;
let currentRegistry: VaultRegistry | null = null;

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
  currentRegistry = null;
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
    return true;
  }
);

function activeVaultName(): string | null {
  if (!currentRegistry || !currentVault) return null;
  const meta = currentRegistry.vaults.find(
    (v) => v.id === currentVault!.vault_id
  );
  return meta?.name ?? null;
}

async function handleMessage(message: Message): Promise<MessageResponse> {
  try {
    switch (message.type) {
      case "GET_STATE": {
        const exists = await hasExistingVault();
        const registry = currentRegistry ?? (await loadRegistry());
        return {
          success: true,
          data: {
            isUnlocked: derivedKey !== null && currentVault !== null,
            isFirstTime: !exists,
            syncStatus: "synced",
            lastSynced: currentVault?.last_updated ?? null,
            activeVaultId: currentVault?.vault_id ?? null,
            activeVaultName: activeVaultName(),
            vaultList: registry?.vaults ?? [],
          },
        };
      }

      case "SETUP": {
        const { password } = message.payload as { password: string };
        const token = await getAccessToken();
        const { vault, key, registry } = await initializeVault(
          password,
          token
        );
        derivedKey = key;
        currentVault = vault;
        currentRegistry = registry;
        resetAutoLock();
        return {
          success: true,
          data: { vault, registry },
        };
      }

      case "UNLOCK": {
        const { password } = message.payload as { password: string };
        const { vault, key, registry } = await unlockVault(password);
        derivedKey = key;
        currentVault = vault;
        currentRegistry = registry;
        resetAutoLock();

        const token = await getAccessToken();
        if (token && derivedKey) {
          syncVault(vault, derivedKey, token)
            .then((result) => {
              currentVault = result.vault;
            })
            .catch(() => {});
        }

        return {
          success: true,
          data: { vault, registry },
        };
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
        return {
          success: true,
          data: { vault: currentVault, registry: currentRegistry },
        };
      }

      case "LIST_VAULTS": {
        const registry = currentRegistry ?? (await loadRegistry());
        return {
          success: true,
          data: { vaults: registry?.vaults ?? [] },
        };
      }

      case "CREATE_VAULT_DB": {
        if (!derivedKey || !currentRegistry || !currentVault) {
          return { success: false, error: "Vault is locked" };
        }
        const { name } = message.payload as { name: string };
        const token = await getAccessToken();
        const { vault, registry } = await createVaultDb(
          name,
          derivedKey,
          currentRegistry.salt,
          token
        );
        currentVault = vault;
        currentRegistry = registry;
        resetAutoLock();
        return { success: true, data: { vault, registry } };
      }

      case "SWITCH_VAULT": {
        if (!derivedKey || !currentVault || !currentRegistry) {
          return { success: false, error: "Vault is locked" };
        }
        const { vaultId } = message.payload as { vaultId: string };
        const token = await getAccessToken();
        const { vault, registry } = await switchVault(
          vaultId,
          currentVault,
          derivedKey,
          token
        );
        currentVault = vault;
        currentRegistry = registry;
        resetAutoLock();
        return { success: true, data: { vault, registry } };
      }

      case "RENAME_VAULT_DB": {
        const { vaultId, name } = message.payload as {
          vaultId: string;
          name: string;
        };
        const registry = await renameVaultDb(vaultId, name);
        currentRegistry = registry;
        return { success: true, data: { registry } };
      }

      case "DELETE_VAULT_DB": {
        if (!derivedKey || !currentVault || !currentRegistry) {
          return { success: false, error: "Vault is locked" };
        }
        const { vaultId: delId } = message.payload as { vaultId: string };
        const delToken = await getAccessToken();
        const delRegistry = await deleteVaultDb(delId, delToken);
        currentRegistry = delRegistry;

        if (currentVault.vault_id === delId) {
          const { vault: newVault, registry: switchedReg } = await switchVault(
            delRegistry.active_vault_id,
            currentVault,
            derivedKey,
            delToken
          );
          currentVault = newVault;
          currentRegistry = switchedReg;
        }
        return {
          success: true,
          data: { vault: currentVault, registry: currentRegistry },
        };
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
        const delEntryToken = await getAccessToken();
        currentVault = await deleteEntry(
          entryId,
          currentVault,
          derivedKey,
          delEntryToken
        );
        resetAutoLock();
        return { success: true, data: { vault: currentVault } };
      }

      case "BULK_IMPORT": {
        if (!currentVault || !derivedKey) {
          return { success: false, error: "Vault is locked" };
        }
        const entries = message.payload as VaultEntry[];
        const importToken = await getAccessToken();
        currentVault = await bulkAddEntries(
          entries,
          currentVault,
          derivedKey,
          importToken
        );
        resetAutoLock();
        return {
          success: true,
          data: { vault: currentVault, imported: entries.length },
        };
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
        return { success: false, error: "Unknown message type" };
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}
