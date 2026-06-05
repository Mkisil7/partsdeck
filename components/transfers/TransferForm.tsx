"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { PartSearchInput } from "@/components/parts/PartSearchInput";
import type { CatalogEntry } from "@/lib/master";
import type { LineItem, Transfer } from "@/lib/types";

interface Defaults {
  sender_name: string | null;
}

function buildMessage(items: LineItem[], recipient: string, sender: string) {
  const lines = items
    .map(
      (i) =>
        `- ${i.quantity}x ${i.part_number ? `${i.part_number} — ` : ""}${i.part_name}`,
    )
    .join("\n");
  return `Hello team,

Please transfer the following${recipient ? ` to ${recipient}` : ""}:
${lines}

Thank you,
${sender || ""}`.trim();
}

export function TransferForm({
  catalog,
  history,
  defaults,
}: {
  catalog: CatalogEntry[];
  history: Transfer[];
  defaults: Defaults;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [busy, setBusy] = useState(false);

  function addItem(entry: CatalogEntry) {
    setItems((prev) => {
      // Bump quantity if the same part is already in the list.
      const key = (entry.sku || entry.part_name).toLowerCase();
      const idx = prev.findIndex(
        (i) => (i.part_number || i.part_name).toLowerCase() === key,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          part_number: entry.sku,
          part_name: entry.part_name,
          quantity: 1,
          unit: entry.unit || "each",
        },
      ];
    });
  }

  function setQty(idx: number, qty: number) {
    setItems((prev) =>
      prev.map((i, n) => (n === idx ? { ...i, quantity: Math.max(1, qty) } : i)),
    );
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, n) => n !== idx));
  }

  async function sendTransfer() {
    if (!recipientName.trim()) return toast("Who are you transferring to?", "error");
    if (items.length === 0) return toast("Add at least one part", "error");

    setBusy(true);
    const message = buildMessage(items, recipientName.trim(), defaults.sender_name ?? "");

    try {
      // Log the transfer to history.
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim() || null,
          message,
          items,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save transfer");

      // Copy the message and open the mail app.
      try {
        await navigator.clipboard.writeText(message);
      } catch {
        /* clipboard may be blocked; the mailto still carries the body */
      }
      const subject = `Parts transfer${recipientName ? ` to ${recipientName.trim()}` : ""}`;
      const mailto = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailto;

      toast("Transfer logged & message copied", "success");
      setItems([]);
      setRecipientName("");
      setRecipientEmail("");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send transfer", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Recipient */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Transfer to
          </h2>
          <label className="block">
            <span className="label">Name</span>
            <input
              className="input"
              placeholder="e.g. Mike Johnson"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">Email (optional)</span>
            <input
              className="input"
              type="email"
              inputMode="email"
              placeholder="autofills once they sign up"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </label>
        </div>

        {/* Parts */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Parts
          </h2>
          <PartSearchInput catalog={catalog} onPick={addItem} />

          {items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li
                  key={`${item.part_number}-${item.part_name}-${i}`}
                  className="card flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100">
                      {item.part_name}
                    </p>
                    {item.part_number && (
                      <p className="font-mono text-xs text-slate-500">
                        {item.part_number}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      className="input w-16 py-1.5 text-center"
                      value={item.quantity}
                      onChange={(e) =>
                        setQty(i, parseInt(e.target.value, 10) || 1)
                      }
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
              Search for parts above to add them to the transfer.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={sendTransfer}
          disabled={busy}
          className="btn-gold w-full text-lg shadow-gold"
        >
          {busy ? "Sending…" : "Open in Mail"}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Transfer history
          </h2>
          <ul className="space-y-2">
            {history.map((t) => (
              <li key={t.id} className="card py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-100">
                    {t.recipient_name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {t.items.reduce((sum, i) => sum + i.quantity, 0)} units ·{" "}
                  {t.items.length} part{t.items.length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {t.items.map((i) => `${i.quantity}× ${i.part_name}`).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
