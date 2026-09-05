const TEXT_PACK_FILES = /\.(json|md|txt)$/i;

function toBytes(data: BufferSource): Uint8Array {
  const source = ArrayBuffer.isView(data)
    ? new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)
    : new Uint8Array(data as ArrayBuffer);
  const copy = new Uint8Array(source.byteLength);
  for (let i = 0; i < source.byteLength; i += 1) copy[i] = source[i]!;
  return copy;
}

export function normalizeTextBytes(data: BufferSource): Uint8Array {
  const decoded = new TextDecoder().decode(toBytes(data)).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return new TextEncoder().encode(decoded);
}

export function bytesForChecksum(path: string, data: BufferSource): Uint8Array {
  return TEXT_PACK_FILES.test(path) ? normalizeTextBytes(data) : toBytes(data);
}

export async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toBytes(data) as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256OfPackFile(path: string, data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytesForChecksum(path, data) as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
