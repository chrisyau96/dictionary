import { describe, expect, it } from "vitest";
import { normalizeTextBytes, sha256Hex, sha256OfPackFile } from "./hash";

describe("pack checksums", () => {
  it("treats Windows CRLF and a UTF-8 BOM as the same text as LF", async () => {
    const lf = new TextEncoder().encode('{\n  "packId": "foundation-50"\n}\n');
    const crlf = new TextEncoder().encode('{\r\n  "packId": "foundation-50"\r\n}\r\n');
    const bomCrlf = new Uint8Array([0xef, 0xbb, 0xbf, ...crlf]);
    const expected = await sha256Hex(lf);
    expect(await sha256OfPackFile("pack.json", crlf)).toBe(expected);
    expect(await sha256OfPackFile("pack.json", bomCrlf)).toBe(expected);
    expect(new TextDecoder().decode(normalizeTextBytes(crlf))).toBe(new TextDecoder().decode(lf));
  });

  it("does not rewrite binary audio bytes", async () => {
    const mp3 = new Uint8Array([0xff, 0xfb, 0x0d, 0x0a, 0x00]);
    expect(await sha256OfPackFile("audio/p-saw.mp3", mp3)).toBe(await sha256Hex(mp3));
  });
});
