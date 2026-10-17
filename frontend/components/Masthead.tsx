"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dial } from "./Dial";
import { Led } from "./ui";
import { shortAddress } from "@/lib/format";
import { useTx, useUser } from "@/lib/hooks";
import { useWallet } from "@/lib/WalletProvider";
import { START_POINTS } from "@/lib/config";

const NAV = [
  { href: "/", label: "Vaults" },
  { href: "/create", label: "Forge" },
  { href: "/leaderboard", label: "Hall of Crackers" },
  { href: "/trust", label: "Trust" },
];

export function Masthead() {
  const path = usePathname();
  const w = useWallet();
  const user = useUser(w.address);
  const claim = useTx();
  const needsPoints = !!w.address && user.data && !user.data.claimed_start;

  return (
    <header className="sticky top-0 z-30 border-b border-black bg-steel-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Dial size={40} />
          <span className="font-stencil text-xl uppercase tracking-[0.12em] text-brass-200">
            Riddle<span className="text-steel-100">Vault</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-wrap gap-1">
          {NAV.map((n) => {
            const on = n.href === "/" ? path === "/" || path.startsWith("/vault") : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-md px-3 py-1.5 font-readout text-xs uppercase tracking-[0.18em] transition ${on ? "bg-black/50 text-brass-200 shadow-[inset_0_2px_6px_#000]" : "text-steel-300 hover:text-brass-200"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {w.address && user.data && (
            <span className="readout" title="Your points">{user.data.balance.toLocaleString("en-US")} pts</span>
          )}
          {needsPoints && (
            <button className="btn btn-steel !px-3 !py-1.5 !text-xs" disabled={claim.busy} onClick={() => claim.run("claim_points", [])} data-testid="claim-points">
              {claim.busy ? "Claiming…" : `Claim ${START_POINTS} pts`}
            </button>
          )}
          {!w.isMetaMaskAvailable ? (
            <a className="btn btn-brass !px-3 !py-1.5 !text-xs" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
              Get MetaMask
            </a>
          ) : !w.address ? (
            <button className="btn btn-brass !px-3 !py-1.5 !text-xs" onClick={w.connect} disabled={w.isConnecting} data-testid="connect">
              {w.isConnecting ? "Connecting…" : "Connect wallet"}
            </button>
          ) : !w.isCorrectChain ? (
            <button className="btn btn-brass !px-3 !py-1.5 !text-xs" onClick={w.switchChain}>
              Switch to Studionet
            </button>
          ) : (
            <button className="btn btn-steel !px-3 !py-1.5 !text-xs" onClick={w.disconnect} title="Disconnect" data-testid="wallet-address">
              <Led tone="green" /> {shortAddress(w.address)}
            </button>
          )}
        </div>
      </div>
      {(w.error || claim.error) && <div className="bg-led-red/10 px-4 py-1 text-center text-xs text-led-red">{w.error || claim.error}</div>}
    </header>
  );
}
