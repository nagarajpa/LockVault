interface MatchedEntry {
  id: string;
  site_name: string;
  username: string;
  password: string;
  url: string;
}

let activeDropdown: HTMLElement | null = null;
let currentPasswordField: HTMLInputElement | null = null;

function findUsernameField(passwordField: HTMLInputElement): HTMLInputElement | null {
  const form = passwordField.closest("form");
  const scope = form ?? passwordField.parentElement?.parentElement ?? document;

  const candidates = scope.querySelectorAll<HTMLInputElement>(
    'input[type="text"], input[type="email"], input:not([type])'
  );

  let best: HTMLInputElement | null = null;
  for (const input of candidates) {
    const name = (input.name + input.id + input.autocomplete).toLowerCase();
    if (
      name.includes("user") ||
      name.includes("email") ||
      name.includes("login") ||
      name.includes("account") ||
      input.type === "email"
    ) {
      best = input;
    }
  }

  if (!best && candidates.length > 0) {
    best = candidates[candidates.length - 1];
  }

  return best;
}

function createDropdown(
  entries: MatchedEntry[],
  anchorField: HTMLInputElement
): HTMLElement {
  removeDropdown();

  const host = document.createElement("div");
  host.id = "lockvault-autofill-host";
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    :host {
      position: absolute;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .lv-dropdown {
      background: #111827;
      border: 1px solid #2d3a4f;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      overflow: hidden;
      min-width: 260px;
      max-width: 340px;
    }
    .lv-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-bottom: 1px solid #1e293b;
      font-size: 11px;
      font-weight: 600;
      color: #14b8a6;
    }
    .lv-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      color: #f1f5f9;
    }
    .lv-item:hover, .lv-item:focus {
      background: #1e293b;
      outline: none;
    }
    .lv-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .lv-icon img {
      width: 18px;
      height: 18px;
    }
    .lv-letter {
      font-size: 12px;
      font-weight: 700;
      color: #14b8a6;
    }
    .lv-text {
      overflow: hidden;
    }
    .lv-site {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lv-user {
      font-size: 11px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;

  const dropdown = document.createElement("div");
  dropdown.className = "lv-dropdown";

  const header = document.createElement("div");
  header.className = "lv-header";
  header.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg> LockVault`;
  dropdown.appendChild(header);

  entries.forEach((entry, index) => {
    const item = document.createElement("button");
    item.className = "lv-item";
    item.tabIndex = 0;

    let faviconHtml: string;
    try {
      const host = new URL(entry.url).hostname;
      faviconHtml = `<img src="https://www.google.com/s2/favicons?domain=${host}&sz=32" alt="">`;
    } catch {
      faviconHtml = `<span class="lv-letter">${entry.site_name.charAt(0).toUpperCase()}</span>`;
    }

    item.innerHTML = `
      <div class="lv-icon">${faviconHtml}</div>
      <div class="lv-text">
        <div class="lv-site">${escapeHtml(entry.site_name)}</div>
        <div class="lv-user">${escapeHtml(entry.username)}</div>
      </div>
    `;

    item.addEventListener("click", () => {
      fillCredentials(anchorField, entry);
      removeDropdown();
    });

    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        fillCredentials(anchorField, entry);
        removeDropdown();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = item.nextElementSibling as HTMLElement | null;
        next?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = item.previousElementSibling as HTMLElement | null;
        if (prev?.classList.contains("lv-item")) prev.focus();
      } else if (e.key === "Escape") {
        removeDropdown();
        anchorField.focus();
      }
    });

    dropdown.appendChild(item);

    if (index === 0) {
      requestAnimationFrame(() => item.focus());
    }
  });

  shadow.appendChild(style);
  shadow.appendChild(dropdown);

  const rect = anchorField.getBoundingClientRect();
  host.style.position = "absolute";
  host.style.top = `${window.scrollY + rect.bottom + 4}px`;
  host.style.left = `${window.scrollX + rect.left}px`;

  document.body.appendChild(host);
  activeDropdown = host;

  return host;
}

function fillCredentials(passwordField: HTMLInputElement, entry: MatchedEntry) {
  const usernameField = findUsernameField(passwordField);

  if (usernameField) {
    setNativeValue(usernameField, entry.username);
  }
  setNativeValue(passwordField, entry.password);
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function removeDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function handlePasswordFieldFocus(field: HTMLInputElement) {
  if (currentPasswordField === field && activeDropdown) return;
  currentPasswordField = field;

  chrome.runtime.sendMessage(
    { type: "GET_ENTRIES_FOR_URL", payload: { hostname: window.location.hostname } },
    (response) => {
      if (response?.success && response.data?.entries?.length > 0) {
        createDropdown(response.data.entries, field);
      }
    }
  );
}

function scanForPasswordFields(root: ParentNode = document) {
  const fields = root.querySelectorAll<HTMLInputElement>('input[type="password"]');
  fields.forEach((field) => {
    if (field.dataset.lockvaultBound) return;
    field.dataset.lockvaultBound = "true";

    field.addEventListener("focus", () => handlePasswordFieldFocus(field));
  });
}

document.addEventListener("click", (e) => {
  if (activeDropdown && !(e.target as Element)?.closest?.("#lockvault-autofill-host")) {
    removeDropdown();
  }
});

scanForPasswordFields();

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        scanForPasswordFields(node);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
