// Master-catalog helpers: enrich parsed parts (fill missing SKU/name) and
// dedupe parts within a single job. Server-side (takes a Supabase client).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MasterPart, ParsedPart, PartCategory } from "./types";

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/**
 * Fill in a missing part_name from a known SKU (and vice-versa) using the
 * shared master catalog. Also backfills category/unit when the part lacks them.
 */
export async function enrichParsedParts(
  supabase: SupabaseClient,
  parts: ParsedPart[],
): Promise<ParsedPart[]> {
  if (parts.length === 0) return parts;

  const { data } = await supabase
    .from("master_parts")
    .select("sku, part_name, category, unit");
  const catalog = (data ?? []) as Pick<
    MasterPart,
    "sku" | "part_name" | "category" | "unit"
  >[];
  if (catalog.length === 0) return parts;

  const bySku = new Map<string, (typeof catalog)[number]>();
  const byName = new Map<string, (typeof catalog)[number]>();
  for (const entry of catalog) {
    if (entry.sku) bySku.set(norm(entry.sku), entry);
    byName.set(norm(entry.part_name), entry);
  }

  return parts.map((part) => {
    const hasSku = !!part.part_number?.trim();
    const hasName = !!part.part_name?.trim();
    let match: (typeof catalog)[number] | undefined;

    if (hasSku) match = bySku.get(norm(part.part_number));
    // If the "name" is actually a SKU the model misfiled, also try SKU lookup.
    if (!match && hasName) match = byName.get(norm(part.part_name));
    if (!match && hasName) match = bySku.get(norm(part.part_name));
    if (!match) return part;

    // A catalog match is authoritative: the SKU and name are locked to the
    // catalog entry so e.g. "SIXCTA" always becomes its canonical name and
    // nothing stray is left in either field.
    return {
      ...part,
      part_number: match.sku ?? part.part_number,
      part_name: match.part_name,
      category: part.category ?? match.category,
      unit: part.unit ?? match.unit,
    };
  });
}

/**
 * Drop parsed lines that are on the shared ignore list (fees, permits, signs,
 * etc.). A line is removed when its SKU or its name matches an ignored entry.
 * Run this AFTER enrichParsedParts so a line missing one field can still be
 * matched on the other.
 */
export async function filterIgnoredParts(
  supabase: SupabaseClient,
  parts: ParsedPart[],
): Promise<ParsedPart[]> {
  if (parts.length === 0) return parts;

  const { data } = await supabase.from("ignored_items").select("sku, part_name");
  const items = (data ?? []) as { sku: string | null; part_name: string | null }[];
  if (items.length === 0) return parts;

  const skus = new Set<string>();
  const names = new Set<string>();
  for (const item of items) {
    if (item.sku) skus.add(norm(item.sku));
    if (item.part_name) names.add(norm(item.part_name));
  }

  return parts.filter((part) => {
    const sku = norm(part.part_number);
    const name = norm(part.part_name);
    if (sku && skus.has(sku)) return false;
    if (name && names.has(name)) return false;
    return true;
  });
}

/** A merge key: prefer SKU, fall back to lowercased name. */
export function partKey(p: {
  part_number?: string | null;
  part_name?: string | null;
}): string {
  const sku = norm(p.part_number);
  return sku ? `sku:${sku}` : `name:${norm(p.part_name)}`;
}

// ---------------------------------------------------------------------------
// Client-side catalog lookups (no Supabase): used by the part entry form to
// keep SKU and name locked together as the user types.
// ---------------------------------------------------------------------------

export interface CatalogEntry {
  sku: string | null;
  part_name: string;
  unit: string;
  category: PartCategory | null;
}

export interface CatalogIndex {
  bySku: Map<string, CatalogEntry>;
  byName: Map<string, CatalogEntry>;
}

export function buildCatalogIndex(entries: CatalogEntry[]): CatalogIndex {
  const bySku = new Map<string, CatalogEntry>();
  const byName = new Map<string, CatalogEntry>();
  for (const e of entries) {
    if (e.sku) bySku.set(norm(e.sku), e);
    byName.set(norm(e.part_name), e);
  }
  return { bySku, byName };
}

export function lookupBySku(
  index: CatalogIndex,
  sku: string | null | undefined,
): CatalogEntry | undefined {
  const key = norm(sku);
  return key ? index.bySku.get(key) : undefined;
}

export function lookupByName(
  index: CatalogIndex,
  name: string | null | undefined,
): CatalogEntry | undefined {
  const key = norm(name);
  if (!key) return undefined;
  // A value typed into the name box might actually be a SKU — try both.
  return index.byName.get(key) ?? index.bySku.get(key);
}
