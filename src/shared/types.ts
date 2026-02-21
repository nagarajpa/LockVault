export interface VaultEntry {
  id: string;
  site_name: string;
  url: string;
  username: string;
  password: string;
  category: VaultCategory;
  favorite: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type VaultCategory = "Work" | "Personal" | "Finance" | "Social" | "Other";

export const VAULT_CATEGORIES: VaultCategory[] = [
  "Work",
  "Personal",
  "Finance",
  "Social",
  "Other",
];

export interface VaultData {
  vault_id: string;
  version: number;
  last_updated: string;
  salt: string;
  entries: VaultEntry[];
}

export interface EncryptedVault {
  ciphertext: string;
  iv: string;
  salt: string;
  last_updated: string;
}

export type SyncStatus = "synced" | "syncing" | "offline" | "conflict" | "error";

export interface AppState {
  isUnlocked: boolean;
  isFirstTime: boolean;
  syncStatus: SyncStatus;
  lastSynced: string | null;
}

export type MessageType =
  | "UNLOCK"
  | "LOCK"
  | "SETUP"
  | "GET_STATE"
  | "GET_VAULT"
  | "SAVE_ENTRY"
  | "DELETE_ENTRY"
  | "GENERATE_PASSWORD"
  | "GET_ENTRIES_FOR_URL"
  | "SYNC_VAULT"
  | "EXPORT_VAULT";

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}
