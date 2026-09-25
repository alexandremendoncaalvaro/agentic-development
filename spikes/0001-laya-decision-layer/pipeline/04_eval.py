"""Stage 3: evaluate a Laya checkpoint and the deterministic baselines on a held-out set.

  python 04_eval.py <checkpoint-or-hub-id> <set>   # set: heldout1 | heldout2

heldout1 is fixtures/test-*.json (written with the baselines in view); heldout2 is
fixtures/heldout2-*.json, written by an independent author who never saw the baselines,
so only heldout2 compares baselines fairly. Explicit /skill requests are left to the
deterministic parser and excluded from routing accuracy. Debug rows go to
debug/03-eval/<set>-<checkpoint>/, the summary to eval/<set>-<checkpoint>.json.
"""

import json
import sys
from pathlib import Path

import laya

from common import (SPIKE, accuracy, heuristic_trivial, load, p50, pattern_effect, questions, timed)

CHECKPOINT, SET = sys.argv[1], sys.argv[2]
NAME = Path(CHECKPOINT).name if Path(CHECKPOINT).exists() else CHECKPOINT.split("/")[-1]
FILES = {"heldout1": ("test-routing.json", "test-effects.json", "test-trivial.json"),
         "heldout2": ("heldout2-routing.json", "heldout2-effects.json", "heldout2-trivial.json")}[SET]
DEBUG = SPIKE / "debug" / "03-eval" / f"{SET}-{NAME}"
DEBUG.mkdir(parents=True, exist_ok=True)


def as_predict(q):
    return {"type": q["t"], "instructions": q["ins"], "criteria": q["crit"]}


def dump(name, rows):
    with open(DEBUG / f"{name}.jsonl", "w") as out:
        for row in rows:
            out.write(json.dumps(row, ensure_ascii=False) + "\n")


def main():
    agent = laya.load(CHECKPOINT)
    if Path(CHECKPOINT).exists():
        cfg = json.loads((Path(CHECKPOINT) / "rl_agent_config.json").read_text())
        agent.cfg["max_len"], agent.cfg["head_max_len"] = cfg["max_len"], cfg["head_max_len"]
    else:
        agent.cfg["max_len"], agent.cfg["head_max_len"] = 1024, 512
    qs = {k: as_predict(v) for k, v in questions().items()}
    summary = {"checkpoint": CHECKPOINT, "set": SET}

    routing = [i for i in load(FILES[0])["items"] if i.get("kind") != "explicit"]
    rows = []
    for item in routing:
        result, ms = timed(agent.predict, item["request"], {"route": qs["route"]})
        got = result["answers"]["route"]["choice"]
        rows.append({"id": item["id"], "lang": item.get("lang"), "expected": item["label"], "got": got,
                     "correct": got == item["label"], "ms": round(ms, 1)})
    dump("routing-laya", rows)
    summary["routing"] = {"laya": {"n": len(rows), "accuracy": accuracy(rows),
                                   "accuracy_pt": accuracy([r for r in rows if r["lang"] == "pt"]),
                                   "p50_ms": p50([r["ms"] for r in rows])}}

    effects = load(FILES[1])["items"]
    table = {"patterns": [], "laya": [], "hybrid": []}
    for item in effects:
        expected = item["label"]
        pattern, matched = pattern_effect(item["command"])
        result, ms = timed(agent.predict, item["command"], {"effect": qs["effect"]})
        model = result["answers"]["effect"]["choice"]
        for name, got in (("patterns", pattern), ("laya", model), ("hybrid", pattern if matched else model)):
            table[name].append({"id": item["id"], "command": item["command"], "expected": expected, "got": got,
                                "correct": got == expected, "gate_correct": (got != "local") == (expected != "local"),
                                "missed_gate": expected != "local" and got == "local",
                                **({"ms": round(ms, 1)} if name == "laya" else {})})
    for name, data in table.items():
        dump(f"effects-{name}", data)
    summary["effects"] = {name: {"n": len(data), "accuracy_3class": accuracy(data),
                                 "accuracy_gate": accuracy(data, "gate_correct"),
                                 "missed_gates": sum(r["missed_gate"] for r in data),
                                 **({"p50_ms": p50([r["ms"] for r in data])} if name == "laya" else {})}
                          for name, data in table.items()}

    trivial = load(FILES[2])["items"]
    table = {"heuristic": [], "laya": []}
    for item in trivial:
        result, ms = timed(agent.predict, item["request"], {"size": qs["size"]})
        got = result["answers"]["size"]["choice"] == "quick"
        table["heuristic"].append({"id": item["id"], "expected": item["trivial"],
                                   "got": heuristic_trivial(item["request"]),
                                   "correct": heuristic_trivial(item["request"]) == item["trivial"]})
        table["laya"].append({"id": item["id"], "expected": item["trivial"], "got": got,
                              "correct": got == item["trivial"], "ms": round(ms, 1)})
    for name, data in table.items():
        dump(f"trivial-{name}", data)
    summary["trivial"] = {name: {"n": len(data), "accuracy": accuracy(data),
                                 **({"p50_ms": p50([r["ms"] for r in data])} if name == "laya" else {})}
                          for name, data in table.items()}

    (SPIKE / "eval" / f"{SET}-{NAME}.json").write_text(json.dumps(summary, indent=1) + "\n")
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
