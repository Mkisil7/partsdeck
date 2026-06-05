"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { PartSearchInput } from "@/components/parts/PartSearchInput";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { todayIso } from "@/lib/utils";
import type { CatalogEntry } from "@/lib/master";
import type { InventoryReceipt, LineItem, ParsedJob } from "@/lib/types";

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        base64: result.replace(/^data:[^;]+;base64,/, ""),
        mediaType: file.type || "image/jpeg",
      });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ReceiveForm({
  catalog,
  history,
}: {
  catalog: CatalogEntry[];
  history: InventoryReceipt[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [receivedDate, setReceivedDate] = useState(todayIso());
  const [items, setItems] = useState<LineItem[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "image" | "save">(null);

  async function handlePhoto(file: File) {
    setBusy("image");
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/receipt-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("job-images")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (!upErr) {
          const { data } = supabase.storage.from("job-images").getPublicUrl(path);
          setImageUrl(data.publicUrl);
        }
      }

      const { base64, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/parse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Parse failed");

      const parsed = json.parsed as ParsedJob;
      const parsedItems: LineItem[] = parsed.parts.map((p) => ({
        part_number: p.part_number,
        part_name: p.part_name || p.part_number || "Unknown part",
        quantity: p.quantity != null && p.quantity > 0 ? p.quantity : 1,
        unit: p.unit || "each",
      }));
      setItems((prev) => [...prev, ...parsedItems]);
      if (parsed.job_date) setReceivedDate(parsed.job_date);
      toast(`Found ${parsedItems.length} parts — review below`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not read sheet", "error");
    } finally {
      setBusy(null);
    }
  }

  function addItem(entry: CatalogEntry) {
    setItems((prev) => [
      ...prev,
      {
        part_number: entry.sku,
        part_name: entry.part_name,
        quantity: 1,
        unit: entry.unit || "each",
      },
    ]);
  }
  function setQty(idx: number, qty: number) {
    setItems((prev) =>
      prev.map((i, n) => (n === idx ? { ...i, quantity: Math.max(1, qty) } : i)),
    );
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, n) => n !== idx));
  }

  async function save() {
    if (!receivedDate) return toast("Pick a received date", "error");
    if (items.length === 0) return toast("Add at least one received part", "error");
    setBusy("save");
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          received_date: receivedDate,
          image_url: imageUrl,
          items,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast("Inventory received", "success");
      setItems([]);
      setImageUrl(null);
      setPreviewUrl(null);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Capture */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy !== null}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold/30 bg-gold/5 py-8 font-semibold text-gold-400 transition hover:border-gold/60 active:scale-[0.99] disabled:opacity-60"
      >
        <CameraIcon className="h-9 w-9" />
        {busy === "image" ? "Reading sheet…" : "Snap transfer sheet"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhoto(file);
          e.target.value = "";
        }}
      />

      {previewUrl && (
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-navy-600">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Transfer sheet" className="h-full w-full object-cover" />
        </div>
      )}

      <label className="block">
        <span className="label">Received date</span>
        <input
          type="date"
          className="input"
          value={receivedDate}
          onChange={(e) => setReceivedDate(e.target.value)}
        />
      </label>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Received parts
        </h2>
        <PartSearchInput catalog={catalog} onPick={addItem} placeholder="Add a part manually…" />

        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li
                key={`${item.part_number}-${item.part_name}-${i}`}
                className="card flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-100">{item.part_name}</p>
                  {item.part_number && (
                    <p className="font-mono text-xs text-slate-500">{item.part_number}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    className="input w-16 py-1.5 text-center"
                    value={item.quantity}
                    onChange={(e) => setQty(i, parseInt(e.target.value, 10) || 1)}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-xs text-red-300 hover:text-red-200"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            Snap a transfer sheet or add parts manually.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={busy !== null}
        className="btn-gold w-full text-lg shadow-gold"
      >
        {busy === "save" ? "Saving…" : "Save to inventory"}
      </button>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent receipts
          </h2>
          <ul className="space-y-2">
            {history.map((r) => (
              <li key={r.id} className="card py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-100">
                    {new Date(r.received_date).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-slate-500">
                    {r.items.reduce((s, i) => s + i.quantity, 0)} units ·{" "}
                    {r.items.length} part{r.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {r.items.map((i) => `${i.quantity}× ${i.part_name}`).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
