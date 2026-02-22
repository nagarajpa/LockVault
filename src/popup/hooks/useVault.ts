import { useState, useEffect, useCallback } from "react";
import type {
  VaultData,
  VaultEntry,
  VaultRegistry,
  AppState,
  MessageResponse,
  PasswordGeneratorOptions,
} from "@shared/types";

function sendMessage<T = unknown>(
  type: string,
  payload?: unknown
): Promise<MessageResponse<T>> {
  return chrome.runtime.sendMessage({ type, payload });
}

export function useVault() {
  const [appState, setAppState] = useState<AppState>({
    isUnlocked: false,
    isFirstTime: false,
    syncStatus: "synced",
    lastSynced: null,
    activeVaultId: null,
    activeVaultName: null,
    vaultList: [],
  });
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRegistry = useCallback((registry: VaultRegistry, v?: VaultData | null) => {
    const activeVault = v ?? vault;
    const activeMeta = registry.vaults.find(
      (m) => m.id === (activeVault?.vault_id ?? registry.active_vault_id)
    );
    setAppState((s) => ({
      ...s,
      activeVaultId: registry.active_vault_id,
      activeVaultName: activeMeta?.name ?? null,
      vaultList: registry.vaults,
    }));
  }, [vault]);

  const refreshState = useCallback(async () => {
    const res = await sendMessage<AppState>("GET_STATE");
    if (res.success && res.data) {
      setAppState(res.data);
      if (res.data.isUnlocked) {
        const vaultRes = await sendMessage<{
          vault: VaultData;
          registry: VaultRegistry;
        }>("GET_VAULT");
        if (vaultRes.success && vaultRes.data) {
          setVault(vaultRes.data.vault);
          if (vaultRes.data.registry) {
            applyRegistry(vaultRes.data.registry, vaultRes.data.vault);
          }
        }
      }
    }
    setLoading(false);
  }, [applyRegistry]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const setup = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    const res = await sendMessage<{
      vault: VaultData;
      registry: VaultRegistry;
    }>("SETUP", { password });
    if (res.success && res.data) {
      setVault(res.data.vault);
      setAppState((s) => ({ ...s, isUnlocked: true, isFirstTime: false }));
      if (res.data.registry) applyRegistry(res.data.registry, res.data.vault);
    } else {
      setError(res.error ?? "Setup failed");
    }
    setLoading(false);
  }, [applyRegistry]);

  const unlock = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    const res = await sendMessage<{
      vault: VaultData;
      registry: VaultRegistry;
    }>("UNLOCK", { password });
    if (res.success && res.data) {
      setVault(res.data.vault);
      setAppState((s) => ({ ...s, isUnlocked: true }));
      if (res.data.registry) applyRegistry(res.data.registry, res.data.vault);
    } else {
      setError(res.error ?? "Unlock failed");
    }
    setLoading(false);
  }, [applyRegistry]);

  const lock = useCallback(async () => {
    await sendMessage("LOCK");
    setVault(null);
    setAppState((s) => ({
      ...s,
      isUnlocked: false,
      activeVaultId: null,
      activeVaultName: null,
      vaultList: [],
    }));
  }, []);

  const saveEntry = useCallback(async (entry: VaultEntry) => {
    setError(null);
    const res = await sendMessage<{ vault: VaultData }>("SAVE_ENTRY", entry);
    if (res.success && res.data) {
      setVault(res.data.vault);
    } else {
      setError(res.error ?? "Save failed");
    }
  }, []);

  const deleteEntry = useCallback(async (entryId: string) => {
    setError(null);
    const res = await sendMessage<{ vault: VaultData }>("DELETE_ENTRY", {
      entryId,
    });
    if (res.success && res.data) {
      setVault(res.data.vault);
    } else {
      setError(res.error ?? "Delete failed");
    }
  }, []);

  const generatePassword = useCallback(
    async (options: PasswordGeneratorOptions) => {
      const res = await sendMessage<{ password: string }>(
        "GENERATE_PASSWORD",
        options
      );
      if (res.success && res.data) {
        return res.data.password;
      }
      throw new Error(res.error ?? "Generation failed");
    },
    []
  );

  const syncVault = useCallback(async () => {
    setAppState((s) => ({ ...s, syncStatus: "syncing" }));
    const res = await sendMessage<{ vault: VaultData }>("SYNC_VAULT");
    if (res.success && res.data) {
      setVault(res.data.vault);
      setAppState((s) => ({
        ...s,
        syncStatus: "synced",
        lastSynced: new Date().toISOString(),
      }));
    } else {
      setAppState((s) => ({ ...s, syncStatus: "error" }));
      setError(res.error ?? "Sync failed");
    }
  }, []);

  const exportVault = useCallback(async () => {
    const res = await sendMessage<{ exported: string }>("EXPORT_VAULT");
    if (res.success && res.data) {
      return res.data.exported;
    }
    throw new Error(res.error ?? "Export failed");
  }, []);

  const bulkImport = useCallback(async (entries: VaultEntry[]) => {
    setLoading(true);
    setError(null);
    const res = await sendMessage<{ vault: VaultData; imported: number }>(
      "BULK_IMPORT",
      entries
    );
    if (res.success && res.data) {
      setVault(res.data.vault);
      setLoading(false);
      return res.data.imported;
    }
    setError(res.error ?? "Import failed");
    setLoading(false);
    return 0;
  }, []);

  const createVaultDatabase = useCallback(
    async (name: string) => {
      setLoading(true);
      setError(null);
      const res = await sendMessage<{
        vault: VaultData;
        registry: VaultRegistry;
      }>("CREATE_VAULT_DB", { name });
      if (res.success && res.data) {
        setVault(res.data.vault);
        applyRegistry(res.data.registry, res.data.vault);
      } else {
        setError(res.error ?? "Failed to create vault");
      }
      setLoading(false);
    },
    [applyRegistry]
  );

  const switchVaultDb = useCallback(
    async (vaultId: string) => {
      setLoading(true);
      setError(null);
      const res = await sendMessage<{
        vault: VaultData;
        registry: VaultRegistry;
      }>("SWITCH_VAULT", { vaultId });
      if (res.success && res.data) {
        setVault(res.data.vault);
        applyRegistry(res.data.registry, res.data.vault);
      } else {
        setError(res.error ?? "Failed to switch vault");
      }
      setLoading(false);
    },
    [applyRegistry]
  );

  const renameVaultDb = useCallback(
    async (vaultId: string, name: string) => {
      setError(null);
      const res = await sendMessage<{ registry: VaultRegistry }>(
        "RENAME_VAULT_DB",
        { vaultId, name }
      );
      if (res.success && res.data) {
        applyRegistry(res.data.registry);
      } else {
        setError(res.error ?? "Failed to rename vault");
      }
    },
    [applyRegistry]
  );

  const deleteVaultDb = useCallback(
    async (vaultId: string) => {
      setError(null);
      const res = await sendMessage<{
        vault: VaultData;
        registry: VaultRegistry;
      }>("DELETE_VAULT_DB", { vaultId });
      if (res.success && res.data) {
        setVault(res.data.vault);
        applyRegistry(res.data.registry, res.data.vault);
      } else {
        setError(res.error ?? "Failed to delete vault");
      }
    },
    [applyRegistry]
  );

  return {
    appState,
    vault,
    loading,
    error,
    setError,
    setup,
    unlock,
    lock,
    saveEntry,
    deleteEntry,
    generatePassword,
    syncVault,
    exportVault,
    bulkImport,
    createVaultDatabase,
    switchVaultDb,
    renameVaultDb,
    deleteVaultDb,
  };
}
