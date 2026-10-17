"use client";

import Link from "next/link";
import { useState } from "react";
import { Dial } from "@/components/Dial";
import { VaultCard } from "@/components/VaultCard";
import { Empty, Label, Odometer, Plate } from "@/components/ui";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { useStats, useVaults } from "@/lib/hooks";

const TABS = [
  { key: "OPEN", label: "Locked" },
  { key: "SOLVED", label: "Cracked" },
  { key: "EXPIRED", label: "Expired" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

export default function Home() {
  const [tab, setTab] = useState("OPEN");
  const vaults = useVaults(tab);
  const stats = useStats();

  return (
    <div>
      <section className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <Label>Studionet · AI-judged · points only</Label>
          <h1 className="mt-2 font-stencil text-5xl uppercase leading-[0.95] text-brass-200 sm:text-7xl" style={{ textShadow: "0 4px 0 #3b2d0b, 0 14px 30px rgba(0,0,0,.7)" }}>
            Lock a prize.
            <br />
            <span className="text-steel-100">Let the jury</span>
            <br />
            crack it.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-steel-300">
            Put points behind a riddle or a creative challenge. Players push in an answer for a small fee, GenLayer validators judge it by consensus with written
            reasoning, and the first <b className="text-led-green">SOLVED</b> takes the whole vault. Nobody can move the goalposts: the riddle, the criteria and the
            deadline are welded shut at creation.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Link href="/create" className="btn btn-brass">Forge a vault</Link>
            <Link href="/trust" className="btn btn-steel">How it stays fair</Link>
          </div>
        </div>
        <div className="mx-auto hidden md:block">
          <Dial size={300} draggable label="Drag to spin the dial" />
          <div className="label mt-3 text-center">drag the dial</div>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Vaults", stats.data?.vaults ?? 0],
          ["Tries judged", stats.data?.attempts ?? 0],
          ["Pts locked", stats.data?.prize_locked ?? 0],
          ["Appeals", stats.data?.appeals ?? 0],
        ].map(([l, n]) => (
          <Plate key={l as string} className="p-4">
            <Label>{l as string}</Label>
            <div className="mt-2"><Odometer value={n as number} pad={l === "Pts locked" ? 5 : 3} /></div>
          </Plate>
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-center gap-2" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`btn !px-4 !py-2 !text-sm ${tab === t.key ? "btn-brass" : "btn-steel"}`}
            >
              {t.label}
              {stats.data && t.key !== "ALL" && <span className="font-readout text-xs opacity-70">{stats.data.by_status[t.key as "OPEN"] ?? 0}</span>}
            </button>
          ))}
        </div>
        {!CONTRACT_ADDRESS ? (
          <Empty title="No contract configured">Set NEXT_PUBLIC_CONTRACT_ADDRESS to the deployed RiddleVault contract.</Empty>
        ) : vaults.isLoading ? (
          <div className="label animate-pulse">Opening the vault door…</div>
        ) : vaults.error ? (
          <Empty title="Studionet is not answering">{String((vaults.error as Error).message).slice(0, 160)}</Empty>
        ) : vaults.data && vaults.data.items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vaults.data.items.map((v, i) => <VaultCard key={v.id} v={v} i={i} />)}
          </div>
        ) : (
          <Empty title="Nothing in this drawer">
            No vaults here yet. <Link href="/create" className="text-brass-300 underline">Forge the first one.</Link>
          </Empty>
        )}
      </section>
    </div>
  );
}
