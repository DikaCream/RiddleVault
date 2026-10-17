"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Dial } from "@/components/Dial";
import { Label, PageTitle, Plate, TxTumblers } from "@/components/ui";
import { MIN_PRIZE } from "@/lib/config";
import { useTx, useUser } from "@/lib/hooks";
import { normalize, randomNonce, saveSecret, sealAnswer } from "@/lib/seal";
import { useWallet } from "@/lib/WalletProvider";

const CATEGORIES = ["WORDPLAY", "LOGIC", "TRIVIA", "CODE", "CREATIVE", "OTHER"];
const DURATIONS = [
  { label: "5 min", s: 300 },
  { label: "1 hour", s: 3600 },
  { label: "1 day", s: 86400 },
  { label: "7 days", s: 604800 },
];

function Lever({ label, value, min, max, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; suffix?: string }) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label>{label}</Label>
        <span className="readout">{value}{suffix}</span>
      </div>
      <input type="range" className="lever" min={min} max={Math.max(min, max)} value={value} style={{ ["--fill" as string]: `${fill}%` }} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  );
}

export default function Create() {
  const w = useWallet();
  const user = useUser(w.address);
  const tx = useTx();
  const balance = user.data?.balance ?? 1000;

  const [mode, setMode] = useState<"SEALED" | "RUBRIC">("RUBRIC");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("WORDPLAY");
  const [riddle, setRiddle] = useState("");
  const [criteria, setCriteria] = useState(["", ""]);
  const [secret, setSecret] = useState("");
  const [nonce, setNonce] = useState("");
  const [hash, setHash] = useState("");
  const [prize, setPrize] = useState(100);
  const [fee, setFee] = useState(5);
  const [perPlayer, setPerPlayer] = useState(3);
  const [total, setTotal] = useState(20);
  const [duration, setDuration] = useState(3600);
  const [result, setResult] = useState<{ id: number; status: string; reason: string } | null>(null);

  useEffect(() => setNonce(randomNonce()), []);
  useEffect(() => {
    let live = true;
    if (mode === "SEALED" && normalize(secret)) sealAnswer(nonce, secret).then((h) => live && setHash(h));
    else setHash("");
    return () => { live = false; };
  }, [mode, secret, nonce]);

  const maxFee = Math.max(1, Math.floor(prize / 10));
  useEffect(() => { if (fee > maxFee) setFee(maxFee); }, [maxFee, fee]);
  useEffect(() => { if (perPlayer > total) setPerPlayer(total); }, [perPlayer, total]);

  const cleanCriteria = criteria.map((c) => c.trim()).filter(Boolean);
  const problems = useMemo(() => {
    const p: string[] = [];
    if (title.trim().length < 6) p.push("Title: at least 6 characters");
    if (riddle.trim().length < 30) p.push("Riddle: at least 30 characters");
    if (cleanCriteria.length < 2) p.push("Add at least 2 criteria");
    if (cleanCriteria.some((c) => c.length < 8)) p.push("Each criterion needs 8+ characters");
    if (mode === "SEALED" && !normalize(secret)) p.push("Type the secret answer to seal it");
    if (prize > balance) p.push("Prize is more than your points");
    return p;
  }, [title, riddle, cleanCriteria, mode, secret, prize, balance]);

  const submit = async () => {
    if (!w.address) return;
    tx.reset();
    setResult(null);
    const res = await tx.run("create_vault", [
      title.trim(), riddle.trim(), cleanCriteria, category, mode, mode === "SEALED" ? hash : "", mode === "SEALED" ? nonce : "",
      prize, fee, perPlayer, total, duration,
    ]);
    if (res) {
      const id = Number(res.values.id ?? -1);
      const status = String(res.values.status ?? "");
      if (mode === "SEALED" && status === "OPEN" && id >= 0) saveSecret(w.address, id, secret);
      setResult({ id, status, reason: String(res.values.reject_reason ?? "") });
    }
  };

  const ready = !!w.address && w.isCorrectChain && problems.length === 0 && !tx.busy;

  return (
    <div>
      <PageTitle kicker="Step up to the workbench" title="Forge a vault" />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Plate className="p-6">
            <Label>01 · How is the answer judged?</Label>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {([
                ["RUBRIC", "Open rubric", "No secret. The AI jury checks each answer against your public, locked criteria. Best for creative challenges, puzzles with many valid answers, and anything appealable."],
                ["SEALED", "Sealed answer", "You commit a hash of one exact answer. Only the contract can declare SOLVED (exact hash match). The AI never sees the secret, so it cannot leak it. No appeals."],
              ] as const).map(([m, t, d]) => (
                <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`rounded-xl border p-4 text-left transition ${mode === m ? "border-brass-400 bg-brass-500/10 shadow-[0_0_0_2px_rgba(211,169,74,.35)]" : "border-black bg-black/30 hover:border-steel-500"}`}>
                  <div className="flex items-center gap-2 font-stencil text-lg uppercase text-steel-100"><span className={`led ${mode === m ? "on-green" : ""}`} />{t}</div>
                  <p className="mt-2 text-sm text-steel-300">{d}</p>
                </button>
              ))}
            </div>
          </Plate>

          <Plate className="space-y-5 p-6">
            <Label>02 · The riddle (welded shut after creation)</Label>
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <input className="field" placeholder="Vault name, e.g. The Midnight Cipher" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
              <select className="field" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <textarea className="field min-h-28" placeholder="The riddle or challenge, clear enough that a stranger could judge an answer. (30-800 characters)" maxLength={800} value={riddle} onChange={(e) => setRiddle(e.target.value)} aria-label="Riddle" />
            <div>
              <Label>Acceptance criteria: what a correct answer must satisfy (2-6, objective, without giving the answer away)</Label>
              <div className="mt-3 space-y-2">
                {criteria.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="readout w-9 shrink-0 text-center">{i + 1}</span>
                    <input className="field" maxLength={200} placeholder={i === 0 ? "e.g. The answer is a single everyday object" : "Another objective, checkable condition"} value={c} onChange={(e) => setCriteria(criteria.map((x, k) => (k === i ? e.target.value : x)))} aria-label={`Criterion ${i + 1}`} />
                    {criteria.length > 2 && <button type="button" className="btn btn-steel !px-3" onClick={() => setCriteria(criteria.filter((_, k) => k !== i))} aria-label="Remove criterion">×</button>}
                  </div>
                ))}
              </div>
              {criteria.length < 6 && <button type="button" className="btn btn-steel mt-3 !py-1.5 !text-xs" onClick={() => setCriteria([...criteria, ""])}>+ Add criterion</button>}
            </div>
            {mode === "SEALED" && (
              <div className="rounded-xl border border-brass-500/30 bg-black/30 p-4">
                <Label>Secret answer · sealed in your browser, never sent</Label>
                <input className="field mt-3" placeholder="The exact answer (use a phrase or code that cannot be brute-forced from a word list)" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" aria-label="Secret answer" />
                <div className="label mt-3 break-all">nonce {nonce}</div>
                <div className="mt-1 break-all font-readout text-xs text-led-green" data-testid="seal-hash">{hash ? `sha256 ${hash}` : "hash appears here"}</div>
                <p className="mt-3 text-xs text-steel-300">
                  Only this hash goes on-chain. Matching ignores case, punctuation and spacing. Honest limit: a short, guessable answer can be brute-forced offline from the hash, so
                  pick a long or unusual one. The secret is kept in this browser (so you can reveal it after the vault ends); if you lose it, the vault simply expires and refunds everyone.
                </p>
              </div>
            )}
          </Plate>

          <Plate className="space-y-6 p-6">
            <Label>03 · Stakes and limits</Label>
            <div className="grid gap-6 sm:grid-cols-2">
              <Lever label="Prize you lock" value={prize} min={MIN_PRIZE} max={Math.max(MIN_PRIZE, Math.min(balance, 1000))} onChange={setPrize} suffix=" pts" />
              <Lever label="Attempt fee (into the pot)" value={fee} min={1} max={maxFee} onChange={setFee} suffix=" pt" />
              <Lever label="Tries per player" value={perPlayer} min={1} max={10} onChange={setPerPlayer} />
              <Lever label="Tries in total" value={total} min={5} max={60} onChange={setTotal} />
            </div>
            <div>
              <Label>Time until the vault expires</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button key={d.s} type="button" onClick={() => setDuration(d.s)} className={`btn !px-4 !py-2 !text-xs ${duration === d.s ? "btn-brass" : "btn-steel"}`}>{d.label}</button>
                ))}
              </div>
            </div>
          </Plate>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Plate className="p-6">
            <div className="flex justify-center"><Dial size={150} spinning={tx.busy} tone={result?.status === "REJECTED" ? "red" : result ? "green" : "brass"} /></div>
            <div className="mt-4 space-y-2 font-readout text-sm text-steel-300">
              <div className="flex justify-between"><span>Locked from you</span><b className="text-led-amber">{prize} pts</b></div>
              <div className="flex justify-between"><span>Bond to appeal</span><b>{Math.max(20, fee * 2)} pts</b></div>
              <div className="flex justify-between"><span>If nobody cracks it</span><b className="text-led-green">all refunded</b></div>
              <div className="flex justify-between"><span>Your balance</span><b>{w.address ? balance : "—"}</b></div>
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-steel-300">
              <li>AI screens the riddle first; vague or unjudgeable ones are rejected and cost you nothing.</li>
              <li>You cannot edit, cancel or play your own vault.</li>
            </ul>
            {problems.length > 0 && <ul className="mt-4 space-y-1 text-xs text-led-amber">{problems.map((p) => <li key={p}>▸ {p}</li>)}</ul>}
            {!w.address ? (
              <button className="btn btn-brass mt-5 w-full" onClick={w.connect}>Connect wallet</button>
            ) : !w.isCorrectChain ? (
              <button className="btn btn-brass mt-5 w-full" onClick={w.switchChain}>Switch to Studionet</button>
            ) : (
              <button className="btn btn-brass mt-5 w-full" disabled={!ready} onClick={submit} data-testid="forge">{tx.busy ? "Forging…" : "Lock the vault"}</button>
            )}
            <TxTumblers status={tx.status} hash={tx.hash} error={tx.error} />
            {result && (
              <div className={`mt-4 rounded-lg border p-3 text-sm ${result.status === "OPEN" ? "border-led-green/40 bg-led-green/5" : "border-led-red/40 bg-led-red/5"}`} data-testid="create-result">
                {result.status === "OPEN" ? (
                  <>Vault locked. <Link className="text-brass-300 underline" href={`/vault/${result.id}`}>Open vault № {result.id}</Link></>
                ) : (
                  <>The AI screen rejected it, no points were locked. <span className="text-steel-300">{result.reason}</span></>
                )}
              </div>
            )}
          </Plate>
        </aside>
      </div>
    </div>
  );
}
