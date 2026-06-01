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
