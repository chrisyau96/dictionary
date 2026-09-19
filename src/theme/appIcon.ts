const MARK = `${import.meta.env.BASE_URL}icons/icon-mark.png`;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const n = Number.parseInt(value.length === 3 ? value.split("").map((part) => part + part).join("") : value, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function isAccentMark(r: number, g: number, b: number, a: number): boolean {
  if (a < 10) return false;
  return b > r + 60 && b > g + 40 && b > 150;
}

let lastUrl = "";

export async function tintFavicon(accentHex: string): Promise<void> {
  if (typeof document === "undefined" || typeof Image === "undefined") return;
  const [nr, ng, nb] = hexToRgb(accentHex);
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve();
          return;
        }
        ctx.drawImage(img, 0, 0, 64, 64);
        const picture = ctx.getImageData(0, 0, 64, 64);
        const data = picture.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;
          const a = data[i + 3] ?? 0;
          if (!isAccentMark(r, g, b, a)) continue;
          data[i] = nr;
          data[i + 1] = ng;
          data[i + 2] = nb;
        }
        ctx.putImageData(picture, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve();
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.getElementById("app-favicon") as HTMLLinkElement | null;
          if (link) {
            link.type = "image/png";
            link.href = url;
          }
          if (lastUrl) URL.revokeObjectURL(lastUrl);
          lastUrl = url;
          resolve();
        }, "image/png");
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => resolve();
    img.src = MARK;
  });
}
