import { useState, useRef } from "react";
import type { SyncStatus } from "@shared/types";
import { importFromCsv } from "@shared/csvImporter";

interface Props {
  syncStatus: SyncStatus;
  lastSynced: string | null;
  onSync: () => void;
  onExport: () => void;
  onLock: () => void;
  onImport: (entries: import("@shared/types").VaultEntry[]) => Promise<number>;
}

export default function Settings({
  syncStatus,
  lastSynced,
  onSync,
  onExport,
  onLock,
  onImport,
}: Props) {
  const [importResult, setImportResult] = useState<{
    count: number;
    source: string;
    skipped: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncLabel = {
    synced: "Synced",
    syncing: "Syncing...",
    offline: "Offline",
    conflict: "Conflict",
    error: "Sync Error",
  }[syncStatus];

  const syncColor = {
    synced: "text-green-400",
    syncing: "text-amber-400",
    offline: "text-slate-400",
    conflict: "text-red-400",
    error: "text-red-400",
  }[syncStatus];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const { entries, source, skipped } = importFromCsv(text);

      if (entries.length === 0) {
        setImportResult({ count: 0, source, skipped });
        setImporting(false);
        return;
      }

      const imported = await onImport(entries);
      setImportResult({ count: imported, source, skipped });
    } catch {
      setImportResult({ count: 0, source: "unknown", skipped: 0 });
    }
    setImporting(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sourceLabel: Record<string, string> = {
    chrome: "Chrome",
    firefox: "Firefox",
    lastpass: "LastPass",
    bitwarden: "Bitwarden",
    onepassword: "1Password",
    keepass: "KeePass",
    unknown: "Unknown",
  };

  return (
    <div className="flex flex-col h-full px-4 py-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-4">Settings</h2>

      <div className="space-y-3 flex-1">
        {/* Sync status */}
        <div className="bg-navy-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">Google Drive Sync</span>
            <span className={`text-xs font-medium ${syncColor}`}>
              {syncLabel}
            </span>
          </div>
          {lastSynced && (
            <p className="text-xs text-slate-500 mb-3">
              Last synced: {formatDate(lastSynced)}
            </p>
          )}
          <button
            onClick={onSync}
            disabled={syncStatus === "syncing"}
            className="w-full py-2 bg-navy-600 hover:bg-navy-800 disabled:opacity-40 text-sm text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M15.015 4.382v4.993"
              />
            </svg>
            Sync Now
          </button>
        </div>

        {/* Import */}
        <div className="bg-navy-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <svg
              className="w-5 h-5 text-slate-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <div>
              <p className="text-sm text-white">Import Passwords</p>
              <p className="text-xs text-slate-500">
                KeePass CSV format only
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="w-full py-2 bg-navy-600 hover:bg-navy-800 disabled:opacity-40 text-sm text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Select CSV File
              </>
            )}
          </button>

          {importResult && (
            <div className={`mt-3 text-xs rounded-md p-2 ${importResult.count > 0 ? "bg-teal-500/10 text-teal-400" : "bg-red-500/10 text-red-400"}`}>
              {importResult.count > 0 ? (
                <p>
                  Imported {importResult.count} passwords from{" "}
                  {sourceLabel[importResult.source] ?? importResult.source}
                  {importResult.skipped > 0 && ` (${importResult.skipped} skipped)`}
                </p>
              ) : (
                <p>No passwords found in file. Make sure it's a valid CSV export.</p>
              )}
            </div>
          )}

          <div className="mt-3 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-400">How to export from KeePass:</p>
            <p>File &gt; Export &gt; KeePass CSV (1.x)</p>
            <p className="text-slate-600 mt-1">Expects columns: Group, Title, Username, Password, URL, Notes</p>
          </div>
        </div>

        {/* Export */}
        <button
          onClick={onExport}
          className="w-full bg-navy-700 rounded-lg p-4 flex items-center gap-3 hover:bg-navy-600 transition-colors text-left"
        >
          <svg
            className="w-5 h-5 text-slate-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          <div>
            <p className="text-sm text-white">Export Vault</p>
            <p className="text-xs text-slate-500">
              Download encrypted backup file
            </p>
          </div>
        </button>

        {/* Security info */}
        <div className="bg-navy-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-2">Security</h3>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>AES-256-GCM encryption</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>PBKDF2 with 600,000 iterations</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>Zero-knowledge: password never leaves device</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>Auto-lock after 15 minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lock button */}
      <button
        onClick={onLock}
        className="w-full py-3 mt-4 shrink-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Lock Vault
      </button>
    </div>
  );
}
