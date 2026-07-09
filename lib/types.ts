// Shared TypeScript types for PartsDeck tables and parsed payloads.

export type JobStatus = "open" | "completed" | "transferred";

export type PartCategory =
  | "electrical"
  | "mechanical"
  | "hardware"
  | "fluids"
  | "other";

export type TransferStatus = "pending" | "sent" | "fulfilled";

export interface Job {
  id: string;
  user_id: string;
  job_number: string;
  customer_name: string;
  job_date: string; // YYYY-MM-DD
  technician_name: string | null;
  truck_id: string | null;
  notes: string | null;
  status: JobStatus;
  image_url: string | null;
  parsed_data: ParsedJob | null;
  created_at: string;
}

export interface Part {
  id: string;
  job_id: string;
  part_number: string | null;
  part_name: string;
  quantity: number;
  unit: string;
  category: PartCategory | null;
  notes: string | null;
  created_at: string;
}

export interface TransferRequest {
  id: string;
  job_id: string;
  requested_by: string | null;
  warehouse_email: string;
  sent_at: string | null;
  status: TransferStatus;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  warehouse_email: string | null;
  technician_name: string | null;
  truck_id: string | null;
  updated_at: string;
}

export interface MasterPart {
  id: string;
  sku: string | null;
  part_name: string;
  category: PartCategory | null;
  unit: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IgnoredItem {
  id: string;
  sku: string | null;
  part_name: string | null;
  created_by: string | null;
  created_at: string;
}

// A persisted physical count for one part — "what I actually have", vs the
// ledger (received - used) which is what the company thinks.
export interface StockCount {
  id: string;
  user_id: string;
  part_key: string;
  sku: string | null;
  part_name: string;
  counted_qty: number;
  counted_at: string;
}

// Manual override of what the company thinks the tech has for one part.
// When present it replaces the derived ledger figure (received - used).
export interface CompanyCount {
  id: string;
  user_id: string;
  part_key: string;
  sku: string | null;
  part_name: string;
  company_qty: number;
  set_at: string;
}

// A per-user minimum stock level. When on-hand drops below min_quantity the
// part is flagged as low stock.
export interface PartMinLevel {
  id: string;
  user_id: string;
  part_key: string;
  sku: string | null;
  part_name: string;
  min_quantity: number;
  created_at: string;
  updated_at: string;
}

// A line item inside a transfer or an inventory receipt.
export interface LineItem {
  part_number: string | null;
  part_name: string;
  quantity: number;
  unit: string;
}

export interface Transfer {
  id: string;
  user_id: string;
  recipient_name: string;
  recipient_email: string | null;
  message: string | null;
  items: LineItem[];
  created_at: string;
}

export interface InventoryReceipt {
  id: string;
  user_id: string;
  received_date: string; // YYYY-MM-DD
  image_url: string | null;
  items: LineItem[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Composite / view types
// ---------------------------------------------------------------------------

export interface JobWithParts extends Job {
  parts: Part[];
}

export interface JobWithPartsCount extends Job {
  parts_count: number;
}

// ---------------------------------------------------------------------------
// AI parsing payloads (shared by image + speech parsers and intake form)
// ---------------------------------------------------------------------------

export interface ParsedPart {
  part_number: string | null;
  part_name: string | null;
  quantity: number | null;
  unit: string | null;
  category: PartCategory | null;
  notes: string | null;
}

export interface ParsedJob {
  job_number: string | null;
  customer_name: string | null;
  job_date: string | null; // YYYY-MM-DD
  technician_name: string | null;
  truck_id: string | null;
  parts: ParsedPart[];
}

// Form-side draft shapes (everything editable as strings before save)
export interface PartDraft {
  part_number: string;
  part_name: string;
  quantity: string;
  unit: string;
  category: PartCategory | "";
  notes: string;
}

export interface JobDraft {
  job_number: string;
  customer_name: string;
  job_date: string;
  technician_name: string;
  truck_id: string;
  notes: string;
  parts: PartDraft[];
}

export const PART_CATEGORIES: PartCategory[] = [
  "electrical",
  "mechanical",
  "hardware",
  "fluids",
  "other",
];
