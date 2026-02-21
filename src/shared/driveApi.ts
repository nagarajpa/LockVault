const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const VAULT_FILENAME = "lockvault.enc";

export async function findVaultFileId(
  accessToken: string
): Promise<{ id: string; modifiedTime: string } | null> {
  const query = encodeURIComponent(
    `name = '${VAULT_FILENAME}' and trashed = false`
  );
  const response = await fetch(
    `${DRIVE_API}?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Drive API search failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return { id: data.files[0].id, modifiedTime: data.files[0].modifiedTime };
  }
  return null;
}

export async function downloadVault(
  fileId: string,
  accessToken: string
): Promise<string> {
  const response = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download vault: ${response.status}`);
  }
  return response.text();
}

export async function createVault(
  encryptedData: string,
  accessToken: string
): Promise<string> {
  const metadata = {
    name: VAULT_FILENAME,
    parents: ["appDataFolder"],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", new Blob([encryptedData], { type: "text/plain" }));

  const response = await fetch(`${UPLOAD_API}?uploadType=multipart`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Failed to create vault: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

export async function updateVault(
  fileId: string,
  encryptedData: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `${UPLOAD_API}/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: encryptedData,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to sync vault to Google Drive: ${response.status}`);
  }
}

export async function getVaultModifiedTime(
  fileId: string,
  accessToken: string
): Promise<string> {
  const response = await fetch(
    `${DRIVE_API}/${fileId}?fields=modifiedTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Failed to get vault metadata: ${response.status}`);
  }

  const data = await response.json();
  return data.modifiedTime;
}
