import { useState } from "react";
import type { VaultEntry } from "@shared/types";
import { useVault } from "./hooks/useVault";
import UnlockScreen from "./components/UnlockScreen";
import VaultList from "./components/VaultList";
import AddEditCredential from "./components/AddEditCredential";
import PasswordGenerator from "./components/PasswordGenerator";
import Settings from "./components/Settings";

type Screen = "vault" | "generator" | "settings";

export default function App() {
  const {
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
    syncVault,
    exportVault,
  } = useVault();

  const [screen, setScreen] = useState<Screen>("vault");
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const [showAddEdit, setShowAddEdit] = useState(false);

  if (!appState.isUnlocked) {
    return (
      <UnlockScreen
        isFirstTime={appState.isFirstTime}
        loading={loading}
        error={error}
        onUnlock={unlock}
        onSetup={setup}
      />
    );
  }

  if (showAddEdit || editingEntry) {
    return (
      <AddEditCredential
        entry={editingEntry}
        onSave={(entry) => {
          saveEntry(entry);
          setEditingEntry(null);
          setShowAddEdit(false);
        }}
        onCancel={() => {
          setEditingEntry(null);
          setShowAddEdit(false);
        }}
      />
    );
  }

  const handleExport = async () => {
    try {
      const data = await exportVault();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lockvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed");
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {screen === "vault" && vault && (
          <VaultList
            vault={vault}
            onEdit={(entry) => setEditingEntry(entry)}
            onDelete={deleteEntry}
            onSave={saveEntry}
            onAdd={() => setShowAddEdit(true)}
          />
        )}
        {screen === "generator" && <PasswordGenerator />}
        {screen === "settings" && (
          <Settings
            syncStatus={appState.syncStatus}
            lastSynced={appState.lastSynced}
            onSync={syncVault}
            onExport={handleExport}
            onLock={lock}
          />
        )}
      </div>

      {/* Bottom nav */}
      <nav className="shrink-0 border-t border-navy-700 bg-navy-900 px-6 py-2">
        <div className="flex justify-around">
          {[
            {
              id: "vault" as const,
              label: "Vault",
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              ),
            },
            {
              id: "generator" as const,
              label: "Generator",
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                />
              ),
            },
            {
              id: "settings" as const,
              label: "Settings",
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
              ),
            },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setScreen(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                screen === id
                  ? "text-teal-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={screen === id ? 2.5 : 2}
              >
                {icon}
              </svg>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
