"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-2xl font-bold text-slate-100">Something went wrong</p>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        {error.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="btn-gold mt-6">
        Try again
      </button>
    </div>
  );
}
