"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { UsageView } from "./UsageView";
import { OnHandView } from "./OnHandView";
import type { UsagePart, ReceivedPart } from "@/lib/queries";
import type { PartMinLevel } from "@/lib/types";

type Tab = "onhand" | "used";

export function InventoryTabs({
  used,
  received,
  minLevels,
}: {
  used: UsagePart[];
  received: ReceivedPart[];
  minLevels: PartMinLevel[];
}) {
  const [tab, setTab] = useState<Tab>("onhand");

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-navy-700/60 p-1">
        <TabButton active={tab === "onhand"} onClick={() => setTab("onhand")}>
          On hand
        </TabButton>
        <TabButton active={tab === "used"} onClick={() => setTab("used")}>
          Used
        </TabButton>
      </div>

      {tab === "onhand" ? (
        <OnHandView used={used} received={received} minLevels={minLevels} />
      ) : (
        <UsageView parts={used} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg py-2 text-sm font-semibold transition",
        active ? "bg-gold text-navy shadow-gold" : "text-slate-400 hover:text-slate-200",
      )}
    >
      {children}
    </button>
  );
}
