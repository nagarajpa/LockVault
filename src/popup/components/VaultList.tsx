import { useState, useMemo } from "react";
import type { VaultData, VaultEntry, VaultCategory } from "@shared/types";
import CredentialCard from "./CredentialCard";

type Tab = "All" | "Favorites" | VaultCategory;
const TABS: Tab[] = ["All", "Favorites", "Work", "Personal", "Finance", "Social", "Other"];

interface Props {
  vault: VaultData;
  onEdit: (entry: VaultEntry) => void;
  onDelete: (id: string) => void;
  onSave: (entry: VaultEntry) => void;
  onAdd: () => void;
}

export default function VaultList({ vault, onEdit, onDelete, onSave, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("All");

  const filtered = useMemo(() => {
    let entries = vault.entries;

    if (activeTab === "Favorites") {
      entries = entries.filter((e) => e.favorite);
    } else if (activeTab !== "All") {
      entries = entries.filter((e) => e.category === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.site_name.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          e.url.toLowerCase().includes(q)
      );
    }

    return entries.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.site_name.localeCompare(b.site_name);
    });
  }, [vault.entries, search, activeTab]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault..."
            className="w-full pl-10 pr-4 py-2.5 bg-navy-700 border border-navy-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-teal-500/20 text-teal-400"
                  : "text-slate-400 hover:text-white hover:bg-navy-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 mx-auto text-navy-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
            <p className="text-slate-500 text-sm">
              {search ? "No matching entries" : "No passwords saved yet"}
            </p>
            {!search && (
              <button
                onClick={onAdd}
                className="mt-3 text-teal-400 text-sm hover:underline"
              >
                Add your first password
              </button>
            )}
          </div>
        ) : (
          filtered.map((entry) => (
            <CredentialCard
              key={entry.id}
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onSave}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onAdd}
        className="absolute bottom-20 right-4 w-12 h-12 bg-teal-500 hover:bg-teal-600 rounded-full shadow-lg shadow-teal-500/25 flex items-center justify-center transition-colors"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </button>
    </div>
  );
}
