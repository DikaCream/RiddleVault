"use client";

import { use, useState } from "react";
import { Dial } from "@/components/Dial";
import { Addr, BackLink, Clock, Empty, Label, Led, Plate, StatusLed, TxTumblers, VerdictStamp, vaultState } from "@/components/ui";
import { sameAddress, timeAgo, utc } from "@/lib/format";
import { useAttempts, useTx, useUser, useVault } from "@/lib/hooks";
import { loadSecret } from "@/lib/seal";
import type { Attempt, Vault } from "@/lib/riddlevault";
import { useWallet } from "@/lib/WalletProvider";

const TONE = { SOLVED: "#5dffa0", PARTIAL: "#ffbd3d", WRONG: "#ff5d52" } as const;

function AttemptTape({ a, v, me, onAppeal }: { a: Attempt; v: Vault; me: string | null; onAppeal: (a: Attempt) => void }) {
  const mine = sameAddress(a.player, me);
  const canAppeal = mine && v.mode === "RUBRIC" && v.status === "OPEN" && !v.expired && a.verdict !== "SOLVED" && !a.appealed;
  return (
    <article className="tape rise p-4" style={{ ["--tape" as string]: TONE[a.verdict] }} data-testid="attempt">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="label">Try #{a.id + 1}</span><Addr a={a.player} you={mine} /><span className="label">{timeAgo(a.timestamp)}</span></div>
          <p className="mt-2 whitespace-pre-wrap break-words font-readout text-[0.95rem] text-steel-100">“{a.answer}”</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <VerdictStamp verdict={a.verdict} />
          <span className="readout text-sm">{a.score}/100</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {a.checks.map((ok, i) => (
          <span key={i} title={v.criteria[i]} className="inline-flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 font-readout text-[0.7rem] text-steel-300"><Led tone={ok ? "green" : "red"} />C{i + 1}</span>
        ))}
      </div>
      <p className="mt-3 border-l-2 border-brass-500/50 pl-3 text-sm italic text-steel-300">{a.reasoning || "No reasoning recorded."}</p>
      {a.appealed && (
        <div className="mt-3 rounded-lg border border-black bg-black/40 p-3 text-sm">
          <div className="flex items-center gap-2"><Label>Appeal</Label><VerdictStamp verdict={(a.appeal_verdict || "WRONG") as "WRONG"} />{a.overturned ? <span className="text-led-green">overturned, bond returned</span> : <span className="text-led-red">upheld, {a.bond_forfeited} pt bond into the pot</span>}</div>
          <p className="mt-2 text-steel-300">Player: “{a.appeal_argument}”</p>
          <p className="mt-1 italic text-steel-300">Jury: {a.appeal_reasoning}</p>
        </div>
      )}
      {canAppeal && <button className="btn btn-steel mt-3 !px-3 !py-1.5 !text-xs" onClick={() => onAppeal(a)} data-testid="appeal-open">Appeal this verdict ({v.bond} pt bond)</button>}
    </article>
  );
}

export default function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = use(params);
  const id = /^\d+$/.test(raw) ? Number(raw) : null;
  const vault = useVault(id);
  const v = vault.data;
  const attempts = useAttempts(id, v?.attempts ?? 0);
  const w = useWallet();
  const user = useUser(w.address);
  const tx = useTx();
  const [answer, setAnswer] = useState("");
  const [appealing, setAppealing] = useState<Attempt | null>(null);
  const [argument, setArgument] = useState("");
  const [revealText, setRevealText] = useState("");

  if (id === null) return <Empty title="Unknown vault">That is not a vault number.</Empty>;
  if (vault.isLoading) return <div className="label animate-pulse">Spinning the dial…</div>;
  if (!v) return <Empty title="Vault not found">{String((vault.error as Error)?.message ?? "No vault with that number.").slice(0, 160)}</Empty>;

  const me = w.address;
  const isCreator = sameAddress(v.creator, me);
  const state = vaultState(v);
  const open = v.status === "OPEN" && !v.expired;
  const myTries = (attempts.data ?? []).filter((a) => sameAddress(a.player, me)).length;
  const triesLeft = Math.min(v.max_per_player - myTries, v.max_total - v.attempts);
  const balance = user.data?.balance ?? 0;
  const connected = !!me && w.isCorrectChain;
  const canPlay = open && connected && !isCreator && triesLeft > 0 && balance >= v.attempt_fee;
  const ledger = [...(attempts.data ?? [])].reverse();
  const stored = me && isCreator ? loadSecret(me, v.id) : "";

  const crack = async () => {
    const res = await tx.run("submit_answer", [v.id, answer]);
    if (res) setAnswer("");
  };
  const sendAppeal = async () => {
    if (!appealing) return;
    const res = await tx.run("appeal_attempt", [v.id, appealing.id, argument]);
    if (res) { setAppealing(null); setArgument(""); }
  };

  return (
    <div>
      <BackLink href="/">All vaults</BackLink>
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Plate className="p-6">
            <div className="door-wrap">
              <div className="relative mx-auto flex aspect-square max-w-[300px] items-center justify-center rounded-full vault-interior p-3">
                <div className="absolute inset-0 flex items-center justify-center font-stencil text-3xl text-brass-200 opacity-90">
                  {v.status === "SOLVED" ? `+${v.payout}` : ""}
                </div>
                <div className={`door w-full ${v.status === "SOLVED" ? "open" : ""}`}>
                  <Dial size={280} angle={v.id * 47} spinning={tx.busy} tone={v.status === "SOLVED" ? "green" : v.status === "REJECTED" ? "red" : "brass"} />
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="engraved brass rounded px-2.5 py-0.5">№ {String(v.id).padStart(3, "0")}</div>
              <StatusLed v={v} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><Label>Pot</Label><div className="readout amber mt-1">{v.pot} pts</div></div>
              <div><Label>{open ? "Closes in" : "Deadline"}</Label><div className="mt-1">{v.status === "OPEN" ? <Clock until={v.expires_at} doneText="TIME UP" /> : <span className="readout">{utc(v.expires_at)}</span>}</div></div>
              <div><Label>Prize / fee</Label><div className="mt-1 font-readout">{v.prize} / {v.attempt_fee} pt</div></div>
              <div><Label>Appeal bond</Label><div className="mt-1 font-readout">{v.mode === "RUBRIC" ? `${v.bond} pt` : "n/a (sealed)"}</div></div>
              <div><Label>Tries</Label><div className="mt-1 font-readout">{v.attempts}/{v.max_total} · {v.max_per_player} each</div></div>
              <div><Label>Creator</Label><div className="mt-1"><Addr a={v.creator} you={isCreator} /></div></div>
            </dl>
          </Plate>

          {v.status === "SOLVED" && (
            <Plate className="p-5 text-center" data-testid="solved-banner">
              <div className="stamp solved">CRACKED</div>
              <div className="mt-3"><Addr a={v.winner} you={sameAddress(v.winner, me)} /></div>
              <div className="mt-1 text-sm text-steel-300">took {v.payout} pts · {utc(v.solved_at)}</div>
            </Plate>
          )}
          {v.status === "EXPIRED" && <Plate className="p-5 text-sm text-steel-300">Nobody cracked it. Prize returned to the creator and {v.refunded} pts of fees refunded to players.</Plate>}
          {v.status === "REJECTED" && <Plate className="p-5 text-sm"><span className="text-led-red">Rejected by the AI screen:</span> <span className="text-steel-300">{v.reject_reason}</span></Plate>}
          {v.status === "OPEN" && v.expired && (
            <Plate className="p-5">
              <p className="text-sm text-steel-300">Time is up. Anyone can close the vault: prize back to the creator, every fee refunded.</p>
              <button className="btn btn-brass mt-3 w-full" disabled={!connected || tx.busy} onClick={() => tx.run("expire", [v.id])} data-testid="expire">Close and refund</button>
            </Plate>
          )}
        </div>

        <div className="space-y-6">
          <Plate className="p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label rounded border border-black bg-black/40 px-1.5 py-0.5">{v.category}</span>
              <span className="label rounded border border-black bg-black/40 px-1.5 py-0.5">{v.mode === "SEALED" ? "sealed hash" : "open rubric"}</span>
            </div>
            <h1 className="mt-3 font-stencil text-4xl uppercase leading-tight text-brass-200" style={{ textShadow: "0 3px 0 #3b2d0b" }}>{v.title}</h1>
            <p className="mt-5 whitespace-pre-wrap text-xl leading-relaxed text-steel-100" data-testid="riddle">{v.riddle}</p>
            <div className="mt-6">
              <Label>Welded-shut criteria · the jury checks exactly these</Label>
              <ol className="mt-3 space-y-2">
                {v.criteria.map((c, i) => (
                  <li key={i} className="flex gap-3 rounded-lg border border-black bg-black/30 px-3 py-2 text-sm"><span className="readout shrink-0">C{i + 1}</span>{c}</li>
                ))}
              </ol>
            </div>
            {v.mode === "SEALED" && (
              <div className="mt-5 rounded-lg border border-black bg-black/40 p-3">
                <Label>Sealed answer hash (sha256, nonce {v.nonce})</Label>
                <div className="mt-1 break-all font-readout text-xs text-led-green">{v.answer_hash}</div>
                {v.revealed_answer && <div className="mt-2 text-sm">Creator revealed: <b className="text-brass-200">“{v.revealed_answer}”</b> <span className="text-led-green">(verified against the hash)</span></div>}
              </div>
            )}
            <div className="mt-4 text-xs text-steel-300">Created {utc(v.created_at)}. Riddle, criteria, limits and deadline cannot be edited by anyone.</div>
          </Plate>

          {open && (
            <Plate className="p-7">
              <Label>Dial in your answer</Label>
              {isCreator ? (
                <p className="mt-3 text-sm text-steel-300">You forged this vault, so you cannot play it.</p>
              ) : !me ? (
                <button className="btn btn-brass mt-3" onClick={w.connect}>Connect wallet to play</button>
              ) : !w.isCorrectChain ? (
                <button className="btn btn-brass mt-3" onClick={w.switchChain}>Switch to Studionet</button>
              ) : user.data && !user.data.claimed_start ? (
                <p className="mt-3 text-sm text-led-amber">Claim your starting points with the button in the top bar first.</p>
              ) : (
                <>
                  <textarea className="field mt-3 min-h-24" maxLength={300} placeholder="Your answer. Line breaks are kept for poems and code." value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Your answer" disabled={tx.busy} />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="label">{triesLeft} tries left · fee {v.attempt_fee} pt · wrong answers feed the pot</span>
                    <button className="btn btn-brass" disabled={!canPlay || !answer.trim() || tx.busy} onClick={crack} data-testid="submit-answer">{tx.busy ? "Judging…" : "Crack it"}</button>
                  </div>
                </>
              )}
              <TxTumblers status={tx.status} hash={tx.hash} error={tx.error} />
            </Plate>
          )}
          {!open && (tx.status || tx.error) && <TxTumblers status={tx.status} hash={tx.hash} error={tx.error} />}

          {appealing && (
            <Plate className="p-6">
              <Label>Appeal try #{appealing.id + 1} · stricter fresh panel · {v.bond} pt bond (returned if you win, forfeited into the pot if not)</Label>
              <textarea className="field mt-3 min-h-20" maxLength={400} placeholder="Explain which criteria the jury misjudged (20-400 characters)" value={argument} onChange={(e) => setArgument(e.target.value)} aria-label="Appeal argument" />
              <div className="mt-3 flex gap-3">
                <button className="btn btn-brass" disabled={tx.busy || argument.trim().length < 20} onClick={sendAppeal} data-testid="appeal-send">{tx.busy ? "Judging…" : "File appeal"}</button>
                <button className="btn btn-steel" onClick={() => setAppealing(null)}>Cancel</button>
              </div>
            </Plate>
          )}

          {isCreator && v.mode === "SEALED" && (v.status === "SOLVED" || v.status === "EXPIRED") && !v.revealed_answer && (
            <Plate className="p-6">
              <Label>Prove you were honest · reveal the sealed answer (checked against the hash)</Label>
              <input className="field mt-3" value={revealText || stored} onChange={(e) => setRevealText(e.target.value)} placeholder="The secret answer" aria-label="Reveal answer" />
              <button className="btn btn-brass mt-3" disabled={tx.busy || !(revealText || stored)} onClick={() => tx.run("reveal_answer", [v.id, revealText || stored])}>Reveal</button>
              <TxTumblers status={tx.status} hash={tx.hash} error={tx.error} />
            </Plate>
          )}

          <section>
            <div className="mb-3 flex items-end justify-between"><h2 className="font-stencil text-2xl uppercase text-steel-100">Ledger of tries</h2><Label>{v.attempts} judged · reasoning is public</Label></div>
            {ledger.length === 0 ? (
              <Empty title="No tries yet">{state === "REJECTED" ? "This vault was never opened." : "Be the first to push a tumbler."}</Empty>
            ) : (
              <div className="space-y-4">
                {ledger.map((a) => <AttemptTape key={a.id} a={a} v={v} me={me} onAppeal={(x) => { setAppealing(x); tx.reset(); }} />)}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
