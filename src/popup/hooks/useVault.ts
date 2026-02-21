import { useState, useEffect, useCallback } from "react";
import type {
  VaultData,
  VaultEntry,
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
  });
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    const res = await sendMessage<AppState>("GET_STATE");
    if (res.success && res.data) {
      setAppState(res.data);
      if (res.data.isUnlocked) {
        const vaultRes = await sendMessage<{ vault: VaultData }>("GET_VAULT");
        if (vaultRes.success && vaultRes.data) {
          setVault(vaultRes.data.vault);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const setup = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    const res = await sendMessage<{ vault: VaultData }>("SETUP", { password });
    if (res.success && res.data) {
      setVault(res.data.vault);
      setAppState((s) => ({ ...s, isUnlocked: true, isFirstTime: false }));
    } else {
      setError(res.error ?? "Setup failed");
    }
    setLoading(false);
  }, []);

  const unlock = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    const res = await sendMessage<{ vault: VaultData }>("UNLOCK", { password });
    if (res.success && res.data) {
      setVault(res.data.vault);
      setAppState((s) => ({ ...s, isUnlocked: true }));
    } else {
      setError(res.error ?? "Unlock failed");
    }
    setLoading(false);
  }, []);

  const lock = useCallback(async () => {
    await sendMessage("LOCK");
    setVault(null);
    setAppState((s) => ({ ...s, isUnlocked: false }));
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
  };
}
