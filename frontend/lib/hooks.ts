"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CONTRACT_ADDRESS } from "./config";
import { getAttempts, getLeaderboard, getStats, getUser, getVault, getVaults, sendTx, TxError, type TxResult } from "./riddlevault";
import { getProvider } from "./wallet";
import { useWallet } from "./WalletProvider";

const enabled = !!CONTRACT_ADDRESS;

export const useVaults = (status: string) =>
  useQuery({ queryKey: ["rv", "vaults", status], queryFn: () => getVaults(status, 0, 60), enabled, refetchInterval: 15_000 });

export const useVault = (id: number | null) =>
  useQuery({ queryKey: ["rv", "vault", id], queryFn: () => getVault(id as number), enabled: enabled && id !== null, refetchInterval: 8_000 });

export const useAttempts = (id: number | null, count: number) =>
  useQuery({ queryKey: ["rv", "attempts", id, count], queryFn: () => getAttempts(id as number), enabled: enabled && id !== null && count > 0, placeholderData: (prev) => prev });

export const useUser = (user: string | null) =>
  useQuery({ queryKey: ["rv", "user", user], queryFn: () => getUser(user as string), enabled: enabled && !!user, refetchInterval: 20_000 });

export const useLeaderboard = (limit = 25) =>
  useQuery({ queryKey: ["rv", "leaderboard", limit], queryFn: () => getLeaderboard(limit), enabled, refetchInterval: 20_000 });

export const useStats = () => useQuery({ queryKey: ["rv", "stats"], queryFn: getStats, enabled, refetchInterval: 15_000 });

/** Re-renders every `ms` so countdowns stay live. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Runs one contract write with live consensus status; refreshes all queries afterwards. */
export function useTx() {
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (functionName: string, args: unknown[]): Promise<TxResult | null> => {
      const provider = getProvider();
      if (!address || !provider) {
        setError("Connect MetaMask first");
        return null;
      }
      setBusy(true);
      setError(null);
      setHash(null);
      setStatus("SIGNING");
      try {
        return await sendTx(address, provider, functionName, args, { onHash: setHash, onStatus: setStatus });
      } catch (e: any) {
        if (e instanceof TxError && e.hash) setHash(e.hash);
        setError(friendlyError(e));
        return null;
      } finally {
        setBusy(false);
        queryClient.invalidateQueries({ queryKey: ["rv"] });
      }
    },
    [address, queryClient],
  );

  const reset = useCallback(() => {
    setStatus(null);
    setHash(null);
    setError(null);
  }, []);

  return { run, status, hash, error, busy, reset };
}

export function friendlyError(e: any): string {
  if (e?.code === 4001 || /user rejected|denied/i.test(e?.message ?? "")) {
    if (!(e instanceof TxError)) return "Transaction was rejected in your wallet";
  }
  return e?.shortMessage || e?.message || "Something went wrong";
}
