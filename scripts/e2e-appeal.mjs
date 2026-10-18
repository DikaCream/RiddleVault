// On-chain Studionet scenario: try to get an appeal OVERTURNED (rubric mode).
// Each design is a counting/precision trap where a first panel can plausibly miscount and an appeal argument that
// spells the count out should flip it. LLM judgment is non-deterministic, so up to three designs are tried and the
// outcome (overturned or not) is recorded honestly either way. Appends to deployments/e2e-studionet-appeal.json.
// Needs PRIVATE_KEY (creator) and PRIVATE_KEY_2 (player) in .env.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { getClient, toPlain, waitAndInspect, EXPLORER_URL } from "./lib.mjs";

const { contractAddress: address } = JSON.parse(readFileSync(new URL("../deployments/studionet.json", import.meta.url)));
const OUT = new URL("../deployments/e2e-studionet-appeal.json", import.meta.url);
const A = getClient();
const B = createClient({ chain: studionet, endpoint: "https://studio.genlayer.com/api", account: createAccount(process.env.PRIVATE_KEY_2) });
const W = { A: A.account.address, B: B.account.address };
const steps = [];
const read = async (fn, args = []) => toPlain(await A.readContract({ address, functionName: fn, args }));
async function write(label, who, fn, args) {
  const c = who === "A" ? A : B;
  let hash, out;
  try { hash = await c.writeContract({ address, functionName: fn, args, value: 0n }); out = await waitAndInspect(c, hash, { retries: 200, interval: 4000 }); }
  catch (e) { out = { success: false, error: String(e.shortMessage || e.message).slice(0, 200) }; }
  steps.push({ step: label, wallet: who, method: fn, tx: hash || null, explorer: hash ? `${EXPLORER_URL}/transactions/${hash}` : null, status: out.statusName || "REJECTED", execution: out.executionResult || "ERROR", ok: out.success === true });
  console.log(out.success ? "OK  " : "FAIL", label, out.statusName, out.executionResult);
  return out;
}
for (const w of ["A", "B"]) if (!(await read("get_user", [W[w]])).claimed_start) await write(`claim_points (${w})`, w, "claim_points", []);

const designs = [
  {
    title: "Nine word winter sentence",
    riddle: "Write one sentence about winter that contains exactly nine words.",
    crit: ["The answer is a single sentence.", "The sentence contains exactly nine words.", "The sentence is about winter."],
    answer: "Snow covers the quiet hills while smoke rises upward.",
    argument: "Counting word by word: Snow 1, covers 2, the 3, quiet 4, hills 5, while 6, smoke 7, rises 8, upward 9. That is exactly nine words about winter.",
  },
  {
    title: "Seven letter fish word",
    riddle: "Write one sentence about the sea that contains exactly one word of seven letters and no word longer than seven letters.",
    crit: ["The answer is a single sentence about the sea.", "Exactly one word in the sentence has seven letters.", "No word in the sentence has more than seven letters."],
    answer: "Waves fold over the grey reef while a lone dolphin leaps.",
    argument: "Letter counts: Waves 5, fold 4, over 4, the 3, grey 4, reef 4, while 5, a 1, lone 4, dolphin 7, leaps 5. Only dolphin has seven letters and none is longer.",
  },
  {
    title: "Three lines three beats",
    riddle: "Write exactly three lines about the moon; each line must contain exactly four words.",
    crit: ["The answer has exactly three lines.", "Each line contains exactly four words.", "The lines are about the moon."],
    answer: "Pale moon climbs slowly\nSilver light fills rooms\nNight keeps its secrets",
    argument: "Line 1: Pale, moon, climbs, slowly = 4. Line 2: Silver, light, fills, rooms = 4. Line 3: Night, keeps, its, secrets = 4. Three lines, all about the moon.",
  },
];
const runs = [];
let overturned = false;
for (const d of designs) {
  if (overturned) break;
  const id = (await read("get_stats")).vaults;
  await write(`create vault: ${d.title}`, "A", "create_vault", [d.title, d.riddle, d.crit, "logic", "RUBRIC", "", "", 100, 5, 3, 10, 1800]);
  const v = await read("get_vault", [id]);
  if (v.status !== "OPEN") { runs.push({ design: d.title, vaultId: id, outcome: "vault rejected at creation: " + v.reject_reason }); continue; }
  await write("B attempts", "B", "submit_answer", [id, d.answer]);
  let att = (await read("get_attempts", [id]))[0];
  if (!att || att.verdict === "SOLVED") { runs.push({ design: d.title, vaultId: id, firstVerdict: att?.verdict, outcome: "first panel already SOLVED, nothing to appeal" }); continue; }
  await write("B appeals with the explicit count", "B", "appeal_attempt", [id, 0, d.argument]);
  att = (await read("get_attempts", [id]))[0];
  overturned = att.overturned === true;
  runs.push({ design: d.title, vaultId: id, firstVerdict: att.verdict, firstReasoning: att.reasoning, appealVerdict: att.appeal_verdict, appealReasoning: att.appeal_reasoning, overturned, bondForfeited: att.bond_forfeited, vault: await read("get_vault", [id]) });
}
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT)) : { runs: [] };
writeFileSync(OUT, JSON.stringify({ network: "studionet", address, wallets: W, when: new Date().toISOString(), overturned, runs, steps, stats: await read("get_stats") }, null, 2) + "\n");
console.log(JSON.stringify(runs.map((r) => ({ d: r.design, first: r.firstVerdict, appeal: r.appealVerdict, overturned: r.overturned, note: r.outcome })), null, 1));
console.log(overturned ? "APPEAL OVERTURNED ON-CHAIN" : "NO OVERTURN ACHIEVED (honest result recorded)");
