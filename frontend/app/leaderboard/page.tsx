"use client";

import { Addr, Empty, PageTitle, Plate } from "@/components/ui";
import { useLeaderboard } from "@/lib/hooks";
import { sameAddress } from "@/lib/format";
import { useWallet } from "@/lib/WalletProvider";

const MEDAL = ["linear-gradient(135deg,#f6e3a8,#d3a94a,#8d6c24)", "linear-gradient(135deg,#f1f4f8,#aab4c0,#5b6674)", "linear-gradient(135deg,#f0c39a,#b9733a,#6a3b16)"];

export default function Leaderboard() {
  const lb = useLeaderboard(25);
  const { address } = useWallet();
  return (
    <div>
      <PageTitle kicker="Safecrackers ranked by winnings" title="Hall of Crackers" />
      {lb.isLoading ? (
        <div className="label animate-pulse">Dusting off the plaques…</div>
      ) : !lb.data || lb.data.length === 0 ? (
        <Empty title="No crackers yet">Be the first name on the wall: solve a vault.</Empty>
      ) : (
        <>
          <div className="mb-8 grid gap-5 md:grid-cols-3">
            {lb.data.slice(0, 3).map((r, i) => (
              <Plate key={r.address} className="rise p-6 text-center" style={{ animationDelay: `${i * 90}ms` }}>
                <div className="engraved mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ background: MEDAL[i], boxShadow: "0 4px 10px #000, inset 0 2px 3px rgba(255,255,255,.5)" }}>
                  {i + 1}
                </div>
                <div className="mt-4"><Addr a={r.address} you={sameAddress(r.address, address)} /></div>
                <div className="readout amber mx-auto mt-3 inline-block text-2xl">{r.winnings.toLocaleString("en-US")} pts</div>
                <div className="label mt-3">{r.wins} cracked · {r.partials} close calls · {r.attempts} tries</div>
              </Plate>
            ))}
          </div>
          <Plate className="overflow-x-auto p-2">
            <table className="w-full text-left text-sm" data-testid="leaderboard">
              <thead>
                <tr className="label">
                  {["#", "Cracker", "Vaults cracked", "Winnings", "Close calls", "Tries"].map((h) => <th key={h} className="px-4 py-3 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {lb.data.map((r, i) => (
                  <tr key={r.address} className="border-t border-black/60 hover:bg-black/25">
                    <td className="px-4 py-3 font-readout text-brass-300">{i + 1}</td>
                    <td className="px-4 py-3"><Addr a={r.address} you={sameAddress(r.address, address)} /></td>
                    <td className="px-4 py-3 font-readout">{r.wins}</td>
                    <td className="px-4 py-3 font-readout text-led-amber">{r.winnings.toLocaleString("en-US")}</td>
                    <td className="px-4 py-3 font-readout">{r.partials}</td>
                    <td className="px-4 py-3 font-readout">{r.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Plate>
        </>
      )}
    </div>
  );
}
