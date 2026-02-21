import { useState } from "react";
import type { VaultEntry, VaultCategory, PasswordGeneratorOptions } from "@shared/types";
import { VAULT_CATEGORIES } from "@shared/types";
import {
  generatePassword,
  DEFAULT_OPTIONS,
} from "@shared/passwordGenerator";

interface Props {
  entry?: VaultEntry | null;
  onSave: (entry: VaultEntry) => void;
  onCancel: () => void;
}

export default function AddEditCredential({ entry, onSave, onCancel }: Props) {
  const [siteName, setSiteName] = useState(entry?.site_name ?? "");
  const [url, setUrl] = useState(entry?.url ?? "");
  const [username, setUsername] = useState(entry?.username ?? "");
  const [password, setPassword] = useState(entry?.password ?? "");
  const [category, setCategory] = useState<VaultCategory>(entry?.category ?? "Other");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [showPassword, setShowPassword] = useState(false);

  const handleGenerate = () => {
    const opts: PasswordGeneratorOptions = { ...DEFAULT_OPTIONS };
    const generated = generatePassword(opts);
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim() || !password.trim()) return;

    onSave({
      id: entry?.id ?? crypto.randomUUID(),
      site_name: siteName.trim(),
      url: url.trim(),
      username: username.trim(),
      password,
      category,
      favorite: entry?.favorite ?? false,
      notes: notes.trim() || undefined,
      created_at: entry?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700">
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white text-sm"
        >
          Cancel
        </button>
        <h2 className="text-sm font-semibold text-white">
          {entry ? "Edit Credential" : "Add Credential"}
        </h2>
        <button
          onClick={handleSubmit}
          disabled={!siteName.trim() || !password.trim()}
          className="text-teal-400 hover:text-teal-300 disabled:opacity-40 text-sm font-semibold"
        >
          Save
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Site Name *
          </label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="e.g. GitHub"
            className="w-full px-3 py-2.5 bg-navy-700 border border-navy-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Website URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com"
            className="w-full px-3 py-2.5 bg-navy-700 border border-navy-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Username / Email
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2.5 bg-navy-700 border border-navy-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter or generate a password"
              className="w-full px-3 py-2.5 bg-navy-700 border border-navy-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-white"
                title="Toggle visibility"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </>
                  )}
                </svg>
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="p-1 text-teal-400 hover:text-teal-300"
                title="Generate password"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {VAULT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === cat
                    ? "bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/50"
                    : "bg-navy-700 text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
            className="w-full px-3 py-2.5 bg-navy-700 border border-navy-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
          />
        </div>
      </form>
    </div>
  );
}
