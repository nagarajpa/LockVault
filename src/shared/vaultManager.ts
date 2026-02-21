import { generateSalt, deriveKey, encryptData, decryptData } from "./crypto";
import {
  findVaultFileId,
  downloadVault,
  createVault,
  updateVault,
} from "./driveApi";
import type { VaultData, VaultEntry, EncryptedVault } from "./types";

const STORAGE_KEY = "lockvault_encrypted";
const FILE_ID_KEY = "lockvault_file_id";

function newVaultId(): string {
  return crypto.randomUUID();
}

export async function initializeVault(
  masterPassword: string,
  accessToken: string | null
): Promise<{ vault: VaultData; key: CryptoKey }> {
  const salt = generateSalt();
  const key = await deriveKey(masterPassword, salt);

  const vault: VaultData = {
    vault_id: newVaultId(),
    version: 1,
    last_updated: new Date().toISOString(),
    salt,
    entries: [],
  };

  const encrypted = await encryptVault(vault, key);
  await saveToLocal(encrypted);

  if (accessToken) {
    try {
      const fileId = await createVault(
        JSON.stringify(encrypted),
        accessToken
      );
      await chrome.storage.local.set({ [FILE_ID_KEY]: fileId });
    } catch {
      // Vault created locally; Drive sync will retry later
    }
  }

  return { vault, key };
}

export async function unlockVault(
  masterPassword: string
): Promise<{ vault: VaultData; key: CryptoKey }> {
  const stored = await getFromLocal();
  if (!stored) {
    throw new Error("No vault found. Please set up a new vault first.");
  }

  const key = await deriveKey(masterPassword, stored.salt);
  const json = await decryptData(stored.ciphertext, stored.iv, key);
  const vault: VaultData = JSON.parse(json);

  return { vault, key };
}

export async function saveEntry(
  entry: VaultEntry,
  vault: VaultData,
  key: CryptoKey,
  accessToken: string | null
): Promise<VaultData> {
  const existingIndex = vault.entries.findIndex((e) => e.id === entry.id);
  const updatedEntries = [...vault.entries];

  if (existingIndex >= 0) {
    updatedEntries[existingIndex] = {
      ...entry,
      updated_at: new Date().toISOString(),
    };
  } else {
    updatedEntries.push({
      ...entry,
      id: entry.id || newVaultId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const updatedVault: VaultData = {
    ...vault,
    entries: updatedEntries,
    version: vault.version + 1,
    last_updated: new Date().toISOString(),
  };

  await persistVault(updatedVault, key, accessToken);
  return updatedVault;
}

export async function deleteEntry(
  entryId: string,
  vault: VaultData,
  key: CryptoKey,
  accessToken: string | null
): Promise<VaultData> {
  const updatedVault: VaultData = {
    ...vault,
    entries: vault.entries.filter((e) => e.id !== entryId),
    version: vault.version + 1,
    last_updated: new Date().toISOString(),
  };

  await persistVault(updatedVault, key, accessToken);
  return updatedVault;
}

export async function syncVault(
  localVault: VaultData,
  key: CryptoKey,
  accessToken: string
): Promise<{ vault: VaultData; merged: boolean }> {
  const fileInfo = await findVaultFileId(accessToken);

  if (!fileInfo) {
    const encrypted = await encryptVault(localVault, key);
    const fileId = await createVault(JSON.stringify(encrypted), accessToken);
    await chrome.storage.local.set({ [FILE_ID_KEY]: fileId });
    return { vault: localVault, merged: false };
  }

  const cloudModified = new Date(fileInfo.modifiedTime).getTime();
  const localModified = new Date(localVault.last_updated).getTime();

  if (cloudModified <= localModified) {
    await pushToCloud(localVault, key, fileInfo.id, accessToken);
    return { vault: localVault, merged: false };
  }

  // Cloud is newer -- download and merge
  const cloudRaw = await downloadVault(fileInfo.id, accessToken);
  const cloudEncrypted: EncryptedVault = JSON.parse(cloudRaw);
  const cloudJson = await decryptData(
    cloudEncrypted.ciphertext,
    cloudEncrypted.iv,
    key
  );
  const cloudVault: VaultData = JSON.parse(cloudJson);

  const merged = shallowMerge(localVault, cloudVault);
  await persistVault(merged, key, accessToken);

  return { vault: merged, merged: true };
}

function shallowMerge(local: VaultData, cloud: VaultData): VaultData {
  const entryMap = new Map<string, VaultEntry>();

  for (const entry of cloud.entries) {
    entryMap.set(entry.id, entry);
  }

  for (const entry of local.entries) {
    const existing = entryMap.get(entry.id);
    if (
      !existing ||
      new Date(entry.updated_at) > new Date(existing.updated_at)
    ) {
      entryMap.set(entry.id, entry);
    }
  }

  return {
    vault_id: local.vault_id,
    version: Math.max(local.version, cloud.version) + 1,
    last_updated: new Date().toISOString(),
    salt: local.salt,
    entries: Array.from(entryMap.values()),
  };
}

async function encryptVault(
  vault: VaultData,
  key: CryptoKey
): Promise<EncryptedVault> {
  const json = JSON.stringify(vault);
  const { ciphertext, iv } = await encryptData(json, key);
  return {
    ciphertext,
    iv,
    salt: vault.salt,
    last_updated: vault.last_updated,
  };
}

async function persistVault(
  vault: VaultData,
  key: CryptoKey,
  accessToken: string | null
): Promise<void> {
  const encrypted = await encryptVault(vault, key);
  await saveToLocal(encrypted);

  if (accessToken) {
    const stored = await chrome.storage.local.get(FILE_ID_KEY);
    const fileId = stored[FILE_ID_KEY] as string | undefined;
    if (fileId) {
      await updateVault(fileId, JSON.stringify(encrypted), accessToken);
    } else {
      const newFileId = await createVault(
        JSON.stringify(encrypted),
        accessToken
      );
      await chrome.storage.local.set({ [FILE_ID_KEY]: newFileId });
    }
  }
}

async function pushToCloud(
  vault: VaultData,
  key: CryptoKey,
  fileId: string,
  accessToken: string
): Promise<void> {
  const encrypted = await encryptVault(vault, key);
  await updateVault(fileId, JSON.stringify(encrypted), accessToken);
}

async function saveToLocal(encrypted: EncryptedVault): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(encrypted) });
}

async function getFromLocal(): Promise<EncryptedVault | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] as string | undefined;
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function hasExistingVault(): Promise<boolean> {
  const local = await getFromLocal();
  return local !== null;
}

export async function getEntriesForUrl(
  vault: VaultData,
  hostname: string
): Promise<VaultEntry[]> {
  return vault.entries.filter((entry) => {
    try {
      const entryHost = new URL(entry.url).hostname;
      return (
        entryHost === hostname ||
        entryHost.endsWith(`.${hostname}`) ||
        hostname.endsWith(`.${entryHost}`)
      );
    } catch {
      return entry.url.includes(hostname);
    }
  });
}

export async function exportVault(
  vault: VaultData,
  key: CryptoKey
): Promise<string> {
  const encrypted = await encryptVault(vault, key);
  return JSON.stringify(encrypted, null, 2);
}
