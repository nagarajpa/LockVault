const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

export function vaultFileName(vaultId: string): string {
  return `${vaultId}.vault.enc`;
}

export async function findVaultFileId(
  accessToken: string,
  filename: string
): Promise<{ id: string; modifiedTime: string } | null> {
  const query = encodeURIComponent(
    `name = '${filename}' and trashed = false`
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

export async function createVaultFile(
  encryptedData: string,
  filename: string,
  accessToken: string
): Promise<string> {
  const metadata = {
    name: filename,
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

export async function deleteVaultFile(
  fileId: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(`${DRIVE_API}/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete vault from Drive: ${response.status}`);
  }
}
