/**
 * `crypto.randomUUID` only exists in a secure context, so opening the dev server over a LAN address
 * (`http://192.168.x.x:5173`) leaves it undefined and every id source in the stores throws on boot.
 * `getRandomValues` is not secure-context gated, so the v4 bits are assembled here instead.
 */
export function uuid(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
