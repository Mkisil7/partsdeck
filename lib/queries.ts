// Server-side data access. All reads/writes go through the RLS-scoped server
// client, so results are automatically limited to the signed-in user.
import { createSupabaseServerClient } from "./supabase";
import type {
  IgnoredItem,
  InventoryReceipt,
  Job,
  JobWithParts,
  JobWithPartsCount,
  LineItem,
  MasterPart,
  Part,
  PartMinLevel,
  StockCount,
  Transfer,
  UserSettings,
} from "./types";

export async function getJobsWithCounts(): Promise<JobWithPartsCount[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*, parts(count)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const { parts, ...job } = row;
    const parts_count = Array.isArray(parts) ? parts[0]?.count ?? 0 : 0;
    return { ...(job as Job), parts_count };
  });
}

export async function getJobWithParts(id: string): Promise<JobWithParts | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*, parts(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { parts, ...job } = data as Job & { parts: Part[] };
  const sortedParts = [...(parts ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  return { ...(job as Job), parts: sortedParts };
}

export interface DashboardStats {
  openJobs: number;
  partsTransferredThisMonth: number;
  pendingTransfers: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createSupabaseServerClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [openRes, pendingRes, transferredJobsRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("transfer_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("jobs")
      .select("id, parts(quantity)")
      .eq("status", "transferred")
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  let partsTransferredThisMonth = 0;
  for (const job of (transferredJobsRes.data ?? []) as any[]) {
    for (const part of job.parts ?? []) {
      partsTransferredThisMonth += part.quantity ?? 0;
    }
  }

  return {
    openJobs: openRes.count ?? 0,
    pendingTransfers: pendingRes.count ?? 0,
    partsTransferredThisMonth,
  };
}

/** A part pulled off a truck, tagged with the job date it was used on. */
export interface UsagePart extends Part {
  job_date: string; // YYYY-MM-DD from the parent job
}

/** Every part across ALL completed jobs, each tagged with its job's date. Drives the
 *  usage tracker (parts coming off inventory, windowed by week/month). */
export async function getUsageParts(): Promise<UsagePart[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("job_date, parts(*)");
  if (error) throw new Error(error.message);

  const out: UsagePart[] = [];
  for (const job of (data ?? []) as any[]) {
    for (const part of job.parts ?? []) {
      out.push({ ...(part as Part), job_date: job.job_date });
    }
  }
  return out;
}

/** A received line item, tagged with the date it was received. */
export interface ReceivedPart extends LineItem {
  received_date: string;
}

/** Every received line item across all inventory receipts (additive ledger). */
export async function getReceivedParts(): Promise<ReceivedPart[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_receipts")
    .select("received_date, items");
  if (error) throw new Error(error.message);

  const out: ReceivedPart[] = [];
  for (const receipt of (data ?? []) as any[]) {
    for (const item of (receipt.items ?? []) as LineItem[]) {
      out.push({ ...item, received_date: receipt.received_date });
    }
  }
  return out;
}

export async function getInventoryReceipts(): Promise<InventoryReceipt[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_receipts")
    .select("*")
    .order("received_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryReceipt[];
}

export async function getTransfers(): Promise<Transfer[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Transfer[];
}

export async function getMasterParts(): Promise<MasterPart[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("master_parts")
    .select("*")
    .order("part_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MasterPart[];
}

export async function getStockCounts(): Promise<StockCount[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stock_counts")
    .select("*")
    .order("part_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as StockCount[];
}

export async function getPartMinLevels(): Promise<PartMinLevel[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("part_min_levels")
    .select("*")
    .order("part_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PartMinLevel[];
}

export async function getIgnoredItems(): Promise<IgnoredItem[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ignored_items")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as IgnoredItem[];
}

export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as UserSettings) ?? null;
}
