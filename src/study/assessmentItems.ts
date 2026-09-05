import type { CardTask, EditorialBand } from "../types";

export interface AssessmentItem {
  id: string;
  version: "v1";
  band: EditorialBand;
  skill: CardTask;
  phase: "routing" | "understanding" | "use";
  senseId: string | null;
  prompt: string;
  stem?: string;
  options?: string[];
  correct: string;
  accepted?: string[];
}

function item(
  id: string,
  band: EditorialBand,
  skill: CardTask,
  phase: AssessmentItem["phase"],
  prompt: string,
  correct: string,
  extra: Partial<AssessmentItem> = {},
): AssessmentItem {
  return { id, version: "v1", band, skill, phase, senseId: extra.senseId ?? null, prompt, correct, ...extra };
}

export const ASSESSMENT_ITEMS: AssessmentItem[] = [
  item("r-ev-1", "everyday", "recognition", "routing", "refund", "Money returned after a return or a failed purchase", {
    senseId: "s-refund",
    options: [
      "Money returned after a return or a failed purchase",
      "A planned meeting time",
      "A signed contract for a loan",
      "A discount that never expires",
    ],
  }),
  item("r-ev-2", "everyday", "recognition", "routing", "receipt", "A record that shows what was paid", {
    senseId: "s-receipt",
    options: [
      "A record that shows what was paid",
      "A list of staff holidays",
      "A message asking for a meeting",
      "A password for the till",
    ],
  }),
  item("r-wp-1", "workplace", "recognition", "routing", "deadline", "The latest time something must be finished", {
    senseId: "s-deadline",
    options: [
      "The latest time something must be finished",
      "A casual chat after work",
      "The first draft of a poster",
      "A spare key for the shop",
    ],
  }),
  item("r-wp-2", "workplace", "recognition", "routing", "invoice", "A bill that lists what should be paid", {
    senseId: "s-invoice",
    options: [
      "A bill that lists what should be paid",
      "A staff rota for the weekend",
      "A packing box in the storeroom",
      "A customer loyalty stamp",
    ],
  }),
  item("r-pr-1", "professional", "recognition", "routing", "streamline", "Make a process simpler and faster by removing extra steps", {
    senseId: "s-streamline",
    options: [
      "Make a process simpler and faster by removing extra steps",
      "Add more checks so every step is slower",
      "Translate a document into Chinese",
      "Close a shop for renovation",
    ],
  }),
  item("r-pr-2", "professional", "recognition", "routing", "stakeholder", "A person or group affected by a project, who can also affect it", {
    senseId: "s-stakeholder",
    options: [
      "A person or group affected by a project, who can also affect it",
      "The person who only prints name badges",
      "A spare chair in the meeting room",
      "A software licence key",
    ],
  }),
  item("r-sp-1", "specialist", "recognition", "routing", "latency", "The delay before a system responds", {
    options: [
      "The delay before a system responds",
      "The colour of a shop display",
      "A handwritten thank-you note",
      "The cost of a paper bag",
    ],
  }),
  item("r-sp-2", "specialist", "recognition", "routing", "amortise", "Spread a cost over a period instead of taking it all at once", {
    options: [
      "Spread a cost over a period instead of taking it all at once",
      "Pay a supplier in cash immediately",
      "Delete an old WhatsApp chat",
      "Count items on a shelf by hand",
    ],
  }),
  item("u-ev-1", "everyday", "recognition", "understanding", "confirm", "Say that something is definite or correct", {
    senseId: "s-confirm",
    options: [
      "Say that something is definite or correct",
      "Guess without checking",
      "Cancel an order quietly",
      "Hide a customer complaint",
    ],
  }),
  item("u-ev-2", "everyday", "recognition", "understanding", "queue", "A line of people waiting for their turn", {
    senseId: "s-queue",
    options: [
      "A line of people waiting for their turn",
      "A locked storeroom",
      "A finished delivery note",
      "A staff bonus scheme",
    ],
  }),
  item("u-ev-3", "everyday", "recognition", "understanding", "available", "Ready to be used or to help", {
    options: [
      "Ready to be used or to help",
      "Already sold and gone",
      "Too damaged to sell",
      "Reserved for next year only",
    ],
  }),
  item("u-ev-4", "everyday", "recognition", "understanding", "appointment", "A planned time to meet someone", {
    options: [
      "A planned time to meet someone",
      "A surprise visit with no time",
      "A printed price tag",
      "A warehouse barcode",
    ],
  }),
  item("u-wp-1", "workplace", "recognition", "understanding", "handover", "Passing work, information, or responsibility to the next person", {
    senseId: "s-handover",
    options: [
      "Passing work, information, or responsibility to the next person",
      "Throwing away old receipts",
      "Decorating the shop window",
      "Counting coins for the till float",
    ],
  }),
  item("u-wp-2", "workplace", "recognition", "understanding", "follow up", "Check later that something was done or answered", {
    options: [
      "Check later that something was done or answered",
      "Ignore a customer email",
      "Start a completely new shop",
      "Print more paper bags",
    ],
  }),
  item("u-wp-3", "workplace", "recognition", "understanding", "approve", "Officially agree that something can go ahead", {
    options: [
      "Officially agree that something can go ahead",
      "Hide a mistake from the team",
      "Guess the weekly sales",
      "Lock the door at lunch",
    ],
  }),
  item("u-wp-4", "workplace", "recognition", "understanding", "backlog", "Work that has piled up and is still waiting", {
    options: [
      "Work that has piled up and is still waiting",
      "A clean empty inbox",
      "A staff birthday cake",
      "The shop opening hours",
    ],
  }),
  item("u-pr-1", "professional", "recognition", "understanding", "mitigate", "Reduce the harm or risk of a problem", {
    senseId: "s-mitigate",
    options: [
      "Reduce the harm or risk of a problem",
      "Make a small problem much larger",
      "Celebrate a finished sale",
      "Rename a product for fun",
    ],
  }),
  item("u-pr-2", "professional", "recognition", "understanding", "escalate", "Pass a problem to someone with more authority", {
    options: [
      "Pass a problem to someone with more authority",
      "Delete the complaint so nobody sees it",
      "Ask the customer to wait forever",
      "Reprint a faded price label",
    ],
  }),
  item("u-pr-3", "professional", "recognition", "understanding", "constraint", "A limit that you must work within", {
    options: [
      "A limit that you must work within",
      "An unlimited budget",
      "A decorative shop plant",
      "A spare umbrella",
    ],
  }),
  item("u-pr-4", "professional", "recognition", "understanding", "scope", "What a piece of work includes, and what it does not", {
    options: [
      "What a piece of work includes, and what it does not",
      "The colour of the shop walls",
      "A staff lunch order",
      "The length of a paper clip",
    ],
  }),
  item("u-sp-1", "specialist", "recognition", "understanding", "throughput", "How much a system can process in a given time", {
    options: [
      "How much a system can process in a given time",
      "The taste of a new snack",
      "The font used on a poster",
      "A handwritten birthday card",
    ],
  }),
  item("u-sp-2", "specialist", "recognition", "understanding", "canonical", "The official or standard form that others should follow", {
    options: [
      "The official or standard form that others should follow",
      "A one-off messy draft",
      "A joke nickname for a product",
      "A faded photocopy",
    ],
  }),
  item("u-sp-3", "specialist", "recognition", "understanding", "idempotent", "Doing the same action again does not change the result", {
    options: [
      "Doing the same action again does not change the result",
      "Each click creates a new extra order",
      "The till prints a random total",
      "A password that changes every second",
    ],
  }),
  item("u-sp-4", "specialist", "recognition", "understanding", "fiduciary", "A duty to act in someone else's financial interest", {
    options: [
      "A duty to act in someone else's financial interest",
      "A duty to decorate the shop",
      "A hobby of collecting receipts",
      "A rule about lunch breaks only",
    ],
  }),
  item("c-ev-1", "everyday", "recognition", "understanding", "Complete: Please keep the ______ so we can process the refund.", "receipt", {
    senseId: "s-receipt",
    stem: "Please keep the ______ so we can process the refund.",
    accepted: ["receipt", "receipts"],
  }),
  item("c-ev-2", "everyday", "recognition", "understanding", "Complete: There is a long ______ at the till.", "queue", {
    senseId: "s-queue",
    stem: "There is a long ______ at the till.",
    accepted: ["queue", "line"],
  }),
  item("c-wp-1", "workplace", "recognition", "understanding", "Complete: We cannot miss Friday's ______.", "deadline", {
    senseId: "s-deadline",
    stem: "We cannot miss Friday's ______.",
    accepted: ["deadline"],
  }),
  item("c-wp-2", "workplace", "recognition", "understanding", "Complete: Please ______ the customer after you send the file.", "follow up", {
    stem: "Please ______ the customer after you send the file.",
    accepted: ["follow up", "follow-up", "followup"],
  }),
  item("c-pr-1", "professional", "recognition", "understanding", "Complete: We should ______ the approval process before we automate it.", "streamline", {
    senseId: "s-streamline",
    stem: "We should ______ the approval process before we automate it.",
    accepted: ["streamline"],
  }),
  item("c-pr-2", "professional", "recognition", "understanding", "Complete: Tell every ______ before we change the launch date.", "stakeholder", {
    senseId: "s-stakeholder",
    stem: "Tell every ______ before we change the launch date.",
    accepted: ["stakeholder"],
  }),
  item("c-sp-1", "specialist", "recognition", "understanding", "Complete: High ______ makes the app feel slow.", "latency", {
    stem: "High ______ makes the app feel slow.",
    accepted: ["latency"],
  }),
  item("c-sp-2", "specialist", "recognition", "understanding", "Complete: The team will ______ the equipment cost over five years.", "amortise", {
    stem: "The team will ______ the equipment cost over five years.",
    accepted: ["amortise", "amortize"],
  }),
  item("p-ev-1", "everyday", "production", "use", "Traditional Chinese cue: 退款；把錢退回顧客", "refund", {
    senseId: "s-refund",
    accepted: ["refund"],
  }),
  item("p-ev-2", "everyday", "production", "use", "Complete: I booked an ______ with the supplier at 3 pm.", "appointment", {
    stem: "I booked an ______ with the supplier at 3 pm.",
    accepted: ["appointment"],
  }),
  item("p-ev-3", "everyday", "production", "use", "Traditional Chinese cue: 收據；付款紀錄", "receipt", {
    senseId: "s-receipt",
    accepted: ["receipt"],
  }),
  item("p-ev-4", "everyday", "production", "use", "Complete: Can you ______ that the stock has arrived?", "confirm", {
    senseId: "s-confirm",
    stem: "Can you ______ that the stock has arrived?",
    accepted: ["confirm"],
  }),
  item("p-wp-1", "workplace", "production", "use", "Traditional Chinese cue: 截止日期；最後完成期限", "deadline", {
    senseId: "s-deadline",
    accepted: ["deadline"],
  }),
  item("p-wp-2", "workplace", "production", "use", "Traditional Chinese cue: 發票；列明應付款項的帳單", "invoice", {
    senseId: "s-invoice",
    accepted: ["invoice"],
  }),
  item("p-wp-3", "workplace", "production", "use", "Complete: Do a proper ______ before the night shift starts.", "handover", {
    senseId: "s-handover",
    stem: "Do a proper ______ before the night shift starts.",
    accepted: ["handover", "hand over", "hand-over"],
  }),
  item("p-wp-4", "workplace", "production", "use", "Traditional Chinese cue: 批准；正式同意進行", "approve", {
    accepted: ["approve"],
  }),
  item("p-pr-1", "professional", "production", "use", "Traditional Chinese cue: 精簡流程，去掉多餘步驟", "streamline", {
    senseId: "s-streamline",
    accepted: ["streamline"],
  }),
  item("p-pr-2", "professional", "production", "use", "Complete: If this complaint is serious, ______ it to the manager.", "escalate", {
    stem: "If this complaint is serious, ______ it to the manager.",
    accepted: ["escalate"],
  }),
  item("p-pr-3", "professional", "production", "use", "Traditional Chinese cue: 減低風險或損害", "mitigate", {
    senseId: "s-mitigate",
    accepted: ["mitigate"],
  }),
  item("p-pr-4", "professional", "production", "use", "Complete: Stay inside the ______ of this phase; extra features wait.", "scope", {
    stem: "Stay inside the ______ of this phase; extra features wait.",
    accepted: ["scope"],
  }),
  item("p-sp-1", "specialist", "production", "use", "Traditional Chinese cue: 系統回應前的延遲", "latency", {
    accepted: ["latency"],
  }),
  item("p-sp-2", "specialist", "production", "use", "Complete: The payment API should be ______ so a retry does not charge twice.", "idempotent", {
    stem: "The payment API should be ______ so a retry does not charge twice.",
    accepted: ["idempotent"],
  }),
  item("p-sp-3", "specialist", "production", "use", "Traditional Chinese cue: 在時限內系統能處理的數量", "throughput", {
    accepted: ["throughput"],
  }),
  item("p-sp-4", "specialist", "production", "use", "Complete: The accountant will ______ the fit-out cost over several years.", "amortise", {
    stem: "The accountant will ______ the fit-out cost over several years.",
    accepted: ["amortise", "amortize"],
  }),
  item("x-wp-1", "workplace", "recognition", "understanding", "schedule", "A plan of times for work or meetings", {
    options: [
      "A plan of times for work or meetings",
      "A broken till drawer",
      "A secret staff password",
      "A box of spare hangers",
    ],
  }),
  item("x-pr-1", "professional", "recognition", "understanding", "accountable", "Responsible for a result and expected to explain it", {
    options: [
      "Responsible for a result and expected to explain it",
      "Free to ignore the result",
      "Only in charge of decorations",
      "Unrelated to the project",
    ],
  }),
  item("x-pr-2", "professional", "production", "use", "Complete: Name one ______ who can block this decision.", "stakeholder", {
    senseId: "s-stakeholder",
    stem: "Name one ______ who can block this decision.",
    accepted: ["stakeholder"],
  }),
  item("x-sp-1", "specialist", "recognition", "understanding", "heuristic", "A practical shortcut for deciding when a perfect rule is too slow", {
    options: [
      "A practical shortcut for deciding when a perfect rule is too slow",
      "A legally binding contract clause",
      "A type of shop lighting",
      "A staff uniform colour",
    ],
  }),
  item("x-ev-1", "everyday", "production", "use", "Complete: The customer is waiting in the ______.", "queue", {
    senseId: "s-queue",
    stem: "The customer is waiting in the ______.",
    accepted: ["queue", "line"],
  }),
];

export function itemsById(): Map<string, AssessmentItem> {
  return new Map(ASSESSMENT_ITEMS.map((entry) => [entry.id, entry]));
}
