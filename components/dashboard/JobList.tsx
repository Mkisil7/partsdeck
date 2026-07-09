"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

export interface DashboardJob {
  id: string;
  job_number: string;
  customer_name: string;
  job_date: string;
  status: JobStatus;
  technician_name: string | null;
  truck_id: string | null;
  parts_count: number;
  part_terms: string; // pre-lowercased part names + numbers for search
}

export function JobList({ jobs }: { jobs: DashboardJob[] }) {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showDates, setShowDates] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (from && job.job_date < from) return false;
      if (to && job.job_date > to) return false;
      if (!q) return true;
      return (
        job.job_number.toLowerCase().includes(q) ||
        job.customer_name.toLowerCase().includes(q) ||
        job.part_terms.includes(q)
      );
    });
  }, [jobs, query, from, to]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          type="search"
          inputMode="search"
          placeholder="Search job #, customer, or part…"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDates((s) => !s)}
            className={
              from || to
                ? "flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold-400"
                : "flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-navy-600 bg-navy-700/40 px-4 py-2.5 text-sm text-slate-400"
            }
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {from || to
                ? `${from ? formatDate(from) : "…"} → ${to ? formatDate(to) : "…"}`
                : "All dates"}
            </span>
          </button>
          {(from || to || query) && (
            <button
              type="button"
              className="shrink-0 rounded-xl border border-navy-600 px-3 py-2.5 text-sm text-slate-400"
              onClick={() => {
                setQuery("");
                setFrom("");
                setTo("");
                setShowDates(false);
              }}
            >
              Clear
            </button>
          )}
        </div>

        {showDates && (
          <div className="space-y-2 rounded-xl border border-navy-600 bg-navy-800/60 p-3 animate-fade-in">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">From</span>
              <input
                type="date"
                className="input py-2"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">To</span>
              <input
                type="date"
                className="input py-2"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => setShowDates(false)}
              className="btn-ghost w-full py-2 text-sm"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">
          No jobs match your filters.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filtered.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="card flex h-full items-center justify-between gap-3 transition hover:border-gold/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">
                      #{job.job_number}
                    </span>
                  </div>
                  <p className="truncate text-sm text-slate-300">
                    {job.customer_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(job.job_date)} · {job.parts_count}{" "}
                    {job.parts_count === 1 ? "part" : "parts"}
                    {job.truck_id ? ` · Truck ${job.truck_id}` : ""}
                  </p>
                </div>
                <span className="text-slate-600">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}
