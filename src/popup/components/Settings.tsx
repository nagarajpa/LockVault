import type { SyncStatus } from "@shared/types";

interface Props {
  syncStatus: SyncStatus;
  lastSynced: string | null;
  onSync: () => void;
  onExport: () => void;
  onLock: () => void;
}

export default function Settings({
  syncStatus,
  lastSynced,
  onSync,
  onExport,
  onLock,
}: Props) {
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

  return (
    <div className="flex flex-col h-full px-4 py-4">
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
        className="w-full py-3 mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Lock Vault
      </button>
    </div>
  );
}
