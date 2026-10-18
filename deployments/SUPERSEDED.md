# Deployment notes

Current contract: see `studionet.json` (the address is also the value of `NEXT_PUBLIC_CONTRACT_ADDRESS` for the frontend).

## Superseded contracts (kept only so old explorer links can be recognised; do not use)

| Address | Replaced on | Why |
|---|---|---|
| `0xaadC5cd5e5067CBA6892AC12839747157D31d9F8` | 2026-10-18 | First version: appeal argument and first-panel reasoning were not fenced as untrusted data. |
| `0x6272d45e7ff923555BE805085bd2B13A02566a27` | 2026-10-18 | Hardened contract, but its first e2e run was interrupted and left open vaults, so a clean deployment was made for the recorded e2e results. Same code as the current one. |
