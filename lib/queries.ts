// Server-side data access. All reads/writes go through the RLS-scoped server
// client, so results are automatically limited to the signed-in user.
import { createSupabaseServerClient } from "./supabase";
import type {
  Job,
  JobWithParts,
  JobWithPartsCount,
  Part,
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

/** All parts across the user's OPEN jobs — used by the inventory aggregate. */
export async function getOpenJobParts(): Promise<Part[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("status, parts(*)")
    .eq("status", "open");
  if (error) throw new Error(error.message);

  const parts: Part[] = [];
  for (const job of (data ?? []) as any[]) {
    for (const part of job.parts ?? []) parts.push(part as Part);
  }
  return parts;
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
