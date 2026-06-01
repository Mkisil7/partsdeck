// Anthropic client + job-sheet parsing helpers (image OCR + speech text).
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedJob, ParsedPart, PartCategory } from "./types";

export const PARSE_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  }
  return client;
}

const SYSTEM_PROMPT = `You are parsing a handwritten or printed truck-parts job sheet.

Extract the following:
- job number
- customer name
- date
- technician name (if present)
- truck ID (if present)
- a list of parts

Each part has BOTH a name and a SKU / part number. On a sheet a part may be
written as ONLY a SKU (e.g. "BR-4471", "DEF-2.5L"), ONLY a name (e.g. "brake
pads", "alternator"), or both. You must decide which is which:
- A SKU / part number is an alphanumeric code, often with dashes, slashes or
  digits (e.g. "AC-Delco 15-5832", "12V-200A", "5W30-1QT"). Put it in
  "part_number".
- A human-readable description (e.g. "brake pads", "engine oil") goes in
  "part_name".
- If only a SKU is given, put it in "part_number" and ALSO copy a best-guess
  readable label into "part_name" (or the SKU itself if no name can be
  inferred). "part_name" must never be null.
- If only a name is given, leave "part_number" null.

Also infer a "category" for each part, one of exactly:
electrical, mechanical, hardware, fluids, other.

Return ONLY a JSON object (no markdown, no commentary) with keys:
{
  "job_number": string|null,
  "customer_name": string|null,
  "job_date": "YYYY-MM-DD"|null,
  "technician_name": string|null,
  "truck_id": string|null,
  "parts": [
    {
      "part_number": string|null,
      "part_name": string,
      "quantity": number|null,
      "unit": string|null,
      "category": "electrical"|"mechanical"|"hardware"|"fluids"|"other"|null,
      "notes": string|null
    }
  ]
}
If a field is not found, return null for that field (except part_name).`;

const VALID_CATEGORIES: PartCategory[] = [
  "electrical",
  "mechanical",
  "hardware",
  "fluids",
  "other",
];

function coerceCategory(value: unknown): PartCategory | null {
  if (typeof value === "string" && VALID_CATEGORIES.includes(value as PartCategory)) {
    return value as PartCategory;
  }
  return null;
}

function coercePart(raw: Record<string, unknown>): ParsedPart {
  const name =
    typeof raw.part_name === "string" && raw.part_name.trim()
      ? raw.part_name.trim()
      : typeof raw.part_number === "string" && raw.part_number.trim()
        ? raw.part_number.trim()
        : "Unknown part";
  let quantity: number | null = null;
  if (typeof raw.quantity === "number") quantity = raw.quantity;
  else if (typeof raw.quantity === "string" && raw.quantity.trim()) {
    const n = parseInt(raw.quantity, 10);
    quantity = Number.isNaN(n) ? null : n;
  }
  return {
    part_number:
      typeof raw.part_number === "string" && raw.part_number.trim()
        ? raw.part_number.trim()
        : null,
    part_name: name,
    quantity,
    unit: typeof raw.unit === "string" && raw.unit.trim() ? raw.unit.trim() : null,
    category: coerceCategory(raw.category),
    notes: typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : null,
  };
}

/** Normalize an arbitrary model response into a strict ParsedJob. */
function normalizeParsedJob(raw: Record<string, unknown>): ParsedJob {
  const partsRaw = Array.isArray(raw.parts) ? raw.parts : [];
  return {
    job_number: typeof raw.job_number === "string" ? raw.job_number : null,
    customer_name: typeof raw.customer_name === "string" ? raw.customer_name : null,
    job_date: typeof raw.job_date === "string" ? raw.job_date : null,
    technician_name:
      typeof raw.technician_name === "string" ? raw.technician_name : null,
    truck_id: typeof raw.truck_id === "string" ? raw.truck_id : null,
    parts: partsRaw
      .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
      .map(coercePart),
  };
}

/** Extract the first JSON object found in a text blob. */
function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function textFromResponse(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/** Parse a job sheet image (base64, no data: prefix). */
export async function parseImage(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg",
): Promise<ParsedJob> {
  const message = await getClient().messages.create({
    model: PARSE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: "Parse this job sheet into the JSON schema." },
        ],
      },
    ],
  });
  return normalizeParsedJob(extractJson(textFromResponse(message)));
}

/** Parse spoken/typed free text into the same structured job shape. */
export async function parseSpeech(transcript: string): Promise<ParsedJob> {
  const message = await getClient().messages.create({
    model: PARSE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Parse this spoken job description into the JSON schema:\n\n"${transcript}"`,
      },
    ],
  });
  return normalizeParsedJob(extractJson(textFromResponse(message)));
}
