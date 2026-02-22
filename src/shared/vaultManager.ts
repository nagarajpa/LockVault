import { generateSalt, deriveKey, encryptData, decryptData } from "./crypto";
import {
  findVaultFileId,
  downloadVault,
  createVaultFile,
  updateVault,
  deleteVaultFile,
  vaultFileName,
} from "./driveApi";
import type {
  VaultData,
  VaultEntry,
  EncryptedVault,
  VaultRegistry,
  VaultMeta,
} from "./types";

const REGISTRY_KEY = "lockvault_registry";
const LEGACY_STORAGE_KEY = "lockvault_encrypted";
const LEGACY_FILE_ID_KEY = "lockvault_file_id";

function storageKey(vaultId: string): string {
  return `lockvault_enc_${vaultId}`;
}

function fileIdKey(vaultId: string): string {
  return `lockvault_fid_${vaultId}`;
}

function newId(): string {
  return crypto.randomUUID();
}

// --- Registry operations ---

export async function loadRegistry(): Promise<VaultRegistry | null> {
  const result = await chrome.storage.local.get(REGISTRY_KEY);
  const raw = result[REGISTRY_KEY] as string | undefined;
  if (!raw) return null;
  return JSON.parse(raw);
}

async function saveRegistry(registry: VaultRegistry): Promise<void> {
  await chrome.storage.local.set({
    [REGISTRY_KEY]: JSON.stringify(registry),
  });
}

async function migrateFromLegacy(): Promise<VaultRegistry | null> {
  const result = await chrome.storage.local.get(LEGACY_STORAGE_KEY);
  const raw = result[LEGACY_STORAGE_KEY] as string | undefined;
  if (!raw) return null;

  const encrypted: EncryptedVault = JSON.parse(raw);
  const vaultId = newId();
  const now = new Date().toISOString();

  await chrome.storage.local.set({ [storageKey(vaultId)]: raw });

  const legacyFid = await chrome.storage.local.get(LEGACY_FILE_ID_KEY);
  if (legacyFid[LEGACY_FILE_ID_KEY]) {
    await chrome.storage.local.set({
      [fileIdKey(vaultId)]: legacyFid[LEGACY_FILE_ID_KEY],
    });
  }

  const registry: VaultRegistry = {
    active_vault_id: vaultId,
    salt: encrypted.salt,
    vaults: [
      { id: vaultId, name: "My Vault", created_at: now, last_opened: now },
    ],
  };

  await saveRegistry(registry);

  await chrome.storage.local.remove([LEGACY_STORAGE_KEY, LEGACY_FILE_ID_KEY]);

  return registry;
}

export async function getOrCreateRegistry(): Promise<VaultRegistry | null> {
  let registry = await loadRegistry();
  if (registry) return registry;

  registry = await migrateFromLegacy();
  return registry;
}

// --- Vault lifecycle ---

export async function initializeVault(
  masterPassword: string,
  accessToken: string | null
): Promise<{ vault: VaultData; key: CryptoKey; registry: VaultRegistry }> {
  const salt = generateSalt();
  const key = await deriveKey(masterPassword, salt);
  const vaultId = newId();
  const now = new Date().toISOString();

  const vault: VaultData = {
    vault_id: vaultId,
    version: 1,
    last_updated: now,
    salt,
    entries: [],
  };

  const encrypted = await encryptVault(vault, key);
  await saveToLocal(vaultId, encrypted);

  if (accessToken) {
    try {
      const driveFileId = await createVaultFile(
        JSON.stringify(encrypted),
        vaultFileName(vaultId),
        accessToken
      );
      await chrome.storage.local.set({ [fileIdKey(vaultId)]: driveFileId });
    } catch {
      // Local-only for now
    }
  }

  const registry: VaultRegistry = {
    active_vault_id: vaultId,
    salt,
    vaults: [
      { id: vaultId, name: "My Vault", created_at: now, last_opened: now },
    ],
  };
  await saveRegistry(registry);

  return { vault, key, registry };
}

export async function unlockVault(
  masterPassword: string,
  vaultId?: string
): Promise<{
  vault: VaultData;
  key: CryptoKey;
  registry: VaultRegistry;
}> {
  let registry = await getOrCreateRegistry();
  if (!registry) {
    throw new Error("No vault found. Please set up a new vault first.");
  }

  const targetId = vaultId ?? registry.active_vault_id;
  const stored = await getFromLocal(targetId);
  if (!stored) {
    throw new Error("Vault data not found locally.");
  }

  const key = await deriveKey(masterPassword, stored.salt);
  const json = await decryptData(stored.ciphertext, stored.iv, key);
  const vault: VaultData = JSON.parse(json);

  registry = {
    ...registry,
    active_vault_id: targetId,
    vaults: registry.vaults.map((v) =>
      v.id === targetId
        ? { ...v, last_opened: new Date().toISOString() }
        : v
    ),
  };
  await saveRegistry(registry);

  return { vault, key, registry };
}

export async function createVaultDb(
  name: string,
  key: CryptoKey,
  salt: string,
  accessToken: string | null
): Promise<{ vault: VaultData; registry: VaultRegistry }> {
  const registry = await loadRegistry();
  if (!registry) throw new Error("No registry found");

  const vaultId = newId();
  const now = new Date().toISOString();

  const vault: VaultData = {
    vault_id: vaultId,
    version: 1,
    last_updated: now,
    salt,
    entries: [],
  };

  const encrypted = await encryptVault(vault, key);
  await saveToLocal(vaultId, encrypted);

  if (accessToken) {
    try {
      const driveFileId = await createVaultFile(
        JSON.stringify(encrypted),
        vaultFileName(vaultId),
        accessToken
      );
      await chrome.storage.local.set({ [fileIdKey(vaultId)]: driveFileId });
    } catch {
      // Local-only
    }
  }

  const meta: VaultMeta = {
    id: vaultId,
    name,
    created_at: now,
    last_opened: now,
  };

  const updatedRegistry: VaultRegistry = {
    ...registry,
    active_vault_id: vaultId,
    vaults: [...registry.vaults, meta],
  };
  await saveRegistry(updatedRegistry);

  return { vault, registry: updatedRegistry };
}

export async function switchVault(
  vaultId: string,
  currentVault: VaultData,
  key: CryptoKey,
  accessToken: string | null
): Promise<{ vault: VaultData; registry: VaultRegistry }> {
  await persistVault(currentVault, key, accessToken, currentVault.vault_id);

  const stored = await getFromLocal(vaultId);
  if (!stored) {
    throw new Error("Target vault not found locally.");
  }

  const json = await decryptData(stored.ciphertext, stored.iv, key);
  const vault: VaultData = JSON.parse(json);

  const registry = await loadRegistry();
  if (!registry) throw new Error("No registry found");

  const now = new Date().toISOString();
  const updatedRegistry: VaultRegistry = {
    ...registry,
    active_vault_id: vaultId,
    vaults: registry.vaults.map((v) =>
      v.id === vaultId ? { ...v, last_opened: now } : v
    ),
  };
  await saveRegistry(updatedRegistry);

  return { vault, registry: updatedRegistry };
}

export async function renameVaultDb(
  vaultId: string,
  newName: string
): Promise<VaultRegistry> {
  const registry = await loadRegistry();
  if (!registry) throw new Error("No registry found");

  const updatedRegistry: VaultRegistry = {
    ...registry,
    vaults: registry.vaults.map((v) =>
      v.id === vaultId ? { ...v, name: newName } : v
    ),
  };
  await saveRegistry(updatedRegistry);
  return updatedRegistry;
}

export async function deleteVaultDb(
  vaultId: string,
  accessToken: string | null
): Promise<VaultRegistry> {
  const registry = await loadRegistry();
  if (!registry) throw new Error("No registry found");
  if (registry.vaults.length <= 1) {
    throw new Error("Cannot delete the last vault.");
  }

  await chrome.storage.local.remove(storageKey(vaultId));

  const fidResult = await chrome.storage.local.get(fileIdKey(vaultId));
  const fid = fidResult[fileIdKey(vaultId)] as string | undefined;
  if (fid && accessToken) {
    try {
      await deleteVaultFile(fid, accessToken);
    } catch {
      // Drive cleanup is best-effort
    }
  }
  await chrome.storage.local.remove(fileIdKey(vaultId));

  const remaining = registry.vaults.filter((v) => v.id !== vaultId);
  const newActive =
    registry.active_vault_id === vaultId
      ? remaining[0].id
      : registry.active_vault_id;

  const updatedRegistry: VaultRegistry = {
    ...registry,
    active_vault_id: newActive,
    vaults: remaining,
  };
  await saveRegistry(updatedRegistry);
  return updatedRegistry;
}

// --- Entry operations ---

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
      id: entry.id || newId(),
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

  await persistVault(updatedVault, key, accessToken, vault.vault_id);
  return updatedVault;
}

export async function bulkAddEntries(
  entries: VaultEntry[],
  vault: VaultData,
  key: CryptoKey,
  accessToken: string | null
): Promise<VaultData> {
  const now = new Date().toISOString();
  const entryMap = new Map(vault.entries.map((e) => [e.id, e]));

  for (const entry of entries) {
    const id = entry.id || newId();
    entryMap.set(id, {
      ...entry,
      id,
      created_at: entry.created_at || now,
      updated_at: now,
    });
  }

  const updatedVault: VaultData = {
    ...vault,
    entries: Array.from(entryMap.values()),
    version: vault.version + 1,
    last_updated: now,
  };

  await persistVault(updatedVault, key, accessToken, vault.vault_id);
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

  await persistVault(updatedVault, key, accessToken, vault.vault_id);
  return updatedVault;
}

// --- Sync ---

export async function syncVault(
  localVault: VaultData,
  key: CryptoKey,
  accessToken: string
): Promise<{ vault: VaultData; merged: boolean }> {
  const filename = vaultFileName(localVault.vault_id);
  const fileInfo = await findVaultFileId(accessToken, filename);

  if (!fileInfo) {
    const encrypted = await encryptVault(localVault, key);
    const driveFileId = await createVaultFile(
      JSON.stringify(encrypted),
      filename,
      accessToken
    );
    await chrome.storage.local.set({
      [fileIdKey(localVault.vault_id)]: driveFileId,
    });
    return { vault: localVault, merged: false };
  }

  const cloudModified = new Date(fileInfo.modifiedTime).getTime();
  const localModified = new Date(localVault.last_updated).getTime();

  if (cloudModified <= localModified) {
    await pushToCloud(localVault, key, fileInfo.id, accessToken);
    return { vault: localVault, merged: false };
  }

  const cloudRaw = await downloadVault(fileInfo.id, accessToken);
  const cloudEncrypted: EncryptedVault = JSON.parse(cloudRaw);
  const cloudJson = await decryptData(
    cloudEncrypted.ciphertext,
    cloudEncrypted.iv,
    key
  );
  const cloudVault: VaultData = JSON.parse(cloudJson);
  const merged = shallowMerge(localVault, cloudVault);
  await persistVault(merged, key, accessToken, merged.vault_id);

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

// --- Internal helpers ---

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
  accessToken: string | null,
  vaultId: string
): Promise<void> {
  const encrypted = await encryptVault(vault, key);
  await saveToLocal(vaultId, encrypted);

  if (accessToken) {
    const stored = await chrome.storage.local.get(fileIdKey(vaultId));
    const fid = stored[fileIdKey(vaultId)] as string | undefined;
    if (fid) {
      await updateVault(fid, JSON.stringify(encrypted), accessToken);
    } else {
      const newFid = await createVaultFile(
        JSON.stringify(encrypted),
        vaultFileName(vaultId),
        accessToken
      );
      await chrome.storage.local.set({ [fileIdKey(vaultId)]: newFid });
    }
  }
}

async function pushToCloud(
  vault: VaultData,
  key: CryptoKey,
  driveFileId: string,
  accessToken: string
): Promise<void> {
  const encrypted = await encryptVault(vault, key);
  await updateVault(driveFileId, JSON.stringify(encrypted), accessToken);
}

async function saveToLocal(
  vaultId: string,
  encrypted: EncryptedVault
): Promise<void> {
  await chrome.storage.local.set({
    [storageKey(vaultId)]: JSON.stringify(encrypted),
  });
}

async function getFromLocal(vaultId: string): Promise<EncryptedVault | null> {
  const result = await chrome.storage.local.get(storageKey(vaultId));
  const raw = result[storageKey(vaultId)] as string | undefined;
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function hasExistingVault(): Promise<boolean> {
  const registry = await getOrCreateRegistry();
  return registry !== null;
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
