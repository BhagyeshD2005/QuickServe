const enc = new TextEncoder();

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = "SHA-256";
const PBKDF2_KEY_LENGTH = 256;
const SALT_LENGTH = 16;

function toBase64(bytes: Uint8Array): string {
  let s = "";

  for (const b of bytes) {
    s += String.fromCharCode(b);
  }

  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

/**
 * Hash password using PBKDF2-SHA256.
 *
 * Format:
 * pbkdf2$100000$<salt>$<hash>
 */
export async function hashPassword(
  password: string
): Promise<string> {
  const salt = crypto.getRandomValues(
    new Uint8Array(SALT_LENGTH)
  );

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    key,
    PBKDF2_KEY_LENGTH
  );

  return [
    "pbkdf2",
    PBKDF2_ITERATIONS.toString(),
    toBase64(salt),
    toBase64(new Uint8Array(bits)),
  ].join("$");
}

/**
 * Verify password against stored PBKDF2 hash.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split("$");

    if (parts.length !== 4) {
      return false;
    }

    const [scheme, iterText, saltText, hashText] = parts;

    if (
      scheme !== "pbkdf2" ||
      !iterText ||
      !saltText ||
      !hashText
    ) {
      return false;
    }

    const iterations = Number(iterText);

    if (
      !Number.isInteger(iterations) ||
      iterations <= 0 ||
      iterations > PBKDF2_ITERATIONS
    ) {
      return false;
    }

    const salt = fromBase64(saltText);
    const expected = fromBase64(hashText);

    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: toArrayBuffer(salt),
        iterations,
        hash: PBKDF2_HASH,
      },
      key,
      PBKDF2_KEY_LENGTH
    );

    const actual = new Uint8Array(bits);

    if (actual.length !== expected.length) {
      return false;
    }

    // Constant-time comparison
    let diff = 0;

    for (let i = 0; i < actual.length; i++) {
      diff |= actual[i] ^ expected[i];
    }

    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Generate a UUID-based ID.
 */
export function randomId(prefix = ""): string {
  return `${prefix}${crypto.randomUUID()}`;
}