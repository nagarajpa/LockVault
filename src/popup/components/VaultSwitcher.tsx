import { useState } from "react";
import type { VaultMeta } from "@shared/types";

interface Props {
  activeVaultId: string | null;
  activeVaultName: string | null;
  vaultList: VaultMeta[];
  onSwitch: (vaultId: string) => void;
  onCreate: (name: string) => void;
  onRename: (vaultId: string, name: string) => void;
  onDelete: (vaultId: string) => void;
}

export default function VaultSwitcher({
  activeVaultId,
  activeVaultName,
  vaultList,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setCreating(false);
    setOpen(false);
  };

  const handleRename = (id: string) => {
    if (!renameValue.trim()) return;
    onRename(id, renameValue.trim());
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setConfirmDeleteId(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors max-w-[200px]"
      >
        <svg
          className="w-3.5 h-3.5 text-teal-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
        <span className="text-sm font-medium text-white truncate">
          {activeVaultName ?? "Vault"}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              setCreating(false);
              setRenamingId(null);
              setConfirmDeleteId(null);
            }}
          />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-navy-800 border border-navy-600 rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-navy-700">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Vault Databases
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {vaultList.map((v) => (
                <div key={v.id} className="group">
                  {renamingId === v.id ? (
                    <div className="px-3 py-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(v.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="flex-1 px-2 py-1 bg-navy-700 border border-navy-600 rounded text-xs text-white focus:outline-none focus:border-teal-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(v.id)}
                        className="text-teal-400 hover:text-teal-300"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  ) : confirmDeleteId === v.id ? (
                    <div className="px-3 py-2 bg-red-500/10">
                      <p className="text-xs text-red-400 mb-2">
                        Delete "{v.name}"?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="flex-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 px-2 py-1 bg-navy-700 text-slate-400 rounded text-xs hover:bg-navy-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button
                        onClick={() => {
                          if (v.id !== activeVaultId) onSwitch(v.id);
                          setOpen(false);
                        }}
                        className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-navy-700 transition-colors ${
                          v.id === activeVaultId ? "bg-teal-500/10" : ""
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            v.id === activeVaultId
                              ? "bg-teal-400"
                              : "bg-navy-600"
                          }`}
                        />
                        <span
                          className={`text-sm truncate ${
                            v.id === activeVaultId
                              ? "text-teal-400 font-medium"
                              : "text-slate-300"
                          }`}
                        >
                          {v.name}
                        </span>
                      </button>

                      <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setRenamingId(v.id);
                            setRenameValue(v.name);
                          }}
                          className="p-1 text-slate-500 hover:text-white"
                          title="Rename"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        {vaultList.length > 1 && (
                          <button
                            onClick={() => setConfirmDeleteId(v.id)}
                            className="p-1 text-slate-500 hover:text-red-400"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Create new */}
            <div className="border-t border-navy-700">
              {creating ? (
                <div className="px-3 py-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                      if (e.key === "Escape") setCreating(false);
                    }}
                    placeholder="Vault name..."
                    className="flex-1 px-2 py-1 bg-navy-700 border border-navy-600 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    autoFocus
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="text-teal-400 hover:text-teal-300 disabled:opacity-40"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-teal-400 hover:bg-navy-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Vault
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
