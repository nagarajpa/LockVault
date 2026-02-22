import type { VaultEntry } from "./types";

interface CsvRow {
  [key: string]: string;
}

const COLUMN_MAPS: Record<string, Record<string, string>> = {
  chrome: { name: "site_name", url: "url", username: "username", password: "password" },
  firefox: { url: "url", username: "username", password: "password" },
  lastpass: { name: "site_name", url: "url", username: "username", password: "password", grouping: "category", extra: "notes", fav: "favorite" },
  bitwarden: { login_name: "site_name", name: "site_name", login_uri: "url", login_username: "username", login_password: "password", notes: "notes" },
  onepassword: { title: "site_name", url: "url", username: "username", password: "password", notes: "notes" },
  keepass: { title: "site_name", url: "url", username: "username", password: "password", notes: "notes", group: "category" },
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: CsvRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function detectSource(headers: string[]): string {
  const normalized = headers.map((h) => h.toLowerCase().replace(/\s+/g, "_"));

  if (normalized.includes("login_uri") || normalized.includes("login_password")) return "bitwarden";
  if (normalized.includes("grouping") && normalized.includes("extra")) return "lastpass";
  if (normalized.includes("httprealm") || normalized.includes("formactionorigin")) return "firefox";
  if (normalized.includes("group") && normalized.includes("title") && normalized.includes("totp")) return "keepass";
  if (normalized.includes("title") && normalized.includes("url") && normalized.includes("username")) return "onepassword";
  return "chrome";
}

function guessCategory(row: CsvRow, source: string): string {
  const groupField = source === "lastpass" ? row.grouping : row.group;
  if (groupField) {
    const g = groupField.toLowerCase();
    if (g.includes("work") || g.includes("business")) return "Work";
    if (g.includes("finance") || g.includes("bank") || g.includes("pay")) return "Finance";
    if (g.includes("social")) return "Social";
    if (g.includes("personal")) return "Personal";
  }
  return "Other";
}

export function importFromCsv(csvText: string): {
  entries: VaultEntry[];
  source: string;
  skipped: number;
} {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { entries: [], source: "unknown", skipped: 0 };
  }

  const headers = Object.keys(rows[0]);
  const source = detectSource(headers);
  const columnMap = COLUMN_MAPS[source] ?? COLUMN_MAPS.chrome;

  const entries: VaultEntry[] = [];
  let skipped = 0;

  for (const row of rows) {
    let siteName = "";
    let url = "";
    let username = "";
    let password = "";
    let notes = "";
    let favorite = false;

    for (const [csvCol, vaultField] of Object.entries(columnMap)) {
      const value = row[csvCol] ?? "";
      if (!value) continue;

      switch (vaultField) {
        case "site_name": if (!siteName) siteName = value; break;
        case "url": if (!url) url = value; break;
        case "username": username = value; break;
        case "password": password = value; break;
        case "notes": notes = value; break;
        case "favorite": favorite = value === "1" || value.toLowerCase() === "true"; break;
      }
    }

    if (!password) {
      skipped++;
      continue;
    }

    if (!siteName && url) {
      try {
        siteName = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        siteName = url;
      }
    }

    if (!siteName) {
      skipped++;
      continue;
    }

    entries.push({
      id: crypto.randomUUID(),
      site_name: siteName,
      url,
      username,
      password,
      category: guessCategory(row, source) as VaultEntry["category"],
      favorite,
      notes: notes || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return { entries, source, skipped };
}
