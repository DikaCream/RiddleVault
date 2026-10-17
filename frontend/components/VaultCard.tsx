"use client";

import Link from "next/link";
import { Dial } from "./Dial";
import { Clock, Plate, StatusLed, vaultState } from "./ui";
import type { Vault } from "@/lib/riddlevault";

export function VaultCard({ v, i = 0 }: { v: Vault; i?: number }) {
  const state = vaultState(v);
  const solved = v.status === "SOLVED";
  return (
    <Link href={`/vault/${v.id}`} className="group rise block" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }} data-testid="vault-card">
      <Plate className={`h-full p-5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_30px_-10px_rgba(211,169,74,0.25)] ${v.status === "REJECTED" ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="engraved brass rounded px-2.5 py-0.5 text-sm">№ {String(v.id).padStart(3, "0")}</div>
          <StatusLed v={v} />
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="shrink-0 transition-transform duration-700 group-hover:rotate-[200deg]">
            <Dial size={78} angle={v.id * 47} tone={solved ? "green" : state === "REJECTED" ? "red" : "brass"} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-stencil text-xl uppercase leading-tight text-steel-100 group-hover:text-brass-200">{v.title}</h3>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="label rounded border border-black bg-black/40 px-1.5 py-0.5">{v.category}</span>
              <span className="label rounded border border-black bg-black/40 px-1.5 py-0.5">{v.mode === "SEALED" ? "sealed hash" : "open rubric"}</span>
            </div>
          </div>
        </div>
        <p className="mt-4 line-clamp-2 min-h-[2.8rem] text-sm text-steel-300">{v.status === "REJECTED" ? v.reject_reason : v.riddle}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="label">Pot</div>
            <div className="readout amber text-xl">{v.pot.toLocaleString("en-US")} pts</div>
          </div>
          <div className="text-right">
            <div className="label">{v.status === "OPEN" ? "Closes in" : v.status === "SOLVED" ? "Cracked" : "Ended"}</div>
            {v.status === "OPEN" ? <Clock until={v.expires_at} doneText="TIME UP" /> : <span className="readout">{v.status === "SOLVED" ? `+${v.payout}` : "—"}</span>}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1" title={`${v.attempts} of ${v.max_total} attempts used`}>
          {Array.from({ length: Math.min(v.max_total, 30) }, (_, k) => (
            <span key={k} className={`h-3 flex-1 rounded-sm ${k < Math.round((v.attempts / v.max_total) * Math.min(v.max_total, 30)) ? "bg-brass-400" : "bg-black/60"}`} />
          ))}
        </div>
        <div className="label mt-1.5">{v.attempts}/{v.max_total} tumblers pushed · {v.attempt_fee} pt per try</div>
      </Plate>
    </Link>
  );
}
