import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-5xl font-black text-gold-400">404</p>
      <p className="mt-2 text-slate-300">We couldn’t find that page.</p>
      <Link href="/dashboard" className="btn-gold mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
