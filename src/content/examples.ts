export function meaningLabel(glossTc: string): string {
  let text = glossTc.replace(/[A-Za-z0-9]+/g, "");
  if (text.includes("：")) text = text.split("：").at(-1) ?? text;
  else if (text.includes(":")) text = text.split(":").at(-1) ?? text;
  text = text.split("例如")[0] ?? text;
  return text.replace(/\s+/g, "").replace(/^[，,。；;、]+|[，,。；;、]+$/g, "") || "這個意思";
}

export function traditionalWithoutEnglish(tc: string, glossTc: string): string {
  const meaning = meaningLabel(glossTc);
  let text = tc.replace(/「[^」]*[A-Za-z][^」]*」/g, meaning);
  text = text.replace(/[A-Za-z][A-Za-z0-9+.#]*/g, "");
  text = text.replaceAll("「」", "").replace(/\s+/g, "");
  text = text.replace(/[，,]{2,}/g, "，");
  if (!/[\u4e00-\u9fff]/.test(text)) return `這是指${meaning}。`;
  return text;
}
