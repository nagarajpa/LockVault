import type { PasswordGeneratorOptions } from "./types";

const CHAR_POOLS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:',.<>?/`~",
} as const;

function getSecureRandom(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

export function generatePassword(options: PasswordGeneratorOptions): string {
  let pool = "";
  const required: string[] = [];

  if (options.uppercase) {
    pool += CHAR_POOLS.uppercase;
    required.push(
      CHAR_POOLS.uppercase[getSecureRandom(CHAR_POOLS.uppercase.length)]
    );
  }
  if (options.lowercase) {
    pool += CHAR_POOLS.lowercase;
    required.push(
      CHAR_POOLS.lowercase[getSecureRandom(CHAR_POOLS.lowercase.length)]
    );
  }
  if (options.numbers) {
    pool += CHAR_POOLS.numbers;
    required.push(
      CHAR_POOLS.numbers[getSecureRandom(CHAR_POOLS.numbers.length)]
    );
  }
  if (options.symbols) {
    pool += CHAR_POOLS.symbols;
    required.push(
      CHAR_POOLS.symbols[getSecureRandom(CHAR_POOLS.symbols.length)]
    );
  }

  if (pool.length === 0) {
    pool = CHAR_POOLS.lowercase;
    required.push(
      CHAR_POOLS.lowercase[getSecureRandom(CHAR_POOLS.lowercase.length)]
    );
  }

  const remaining = options.length - required.length;
  const chars = [...required];

  for (let i = 0; i < remaining; i++) {
    chars.push(pool[getSecureRandom(pool.length)]);
  }

  // Fisher-Yates shuffle using CSPRNG
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getSecureRandom(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

export function calculateEntropy(options: PasswordGeneratorOptions): number {
  let poolSize = 0;
  if (options.uppercase) poolSize += CHAR_POOLS.uppercase.length;
  if (options.lowercase) poolSize += CHAR_POOLS.lowercase.length;
  if (options.numbers) poolSize += CHAR_POOLS.numbers.length;
  if (options.symbols) poolSize += CHAR_POOLS.symbols.length;

  if (poolSize === 0) return 0;
  return Math.floor(options.length * Math.log2(poolSize));
}

export function getStrengthLabel(entropy: number): {
  label: string;
  color: string;
} {
  if (entropy < 40) return { label: "Weak", color: "#ef4444" };
  if (entropy < 60) return { label: "Fair", color: "#f59e0b" };
  if (entropy < 80) return { label: "Strong", color: "#22c55e" };
  return { label: "Very Strong", color: "#14b8a6" };
}

export const DEFAULT_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};
