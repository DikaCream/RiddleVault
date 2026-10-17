// Real end-to-end run of RiddleVault on Studionet with two wallets.
// Wallet A = PRIVATE_KEY (creator / deployer), wallet B = PRIVATE_KEY_2 (player).
// Paths: vague vault rejected -> SEALED vault: wrong attempt, hash-solved attempt, payout, reveal ->
//        RUBRIC vault: wrong attempt, appeal (bond), solved attempt, payout -> expiry refund path.
// Writes deployments/e2e-studionet.json.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { getClient, toPlain, waitAndInspect, EXPLORER_URL } from "./lib.mjs";

const { contractAddress: address } = JSON.parse(readFileSync(new URL("../deployments/studionet.json", import.meta.url)));
const A = getClient();
if (!/^0x[0-9a-fA-F]{64}$/.test(process.env.PRIVATE_KEY_2 || "")) throw new Error("PRIVATE_KEY_2 missing in .env");
const B = createClient({ chain: studionet, endpoint: "https://studio.genlayer.com/api", account: createAccount(process.env.PRIVATE_KEY_2) });
const W = { A: A.account.address, B: B.account.address };
const steps = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Math.floor(Date.now() / 1000);
const read = async (fn, args = []) => toPlain(await A.readContract({ address, functionName: fn, args }));
const norm = (t) => (t.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join(" ");
const digest = (nonce, answer) => createHash("sha256").update(`${nonce}|${norm(answer)}`).digest("hex");

async function write(label, who, fn, args, { expectFail = false } = {}) {
  const c = who === "A" ? A : B;
  const t = Date.now();
  let hash, out;
  try {
    hash = await c.writeContract({ address, functionName: fn, args, value: 0n });
    out = await waitAndInspect(c, hash, { retries: 200, interval: 4000 });
  } catch (e) {
    out = { success: false, error: String(e.shortMessage || e.message).slice(0, 200) };
  }
  const ok = expectFail ? out.success !== true : out.success === true;
  steps.push({
    step: label, wallet: who, method: fn, tx: hash || null, explorer: hash ? `${EXPLORER_URL}/transactions/${hash}` : null,
    status: out.statusName || "REJECTED", execution: out.executionResult || "ERROR", ok,
    expected: expectFail ? "revert" : "success", seconds: Math.round((Date.now() - t) / 1000),
  });
  console.log(`${ok ? "OK  " : "FAIL"} ${label} [${out.statusName || "REJECTED"}/${out.executionResult || "ERROR"}] ${Math.round((Date.now() - t) / 1000)}s`);
  save();
  return out;
}

function check(label, cond, detail) {
  checks.push({ check: label, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail !== undefined ? " -> " + JSON.stringify(detail) : ""}`);
}

function save() {
  writeFileSync(new URL("../deployments/e2e-studionet.json", import.meta.url),
    JSON.stringify({ network: "studionet", address, wallets: W, steps, checks }, null, 2) + "\n");
}

const total = async () => (await read("get_stats")).vaults;
const bal = async (w) => (await read("get_user", [W[w]])).balance;
const NONCE = "r1ddl3v4ult" + Math.floor(Math.random() * 1e6);

// SEALED candidates: the AI screen is strict (it rejects tiny answer spaces and criteria that leak the answer),
// so we try a few until one is accepted; every attempt is recorded.
const SEALED_CANDIDATES = [
  { riddle: "Complete the famous English pangram used to test typewriters: 'The quick brown fox jumps over ...' What are the last three words?", crit: ["The answer is exactly three words long.", "The answer completes a well-known English pangram sentence."], answer: "the lazy dog", wrong: "the sleepy cat" },
  { riddle: "Which Italian Renaissance polymath painted the Mona Lisa and sketched flying machines? Give his full name as commonly written.", crit: ["The answer is a person's name, written as first name plus surname or epithet.", "The person was an Italian artist of the Renaissance period."], answer: "Leonardo da Vinci", wrong: "Michelangelo Buonarroti" },
];
let SEALED_ANSWER = "", SEALED_WRONG = "";
const POEM_RIDDLE = "Write a four-line poem about the sea in which every single line begins with the letter S.";
const POEM_CRIT = ["The answer consists of exactly four lines.", "Every line starts with the letter S.", "The poem is about the sea or the ocean."];
const vault = (label, args, opts) => write(label, "A", "create_vault", args, opts);

// ---- points
for (const w of ["A", "B"]) {
  const u = await read("get_user", [W[w]]);
  if (!u.claimed_start) await write(`claim_points (${w})`, w, "claim_points", []);
}

// ---- 0. start the expiry vault first so its 60 s clock runs during the main paths
const idExp = await total();
await vault("create expiry vault (60s)", ["Wind Whisperer", POEM_RIDDLE, POEM_CRIT, "creative", "RUBRIC", "", "", 100, 5, 3, 10, 60]);
let v = await read("get_vault", [idExp]);
check("expiry vault created OPEN", v.status === "OPEN", { status: v.status, reason: v.reject_reason });
const startA = (await bal("A"));
const startB = await bal("B");
await write("B attempts expiry vault (wrong)", "B", "submit_answer", [idExp, "The ocean is big and blue and very deep, nothing else matters."]);

// ---- 1. vague vault rejected by the AI screen
const idBad = await total();
await vault("create vague vault", ["Guess my mood", "Guess what I am thinking about right now, you probably know it already, it is a good thing.", ["The answer feels right to me personally.", "The answer is good in my opinion."], "other", "RUBRIC", "", "", 50, 5, 3, 10, 600]);
v = await read("get_vault", [idBad]);
check("vague vault rejected by AI screen, prize not locked", v.status === "REJECTED", { status: v.status, reason: v.reject_reason });

// ---- 2. SEALED vault: wrong attempt, solved by hash, payout, reveal
let idS = -1;
for (const cand of SEALED_CANDIDATES) {
  idS = await total();
  SEALED_ANSWER = cand.answer; SEALED_WRONG = cand.wrong;
  await vault("create SEALED vault", ["The Whisper Vault", cand.riddle, cand.crit, "wordplay", "SEALED", digest(NONCE, cand.answer), NONCE, 100, 5, 3, 10, 1800]);
  v = await read("get_vault", [idS]);
  console.log("sealed candidate status:", v.status, v.reject_reason);
  if (v.status === "OPEN") break;
}
check("sealed vault OPEN, answer not stored on-chain", v.status === "OPEN" && v.answer_hash === digest(NONCE, SEALED_ANSWER) && !JSON.stringify(v).toLowerCase().includes(SEALED_ANSWER.toLowerCase()) && !v.revealed_answer, { status: v.status, reason: v.reject_reason });
const balB1 = await bal("B");
await write("B attempts sealed vault (wrong)", "B", "submit_answer", [idS, SEALED_WRONG]);
let att = await read("get_attempts", [idS]);
check("wrong sealed attempt is not SOLVED, has reasoning", att[0]?.verdict !== "SOLVED" && att[0]?.reasoning.length > 0, att[0]);
await write("B attempts sealed vault (correct, hash match)", "B", "submit_answer", [idS, SEALED_ANSWER.toUpperCase() + "!"]);
v = await read("get_vault", [idS]);
check("sealed vault SOLVED by B, payout = prize + 2 fees", v.status === "SOLVED" && v.winner === W.B && v.payout === 110, { status: v.status, payout: v.payout });
check("winner balance paid out", (await bal("B")) === balB1 - 10 + 110, { before: balB1, after: await bal("B") });
await write("creator reveals sealed answer", "A", "reveal_answer", [idS, SEALED_ANSWER]);
v = await read("get_vault", [idS]);
check("answer revealed and verified against hash", v.revealed_answer === SEALED_ANSWER, v.revealed_answer);
await write("late attempt on solved vault reverts", "B", "submit_answer", [idS, "something"], { expectFail: true });

// ---- 3. RUBRIC vault: wrong attempt, appeal, solved attempt, payout
const idR = await total();
await vault("create RUBRIC vault (poem)", ["Seaside S-Poem", POEM_RIDDLE, POEM_CRIT, "creative", "RUBRIC", "", "", 100, 5, 3, 10, 1800]);
v = await read("get_vault", [idR]);
check("rubric vault OPEN", v.status === "OPEN", { status: v.status, reason: v.reject_reason });
await write("B attempts rubric vault (wrong poem)", "B", "submit_answer", [idR, "The ocean is wide and blue\nWaves crash upon the shore\nGulls cry overhead"]);
att = await read("get_attempts", [idR]);
check("wrong poem judged not SOLVED with reasoning + score", att[0]?.verdict !== "SOLVED" && att[0]?.reasoning.length > 0, { verdict: att[0]?.verdict, score: att[0]?.score, reasoning: att[0]?.reasoning });
const balB2 = await bal("B");
await write("B appeals the wrong poem (bond)", "B", "appeal_attempt", [idR, 0, "The poem is about the sea and has a nice rhythm, so it should count as a valid entry."]);
att = await read("get_attempts", [idR]);
check("appeal recorded with a second verdict and reasoning", att[0]?.appealed === true && att[0]?.appeal_reasoning.length > 0, { appeal: att[0]?.appeal_verdict, overturned: att[0]?.overturned, reasoning: att[0]?.appeal_reasoning });
const upheld = !att[0]?.overturned;
if (upheld) check("upheld appeal forfeits bond into pot", att[0].bond_forfeited === 20, att[0].bond_forfeited);
v = await read("get_vault", [idR]);
if (v.status === "OPEN") {
  await write("B submits a valid S-poem", "B", "submit_answer", [idR, "Silver waves sweep the shore\nSalt winds sing of distant sails\nSeabirds circle high above\nSunlight shimmers on the sea"]);
  v = await read("get_vault", [idR]);
}
check("rubric vault SOLVED by B with payout", v.status === "SOLVED" && v.winner === W.B && v.payout >= 100, { status: v.status, payout: v.payout });

// ---- 4. expiry path
let ve = await read("get_vault", [idExp]);
const wait = ve.expires_at - now() + 5;
if (wait > 0) { console.log(`waiting ${wait}s for expiry`); await sleep(wait * 1000); }
await write("expire early call reverts on solved vault", "B", "expire", [idS], { expectFail: true });
await write("anyone expires the unsolved vault", "B", "expire", [idExp]);
ve = await read("get_vault", [idExp]);
check("expired vault: status EXPIRED and fees refunded", ve.status === "EXPIRED" && ve.refunded === 5, { status: ve.status, refunded: ve.refunded });

// ---- 5. global checks
const lb = await read("get_leaderboard", [5]);
check("leaderboard lists B first with 2 wins", lb[0]?.address === W.B && lb[0].wins >= 2, lb[0]);
const stats = await read("get_stats");
check("stats consistent", stats.by_status.SOLVED >= 2 && stats.by_status.EXPIRED >= 1 && stats.by_status.REJECTED >= 1, stats);
const endTotal = (await bal("A")) + (await bal("B"));
console.log("points: start A+B (with 100 locked in the expiry vault) =", startA + startB, "end A+B =", endTotal);
check("points conserved: both wallets hold exactly the 2 x 1000 starting points between them", endTotal === 2000, { endTotal });
save();
const failed = checks.filter((c) => !c.pass).length + steps.filter((s) => !s.ok).length;
console.log(failed === 0 ? "ALL E2E CHECKS PASSED" : `${failed} E2E FAILURES`);
process.exit(failed === 0 ? 0 : 1);
