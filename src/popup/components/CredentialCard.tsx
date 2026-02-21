import { useState } from "react";
import type { VaultEntry } from "@shared/types";

interface Props {
  entry: VaultEntry;
  onEdit: (entry: VaultEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (entry: VaultEntry) => void;
}

export default function CredentialCard({
  entry,
  onEdit,
  onDelete,
  onToggleFavorite,
}: Props) {
  const [copied, setCopied] = useState<"password" | "username" | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const faviconUrl = (() => {
    try {
      const host = new URL(entry.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
    } catch {
      return null;
    }
  })();

  const copyToClipboard = async (text: string, field: "password" | "username") => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="bg-navy-700 rounded-lg p-3 hover:bg-navy-600 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-navy-600 flex items-center justify-center shrink-0 overflow-hidden">
          {faviconUrl ? (
            <img src={faviconUrl} alt="" className="w-5 h-5" />
          ) : (
            <span className="text-xs font-bold text-teal-400">
              {entry.site_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-white truncate">
              {entry.site_name}
            </p>
            <button
              onClick={() => onToggleFavorite({ ...entry, favorite: !entry.favorite })}
              className="shrink-0"
            >
              <svg
                className={`w-3.5 h-3.5 ${entry.favorite ? "text-amber-400 fill-amber-400" : "text-slate-500 opacity-0 group-hover:opacity-100"}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-400 truncate">{entry.username}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => copyToClipboard(entry.username, "username")}
            className="p-1.5 rounded-md hover:bg-navy-800 text-slate-400 hover:text-white transition-colors"
            title="Copy username"
          >
            {copied === "username" ? (
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => copyToClipboard(entry.password, "password")}
            className="p-1.5 rounded-md hover:bg-navy-800 text-slate-400 hover:text-white transition-colors"
            title="Copy password"
          >
            {copied === "password" ? (
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 rounded-md hover:bg-navy-800 text-slate-400 hover:text-white transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
          {showConfirmDelete ? (
            <button
              onClick={() => { onDelete(entry.id); setShowConfirmDelete(false); }}
              className="p-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              title="Confirm delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              onBlur={() => setTimeout(() => setShowConfirmDelete(false), 200)}
              className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
