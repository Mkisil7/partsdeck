"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

const NO_CHROME = ["/login"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = NO_CHROME.some((p) => pathname.startsWith(p));

  if (hideChrome) return <>{children}</>;

  return (
    <>
      <div className="mx-auto min-h-screen w-full max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 md:max-w-3xl lg:max-w-4xl">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
