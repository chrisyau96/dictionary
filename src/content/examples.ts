export function traditionalWithoutEnglish(tc: string, glossTc: string): string {
  void glossTc;
  let text = tc.replaceAll("WhatsApp", "即時訊息").replaceAll("PDF", "文件");
  text = text.replace(/「[^」]*[A-Za-z][^」]*」/g, "這個用法");
  text = text.replace(/[A-Za-z][A-Za-z0-9+.#]*/g, "");
  text = text.replaceAll("「」", "").replace(/\s+/g, "");
  text = text.replace(/[，,]{2,}/g, "，");
  if (!/[\u4e00-\u9fff]/.test(text)) return "這是指這個用法。";
  return text;
}
