const ITERATIONS = 600_000;
const CHUNK_SIZE = 8192;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bytesToBase64(salt);
}

export async function deriveKey(
  password: string,
  saltBase64: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const saltBuffer = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const encodedData = enc.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  );

  const ciphertext = bytesToBase64(new Uint8Array(encryptedBuffer));
  const ivBase64 = bytesToBase64(iv);

  return { ciphertext, iv: ivBase64 };
}

export async function decryptData(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const ciphertextBuffer = Uint8Array.from(atob(ciphertextBase64), (c) =>
    c.charCodeAt(0)
  );
  const ivBuffer = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      key,
      ciphertextBuffer
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    throw new Error(
      "Decryption failed. Incorrect master password or corrupted data."
    );
  }
}
