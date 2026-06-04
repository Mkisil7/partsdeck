"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-slate-500">From</span>
            <input
              type="date"
              className="input py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-slate-500">To</span>
            <input
              type="date"
              className="input py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          {(from || to || query) && (
            <button
              type="button"
              className="mt-5 shrink-0 rounded-xl border border-navy-600 px-3 py-2 text-sm text-slate-400"
              onClick={() => {
                setQuery("");
                setFrom("");
                setTo("");
              }}
            >
              Clear
            </button>
          )}
        </div>
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
                    <StatusBadge status={job.status} />
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
