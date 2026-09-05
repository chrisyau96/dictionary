import { db, ensureProfile } from "../db/database";
import type { DiagnosticResponse, EstimatedBand } from "../types";

export interface DiagnosticItem {
  id: string;
  senseId: string;
  kind: "recognition" | "production";
  prompt: string;
  answer: string;
}

export const DIAGNOSTIC_ITEMS: DiagnosticItem[] = [
  { id: "d1", senseId: "s-help", kind: "recognition", prompt: "help", answer: "協助；使事情較容易完成" },
  { id: "d2", senseId: "s-please", kind: "recognition", prompt: "please", answer: "提出要求時的禮貌用語" },
  { id: "d3", senseId: "s-customer", kind: "recognition", prompt: "customer", answer: "購買貨品或服務的人" },
  { id: "d4", senseId: "s-meeting", kind: "production", prompt: "預先安排、一起討論工作的時間", answer: "meeting" },
  { id: "d5", senseId: "s-deadline", kind: "recognition", prompt: "deadline", answer: "必須完成的最後期限" },
  { id: "d6", senseId: "s-queue", kind: "production", prompt: "輪候的一排人", answer: "queue" },
  { id: "d7", senseId: "s-invoice", kind: "recognition", prompt: "invoice", answer: "列出應付款額的帳單" },
  { id: "d8", senseId: "s-streamline", kind: "recognition", prompt: "streamline", answer: "精簡流程，去掉多餘步驟" },
  { id: "d9", senseId: "s-stakeholder", kind: "production", prompt: "受項目影響、亦能影響項目的人或團體", answer: "stakeholder" },
  { id: "d10", senseId: "s-deploy", kind: "recognition", prompt: "deploy", answer: "把系統正式投入使用" },
  { id: "d11", senseId: "s-pivot", kind: "recognition", prompt: "pivot", answer: "改變生意的主要方向" },
  { id: "d12", senseId: "s-deliverable", kind: "production", prompt: "已承諾要交出的完成工作成果", answer: "deliverable" },
];

export function estimateBand(responses: DiagnosticResponse[]): EstimatedBand {
  const score = responses.reduce((total, item) => {
    if (item.answer === "know") return total + (item.kind === "production" ? 2 : 1);
    if (item.answer === "familiar") return total + 0.5;
    return total;
  }, 0);
  if (score >= 14) return "independent";
  if (score >= 7) return "developing";
  return "emerging";
}

export async function saveDiagnostic(responses: DiagnosticResponse[]): Promise<EstimatedBand> {
  const band = estimateBand(responses);
  const profile = await ensureProfile();
  await db.profile.put({
    ...profile,
    estimatedBand: band,
    diagnosticCompletedAt: new Date().toISOString(),
    diagnosticResponses: responses,
  });
  return band;
}
