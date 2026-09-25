"""Stage 3b: the Haiku routing baseline, batched to stay inside the spike's cost ceiling.

Each call sees every skill's one-line summary and up to BATCH numbered requests, and must
answer one label per request. Batching changes the task slightly from one request per call
and is recorded as a limitation. Runs like 02_generate.py: an empty directory, project-only
settings, one turn, no tools. Cost per call goes to eval/haiku-ledger.json.

  python 05_haiku.py <set>   # heldout1 | heldout2
"""

import json
import re
import subprocess
import sys
import tempfile
import time

from common import SPIKE, accuracy, load

SET = sys.argv[1]
FILE = {"heldout1": "test-routing.json", "heldout2": "heldout2-routing.json"}[SET]
MODEL = "claude-haiku-4-5-20251001"
BATCH = 17


def main():
    criteria = load("skill-criteria.json")
    menu = "\n".join(f"- {k}: {v}" for k, v in criteria.items())
    items = [i for i in load(FILE)["items"] if i.get("kind") != "explicit"]
    rows, ledger = [], []
    for start in range(0, len(items), BATCH):
        chunk = items[start:start + BATCH]
        numbered = "\n".join(f"{n + 1}. {i['request']}" for n, i in enumerate(chunk))
        prompt = f"""Route each request an engineer typed to an AI coding agent to exactly one workflow skill,
or to "none" when no skill applies. Skills:
{menu}

Requests:
{numbered}

Answer with only a JSON array of {len(chunk)} skill names in request order."""
        with tempfile.TemporaryDirectory() as empty:
            t0 = time.perf_counter()
            proc = subprocess.run(["claude", "-p", prompt, "--model", MODEL, "--max-turns", "1",
                                   "--setting-sources", "project", "--output-format", "json", "--tools", ""],
                                  cwd=empty, capture_output=True, text=True, timeout=600)
            ms = (time.perf_counter() - t0) * 1000
        record = json.loads(proc.stdout)
        labels = json.loads(re.search(r"\[[\s\S]*\]", record["result"]).group(0))
        ledger.append({"batch": start // BATCH, "n": len(chunk), "usd": record.get("total_cost_usd", 0.0), "ms": round(ms)})
        for item, got in zip(chunk, labels + [None] * (len(chunk) - len(labels))):
            rows.append({"id": item["id"], "lang": item.get("lang"), "expected": item["label"], "got": got,
                         "correct": got == item["label"]})
    debug = SPIKE / "debug" / "03-eval" / f"{SET}-haiku"
    debug.mkdir(parents=True, exist_ok=True)
    (debug / "routing-haiku.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))
    summary = {"set": SET, "model": MODEL, "batch": BATCH, "n": len(rows), "accuracy": accuracy(rows),
               "accuracy_pt": accuracy([r for r in rows if r["lang"] == "pt"]),
               "usd": round(sum(c["usd"] for c in ledger), 4), "calls": ledger}
    (SPIKE / "eval" / f"{SET}-haiku.json").write_text(json.dumps(summary, indent=1) + "\n")
    print(json.dumps({k: v for k, v in summary.items() if k != "calls"}))


if __name__ == "__main__":
    main()
