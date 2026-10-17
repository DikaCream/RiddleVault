// Client-side sealing for SEALED vaults. The secret answer never leaves the browser:
// only sha256(nonce|normalized answer) goes on-chain. Must match `answer_digest` in the contract.
export function normalize(text: string): string {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join(" ");
}

export async function sealAnswer(nonce: string, answer: string): Promise<string> {
  const data = new TextEncoder().encode(`${nonce}|${normalize(answer)}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomNonce(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const KEY = (addr: string, vaultId: number) => `riddlevault:secret:${addr.toLowerCase()}:${vaultId}`;
const PENDING = (addr: string) => `riddlevault:pending:${addr.toLowerCase()}`;

/** The creator's secret is kept in this browser only so they can reveal it later; clearing storage loses it. */
export const saveSecret = (addr: string, vaultId: number, answer: string) => localStorage.setItem(KEY(addr, vaultId), answer);
export const loadSecret = (addr: string, vaultId: number) => localStorage.getItem(KEY(addr, vaultId)) ?? "";
export const savePending = (addr: string, answer: string) => localStorage.setItem(PENDING(addr), answer);
export const takePending = (addr: string) => {
  const v = localStorage.getItem(PENDING(addr)) ?? "";
  localStorage.removeItem(PENDING(addr));
  return v;
};
