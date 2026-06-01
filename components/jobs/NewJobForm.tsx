"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { PartRows } from "./PartRows";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { emptyJobDraft, parsedToDraft } from "@/lib/draft";
import type { JobDraft, ParsedJob } from "@/lib/types";

interface Defaults {
  technician_name: string | null;
  truck_id: string | null;
}

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.replace(/^data:[^;]+;base64,/, "");
      resolve({ base64, mediaType: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function NewJobForm({ defaults }: { defaults: Defaults }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<JobDraft>(() => emptyJobDraft(defaults));
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedJob | null>(null);

  const [busy, setBusy] = useState<null | "image" | "speech" | "save">(null);
  const [showSpeech, setShowSpeech] = useState(false);

  const speech = useSpeechRecognition();

  function patch(p: Partial<JobDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  // -- Photo flow ----------------------------------------------------------
  async function handlePhoto(file: File) {
    setBusy("image");
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Upload raw image to storage (best-effort; parsing continues regardless).
      if (user) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("job-images")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (!upErr) {
          const { data } = supabase.storage.from("job-images").getPublicUrl(path);
          setImageUrl(data.publicUrl);
        } else {
          toast("Image upload failed, parsing anyway", "info");
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
      setParsedData(parsed);
      setDraft(parsedToDraft(parsed, defaults));
      toast("Job sheet parsed — review below", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not parse image", "error");
    } finally {
      setBusy(null);
    }
  }

  // -- Speech flow ---------------------------------------------------------
  async function parseTranscript() {
    const transcript = speech.transcript.trim();
    if (!transcript) {
      toast("Nothing was recorded", "error");
      return;
    }
    setBusy("speech");
    try {
      const res = await fetch("/api/parse-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Parse failed");
      const parsed = json.parsed as ParsedJob;
      setParsedData(parsed);
      setDraft(parsedToDraft(parsed, defaults));
      setShowSpeech(false);
      toast("Parsed — review below", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not parse speech", "error");
    } finally {
      setBusy(null);
    }
  }

  // -- Save ----------------------------------------------------------------
  async function save() {
    if (!draft.job_number.trim()) return toast("Job number is required", "error");
    if (!draft.customer_name.trim())
      return toast("Customer name is required", "error");
    setBusy("save");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, image_url: imageUrl, parsed_data: parsedData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast("Job saved", "success");
      router.push(`/jobs/${json.id}`);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save job", "error");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Capture methods */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy !== null}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gold py-6 font-semibold text-navy shadow-gold transition active:scale-[0.98] disabled:opacity-60"
        >
          <CameraIcon className="h-9 w-9" />
          {busy === "image" ? "Reading…" : "Snap Photo"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowSpeech(true);
            speech.reset();
          }}
          disabled={busy !== null}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gold/50 bg-navy-700/60 py-6 font-semibold text-gold-400 transition active:scale-[0.98] disabled:opacity-60"
        >
          <MicIcon className="h-9 w-9" />
          Speak It
        </button>
      </div>
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
          <img
            src={previewUrl}
            alt="Job sheet preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Speech panel */}
      {showSpeech && (
        <div className="card space-y-3 animate-fade-in">
          {!speech.supported ? (
            <p className="text-sm text-red-300">
              Speech recognition isn’t supported in this browser. Try Chrome, or
              type into the form below.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">
                  {speech.listening ? "Listening…" : "Tap to record"}
                </span>
                <button
                  type="button"
                  onClick={speech.listening ? speech.stop : speech.start}
                  className={
                    speech.listening
                      ? "rounded-full bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300"
                      : "rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy"
                  }
                >
                  {speech.listening ? "Stop" : "Record"}
                </button>
              </div>
              <textarea
                className="input min-h-[80px]"
                placeholder='e.g. "Job 1042, Mike Johnson, June 1st, 3 brake pads, 1 rotor, 2 quarts oil"'
                value={speech.transcript}
                onChange={() => {
                  /* transcript is driven by recognition; editing handled below */
                }}
                readOnly
              />
              {speech.error && (
                <p className="text-xs text-red-300">{speech.error}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={parseTranscript}
                  disabled={busy === "speech" || !speech.transcript.trim()}
                  className="btn-gold flex-1"
                >
                  {busy === "speech" ? "Parsing…" : "Parse"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSpeech(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Review / confirmation form */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Review &amp; confirm
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-1">
            <span className="label">Job #</span>
            <input
              className="input"
              value={draft.job_number}
              onChange={(e) => patch({ job_number: e.target.value })}
            />
          </label>
          <label className="col-span-1">
            <span className="label">Date</span>
            <input
              type="date"
              className="input"
              value={draft.job_date}
              onChange={(e) => patch({ job_date: e.target.value })}
            />
          </label>
          <label className="col-span-2">
            <span className="label">Customer</span>
            <input
              className="input"
              value={draft.customer_name}
              onChange={(e) => patch({ customer_name: e.target.value })}
            />
          </label>
          <label className="col-span-1">
            <span className="label">Technician</span>
            <input
              className="input"
              value={draft.technician_name}
              onChange={(e) => patch({ technician_name: e.target.value })}
            />
          </label>
          <label className="col-span-1">
            <span className="label">Truck ID</span>
            <input
              className="input"
              value={draft.truck_id}
              onChange={(e) => patch({ truck_id: e.target.value })}
            />
          </label>
          <label className="col-span-2">
            <span className="label">Job notes</span>
            <textarea
              className="input min-h-[60px]"
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </label>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Parts
          </h3>
          <PartRows parts={draft.parts} onChange={(parts) => patch({ parts })} />
        </div>
      </div>

      <div className="sticky bottom-24 z-10">
        <button
          type="button"
          onClick={save}
          disabled={busy === "save"}
          className="btn-gold w-full text-lg shadow-gold"
        >
          {busy === "save" ? "Saving…" : "Save Job"}
        </button>
      </div>
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
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 19v3" />
    </svg>
  );
}
