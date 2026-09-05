import "fake-indexeddb/auto";

if (!globalThis.crypto.subtle) {
  // jsdom in this environment exposes crypto; keep a guard for older runners.
}
