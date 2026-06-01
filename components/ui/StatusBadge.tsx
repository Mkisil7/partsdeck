import { cn } from "@/lib/utils";
import type { JobStatus, TransferStatus } from "@/lib/types";

const JOB_STYLES: Record<JobStatus, string> = {
  open: "border-gold/40 bg-gold/15 text-gold-400",
  completed: "border-green-500/40 bg-green-500/15 text-green-300",
  transferred: "border-blue-500/40 bg-blue-500/15 text-blue-300",
};

const TRANSFER_STYLES: Record<TransferStatus, string> = {
  pending: "border-gold/40 bg-gold/15 text-gold-400",
  sent: "border-blue-500/40 bg-blue-500/15 text-blue-300",
  fulfilled: "border-green-500/40 bg-green-500/15 text-green-300",
};

export function StatusBadge({
  status,
  kind = "job",
}: {
  status: JobStatus | TransferStatus;
  kind?: "job" | "transfer";
}) {
  const style =
    kind === "job"
      ? JOB_STYLES[status as JobStatus]
      : TRANSFER_STYLES[status as TransferStatus];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
        style,
      )}
    >
      {status}
    </span>
  );
}
