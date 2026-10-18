import Link from "next/link";
import { Label, PageTitle, Plate } from "@/components/ui";

const REPO = "https://github.com/DikaCream/RiddleVault";

const BLOCKS: [string, string][] = [
  ["Why GenLayer at all", "Whether a free-text answer satisfies a written standard is a judgment call, not a price feed. An oracle such as Chainlink or Pyth cannot say that, and a normal contract can only compare hashes. GenLayer validators each run an LLM on the answer and must reach the same verdict, so no single party (not the creator, not one model) decides who takes the vault."],
  ["When validators disagree", "Each validator re-runs the judgment itself and accepts the leader only if its own SOLVED / PARTIAL / WRONG verdict is identical. If they do not agree, nothing is recorded and no points are charged; you can retry. Malformed model output reverts the same way. The written reasoning and per-criterion flags shown in the ledger come from the leader and are not compared."],
  ["Welded terms", "Riddle, criteria, prize, fee, limits and deadline are written once at creation. The contract has no edit, cancel or withdraw call for creators, so nobody can move the goalposts or pull the prize when a solver is close."],
  ["A jury, not a judge", "Every verdict comes from GenLayer validators who each judge independently and must agree on SOLVED / PARTIAL / WRONG. They only report which criteria are met; the contract turns that into the verdict and score, and the reasoning is public."],
  ["The AI never holds a secret", "In sealed mode only a hash of the answer is stored and only the contract can declare SOLVED, so the AI cannot leak or be tricked into revealing it. In rubric mode there is no secret at all, just public criteria."],
  ["Bad riddles are refused", "A separate AI screen at creation rejects vague, subjective, unjudgeable or trivially guessable riddles, and it costs the creator nothing."],
  ["Appeal with a bond", "Rubric-mode players can appeal a rejected answer to a stricter, fresh panel. Win and the bond comes back plus the vault; lose and the bond joins the pot."],
  ["Nobody profits from a dead vault", "If nobody solves it in time, the creator gets the prize back and every player gets every fee and bond back. An unsolvable riddle earns the creator nothing."],
];

export default function Trust() {
  return (
    <div>
      <PageTitle kicker="Why you can trust the jury" title="How it stays fair" />
      <div className="grid gap-5 md:grid-cols-2">
        {BLOCKS.map(([t, d], i) => (
          <Plate key={t} className="rise p-6" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex items-center gap-3"><span className="engraved brass rounded px-2 py-0.5 text-sm">{String(i + 1).padStart(2, "0")}</span><h2 className="font-stencil text-xl uppercase text-brass-200">{t}</h2></div>
            <p className="mt-3 text-steel-300">{d}</p>
          </Plate>
        ))}
      </div>
      <Plate className="mt-8 p-6">
        <Label>Honest limits</Label>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-steel-300">
          <li>LLM judgment is not perfectly reproducible; borderline answers can flip between panels. That is what the appeal round is for.</li>
          <li>Answers are public on-chain, so someone can copy a pending winning answer (front-running). Wrong answers are public too.</li>
          <li>A creator who knows the answer can play with a second wallet and collect other players&apos; fees. Fees are capped at 10 percent of the prize per try, and points are play money, but it is a real limit.</li>
          <li>Prompt injection: answers are fenced as untrusted data and the verdict comes from per-criterion true/false flags, but no prompt defense is perfect. The appeal argument is also free text read by the panel.</li>
          <li>Rubric-mode reasoning is public and the jury knows how to solve the riddle, so it can hint at solutions; anyone can also ask an LLM. Prefer challenges that are hard to look up.</li>
          <li>Sealed hashes of short or guessable answers can be brute-forced offline.</li>
          <li>Studionet is a test network and can reset.</li>
        </ul>
        <p className="mt-4"><Link className="text-brass-300 underline" href={`${REPO}/blob/main/docs/TRUST_MODEL.md`}>Read the full trust model</Link></p>
      </Plate>
    </div>
  );
}
