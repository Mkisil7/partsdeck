import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { PART_CATEGORIES, type PartCategory } from "@/lib/types";

export const runtime = "nodejs";

interface ImportRow {
  sku?: string | null;
  part_name?: string | null;
  category?: string | null;
  unit?: string | null;
  notes?: string | null;
}

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

function coerceCategory(value: string | null | undefined): PartCategory | null {
  const v = norm(value);
  return PART_CATEGORIES.includes(v as PartCategory) ? (v as PartCategory) : null;
}

// Minimal CSV parser supporting quoted fields and a header row.
function parseCsv(csv: string): ImportRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const header = splitRow(lines[0]).map((h) => norm(h));
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const skuI = idx(["sku", "part number", "part_number", "part #", "part#"]);
  const nameI = idx(["name", "part name", "part_name", "description"]);
  const catI = idx(["category", "cat"]);
  const unitI = idx(["unit", "uom"]);
  const notesI = idx(["notes", "note"]);

  // If we couldn't find a name/sku header, treat the file as headerless
  // two-column "sku,name".
  const hasHeader = skuI !== -1 || nameI !== -1;
  const rows = hasHeader ? lines.slice(1) : lines;

  return rows.map((line) => {
    const cols = splitRow(line);
    if (!hasHeader) {
      return { sku: cols[0] || null, part_name: cols[1] || null };
    }
    return {
      sku: skuI !== -1 ? cols[skuI] || null : null,
      part_name: nameI !== -1 ? cols[nameI] || null : null,
      category: catI !== -1 ? cols[catI] || null : null,
      unit: unitI !== -1 ? cols[unitI] || null : null,
      notes: notesI !== -1 ? cols[notesI] || null : null,
    };
  });
}

// POST /api/master-parts/import — bulk add, skipping duplicates by SKU/name.
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: { csv?: string; rows?: ImportRow[] };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const incoming: ImportRow[] = body.rows ?? (body.csv ? parseCsv(body.csv) : []);
  if (incoming.length === 0) return jsonError("Nothing to import");

  // Existing catalog keys to skip against.
  const { data: existing } = await ctx.supabase
    .from("master_parts")
    .select("sku, part_name");
  const seenSku = new Set<string>();
  const seenName = new Set<string>();
  for (const e of (existing ?? []) as { sku: string | null; part_name: string }[]) {
    if (e.sku) seenSku.add(norm(e.sku));
    seenName.add(norm(e.part_name));
  }

  const toInsert: {
    sku: string | null;
    part_name: string;
    category: PartCategory | null;
    unit: string;
    notes: string | null;
  }[] = [];
  let skipped = 0;

  for (const row of incoming) {
    const sku = row.sku?.trim() || null;
    const name = row.part_name?.trim() || sku; // fall back to SKU as the name
    if (!name) {
      skipped++;
      continue;
    }
    const nk = norm(name);
    const sk = sku ? norm(sku) : "";
    if (seenName.has(nk) || (sk && seenSku.has(sk))) {
      skipped++;
      continue;
    }
    seenName.add(nk);
    if (sk) seenSku.add(sk);
    toInsert.push({
      sku,
      part_name: name,
      category: coerceCategory(row.category),
      unit: row.unit?.trim() || "each",
      notes: row.notes?.trim() || null,
    });
  }

  let added = 0;
  if (toInsert.length > 0) {
    const { error, count } = await ctx.supabase
      .from("master_parts")
      .insert(toInsert, { count: "exact" });
    if (error) return jsonError(error.message, 500);
    added = count ?? toInsert.length;
  }

  return NextResponse.json({ added, skipped });
}
