"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { countdown, shortAddress } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { txExplorerUrl } from "@/lib/config";
import type { Vault, VaultStatus, Verdict } from "@/lib/riddlevault";

export function Plate({ className = "", children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`plate ${className}`} {...rest}>
      <span className="rivets" />
      {children}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="label">{children}</span>;
}

export function Led({ tone, pulse }: { tone: "green" | "red" | "amber" | "off"; pulse?: boolean }) {
  return <span className={`led ${tone === "off" ? "" : `on-${tone}`} ${pulse ? "pulse" : ""}`} />;
}

export const STATUS_META: Record<VaultStatus | "CLOSING", { label: string; tone: "green" | "red" | "amber" | "off" }> = {
  OPEN: { label: "LOCKED", tone: "green" },
  CLOSING: { label: "TIME UP", tone: "amber" },
  SOLVED: { label: "CRACKED", tone: "amber" },
  EXPIRED: { label: "EXPIRED", tone: "off" },
  REJECTED: { label: "REJECTED", tone: "red" },
};

export function vaultState(v: Vault): VaultStatus | "CLOSING" {
  return v.status === "OPEN" && v.expired ? "CLOSING" : v.status;
}

export function StatusLed({ v }: { v: Vault }) {
  const m = STATUS_META[vaultState(v)];
  return (
    <span className="inline-flex items-center gap-2">
      <Led tone={m.tone} pulse={v.status === "OPEN" && !v.expired} />
      <span className="label !text-steel-100">{m.label}</span>
    </span>
  );
}

export function VerdictStamp({ verdict }: { verdict: Verdict }) {
  return <span className={`stamp ${verdict.toLowerCase()}`}>{verdict}</span>;
}

export function Addr({ a, you }: { a: string; you?: boolean }) {
  return (
    <span className="font-readout text-[0.8rem]">
      {shortAddress(a)}
      {you && <span className="ml-1 rounded bg-brass-500/20 px-1 text-brass-300">you</span>}
    </span>
  );
}

/** Segmented digital countdown. */
export function Clock({ until, doneText = "00:00" }: { until: number; doneText?: string }) {
  const now = useNow();
  const left = until - now;
  return <span className={`readout ${left <= 0 ? "red" : left < 300 ? "amber" : ""}`}>{left <= 0 ? doneText : countdown(left)}</span>;
}

/** Odometer-style counter. */
export function Odometer({ value, pad = 3 }: { value: number; pad?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const from = shown;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className="inline-flex gap-[3px]">
      {String(shown).padStart(pad, "0").split("").map((d, i) => (
        <span key={i} className="readout !px-[0.4rem] text-2xl leading-tight">{d}</span>
      ))}
    </span>
  );
}

const STEPS = ["SIGNING", "PENDING", "PROPOSING", "COMMITTING", "REVEALING", "ACCEPTED"];
const STEP_TEXT: Record<string, string> = {
  SIGNING: "Confirm in your wallet",
  PENDING: "Queued on Studionet",
  PROPOSING: "Leader validator is judging",
  COMMITTING: "Validators committing votes",
  REVEALING: "Validators revealing votes",
  ACCEPTED: "Consensus reached",
  FINALIZED: "Finalized",
};

/** Row of brass tumblers that lift as the transaction moves through consensus. */
export function TxTumblers({ status, hash, error }: { status: string | null; hash: string | null; error: string | null }) {
  if (!status && !error) return null;
  const idx = status === "FINALIZED" ? STEPS.length : Math.max(0, STEPS.indexOf(status ?? ""));
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-black/60 bg-black/30 p-3" data-testid="tx-panel">
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <span key={s} className={`tumbler ${i <= idx && !error ? "up" : ""}`} title={s}>
            <i />
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        {error ? (
          <span className="text-led-red" role="alert">{error}</span>
        ) : (
          <span className="font-readout text-brass-300">{STEP_TEXT[status ?? ""] ?? status}</span>
        )}
        {hash && (
          <a className="ml-3 font-readout text-xs text-steel-300 underline decoration-dotted hover:text-brass-200" href={txExplorerUrl(hash)} target="_blank" rel="noreferrer">
            tx {shortAddress(hash)}
          </a>
        )}
      </div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Plate className="p-10 text-center">
      <div className="engraved brass mx-auto inline-block rounded px-4 py-1 text-lg">{title}</div>
      <div className="mt-4 text-steel-300">{children}</div>
    </Plate>
  );
}

export function PageTitle({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Label>{kicker}</Label>
        <h1 className="mt-1 font-stencil text-4xl uppercase tracking-wide text-brass-200 sm:text-5xl" style={{ textShadow: "0 3px 0 #3b2d0b, 0 8px 18px rgba(0,0,0,.6)" }}>
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="label mb-5 inline-block hover:!text-brass-200">
      ← {children}
    </Link>
  );
}
