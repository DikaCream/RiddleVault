// Typed wrapper around the RiddleVault intelligent contract using genlayer-js.
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { TransactionHash } from "genlayer-js/types";
import { CONTRACT_ADDRESS, RPC_URL } from "./config";
import type { EthereumProvider } from "./wallet";

export type VaultStatus = "OPEN" | "SOLVED" | "EXPIRED" | "REJECTED";
export type Verdict = "SOLVED" | "PARTIAL" | "WRONG";
export type Mode = "RUBRIC" | "SEALED";

export interface Vault {
  id: number;
  creator: string;
  title: string;
  riddle: string;
  criteria: string[];
  category: string;
  mode: Mode;
  answer_hash: string;
  nonce: string;
  prize: number;
  attempt_fee: number;
  bond: number;
  max_per_player: number;
  max_total: number;
  created_at: number;
  expires_at: number;
  status: VaultStatus;
  reject_reason: string;
  attempts: number;
  fees_in: number;
  pot: number;
  expired: boolean;
  winner: string;
  solved_at: number;
  payout: number;
  winning_attempt: number;
  refunded: number;
  revealed_answer: string;
}

export interface Attempt {
  id: number;
  player: string;
  answer: string;
  verdict: Verdict;
  score: number;
  reasoning: string;
  checks: boolean[];
  fee_paid: number;
  timestamp: number;
  appealed: boolean;
  appeal_argument: string;
  appeal_verdict: "" | Verdict;
  appeal_score: number;
  appeal_reasoning: string;
  bond_forfeited: number;
  overturned: boolean;
}

export interface UserInfo {
  address: string;
  balance: number;
  claimed_start: boolean;
  wins: number;
  winnings: number;
  attempts: number;
  partials: number;
  created: number[];
}

export interface LeaderRow {
  address: string;
  wins: number;
  winnings: number;
  attempts: number;
  partials: number;
}

export interface Stats {
  vaults: number;
  by_status: Record<VaultStatus, number>;
  users: number;
  attempts: number;
  appeals: number;
  overturned: number;
  prize_locked: number;
}

// genlayer-js decodes contract dicts as Map and ints as bigint; normalize to plain JSON values.
export function toPlain(value: unknown): any {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) obj[String(k)] = toPlain(v);
    return obj;
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && (value as object).constructor === Object) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) obj[k] = toPlain(v);
    return obj;
  }
  return value;
}

function requireAddress(): `0x${string}` {
  if (!CONTRACT_ADDRESS) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not configured");
  return CONTRACT_ADDRESS;
}

const readClient = createClient({ chain: studionet, endpoint: RPC_URL });

async function read<T>(functionName: string, args: any[] = []): Promise<T> {
  const result = await readClient.readContract({ address: requireAddress(), functionName, args });
  return toPlain(result) as T;
}

export const getVaults = (status: string, offset: number, limit: number) =>
  read<{ total: number; items: Vault[] }>("get_vaults", [status, offset, limit]);
export const getVault = (id: number) => read<Vault>("get_vault", [id]);
export const getAttempts = (id: number) => read<Attempt[]>("get_attempts", [id]);
export const getUser = (user: string) => read<UserInfo>("get_user", [user]);
export const getLeaderboard = (limit: number) => read<LeaderRow[]>("get_leaderboard", [limit]);
export const getStats = () => read<Stats>("get_stats");

// ------------------------------------------------------------------ transactions

/** Consensus steps shown in the UI, in order (from the transaction's statusName). */
export const TX_STEPS = ["PENDING", "PROPOSING", "COMMITTING", "REVEALING", "ACCEPTED", "FINALIZED"] as const;
const DONE = new Set(["ACCEPTED", "FINALIZED"]);
export const FAILED_STATUSES = new Set(["UNDETERMINED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"]);

export interface TxCallbacks {
  onHash?: (hash: string) => void;
  onStatus?: (status: string) => void;
}

export interface TxResult {
  hash: string;
  statusName: string;
  values: Record<string, unknown>;
}

export class TxError extends Error {
  hash?: string;
  constructor(message: string, hash?: string) {
    super(message);
    this.hash = hash;
  }
}

/** Studio's "readable" return payload is JSON-like but may omit commas; extract scalar fields. */
export function parseReadable(readable: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof readable !== "string") return out;
  for (const m of readable.matchAll(/"(\w+)"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+|true|false)/g)) {
    const raw = m[2];
    try {
      out[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw === "true" ? true : raw === "false" ? false : Number(raw);
    } catch {
      out[m[1]] = raw.slice(1, -1);
    }
  }
  return out;
}

function cleanError(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text) return "The contract rejected the transaction";
  const quoted = text.match(/"([^"]{3,200})"/);
  return (quoted ? quoted[1] : text).slice(0, 200);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchTx(hash: string): Promise<any | null> {
  try {
    return await readClient.getTransaction({ hash: hash as TransactionHash });
  } catch {
    return null;
  }
}

async function watchFinalized(hash: string, onStatus: (s: string) => void) {
  const deadline = Date.now() + 3 * 60_000;
  while (Date.now() < deadline) {
    await sleep(5000);
    const tx = await fetchTx(hash);
    if (tx?.statusName === "FINALIZED") return onStatus("FINALIZED");
  }
}

/**
 * Sends a write through MetaMask, then polls the transaction and reports every consensus
 * status change (PENDING → PROPOSING → COMMITTING → REVEALING → ACCEPTED → FINALIZED).
 */
export async function sendTx(
  author: `0x${string}`,
  provider: EthereumProvider,
  functionName: string,
  args: unknown[],
  cb: TxCallbacks = {},
): Promise<TxResult> {
  const address = requireAddress();
  const writeClient = createClient({ chain: studionet, endpoint: RPC_URL, account: author, provider: provider as any });
  const hash: string = await writeClient.writeContract({ address, functionName, args: args as any, value: BigInt(0) });
  cb.onHash?.(hash);
  cb.onStatus?.("PENDING");

  let status = "PENDING";
  let tx: any = null;
  const deadline = Date.now() + 6 * 60_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const next = await fetchTx(hash);
    if (!next) continue;
    tx = next;
    const s = String(tx.statusName ?? status);
    if (s !== status) {
      status = s;
      cb.onStatus?.(s);
    }
    if (DONE.has(s) || FAILED_STATUSES.has(s)) break;
  }
  if (!DONE.has(status)) {
    throw new TxError(
      FAILED_STATUSES.has(status)
        ? `Validators could not agree (status: ${status})`
        : `Still ${status.toLowerCase()} after 6 minutes. Studionet may be busy; the transaction can still complete, check the explorer.`,
      hash,
    );
  }

  const receipts = tx?.consensus_data?.leader_receipt;
  const leader = Array.isArray(receipts) ? receipts[0] : receipts;
  const readable = leader?.result?.payload?.readable;
  if (leader?.execution_result && leader.execution_result !== "SUCCESS") {
    throw new TxError(cleanError(readable || leader?.genvm_result?.stderr), hash);
  }
  if (status === "ACCEPTED" && cb.onStatus) void watchFinalized(hash, cb.onStatus);
  return { hash, statusName: status, values: parseReadable(readable) };
}
