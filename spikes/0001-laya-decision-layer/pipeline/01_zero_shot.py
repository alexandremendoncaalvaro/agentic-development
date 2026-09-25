"""Stage 1: the deterministic baselines and Laya zero-shot on the three held-out fixtures.

Writes one JSON Lines debug file per (point, technique) under debug/01-zero-shot/ and
the summary to eval/stage1.json. Run from the spike directory with the venv under
~/.cache/laya-spike/venv.
"""

import json
import sys

import numpy as np
import laya

from common import (SPIKE, accuracy, explicit_route, heuristic_trivial, load, p50,
                    pattern_effect, timed)

CHECKPOINT = sys.argv[1] if len(sys.argv) > 1 else "convaiinnovations/laya-multilingual"
SHORTLIST_K = 8
DEBUG = SPIKE / "debug" / "01-zero-shot"
DEBUG.mkdir(parents=True, exist_ok=True)


def dump(name, rows):
    with open(DEBUG / f"{name}.jsonl", "w") as out:
        for row in rows:
            out.write(json.dumps(row, ensure_ascii=False) + "\n")


def routing(agent, embed):
    fixture = load("test-routing.json")
    criteria = load("skill-criteria.json")
    labels = list(criteria)
    option_texts = [f"{name}: {criteria[name]}" for name in labels]
    option_vectors = np.asarray(embed(option_texts))
    option_vectors /= np.linalg.norm(option_vectors, axis=1, keepdims=True)
    question = {"route": {"type": "choice",
                          "instructions": "Which workflow skill should handle this request? Pick none when no skill applies.",
                          "criteria": criteria}}
    rows = {"explicit": [], "embedding": [], "laya-shortlist": []}
    for item in fixture["items"]:
        request, expected = item["request"], item["label"]
        if item.get("kind") == "explicit":
            got = explicit_route(request)
            rows["explicit"].append({"id": item["id"], "expected": expected, "got": got, "correct": got == expected})
            continue
        vector, ms_embed = timed(lambda: np.asarray(embed([request]))[0])
        vector = vector / np.linalg.norm(vector)
        scores = option_vectors @ vector
        ranked = [labels[i] for i in np.argsort(-scores)]
        rows["embedding"].append({"id": item["id"], "lang": item["lang"], "expected": expected,
                                  "got": ranked[0], "top8": ranked[:8], "correct": ranked[0] == expected,
                                  "in_top8": expected in ranked[:8], "ms": round(ms_embed, 1)})
        result, ms = timed(laya.predict_shortlist, agent, {"text": request}, question,
                           embed_fn=embed, k=SHORTLIST_K)
        got = result["answers"]["route"]["choice"]
        rows["laya-shortlist"].append({"id": item["id"], "lang": item["lang"], "expected": expected,
                                       "got": got, "shortlist": result["shortlist"]["route"]["labels"],
                                       "correct": got == expected, "ms": round(ms, 1)})
    for name, data in rows.items():
        dump(f"routing-{name}", data)
    return {name: {"n": len(data), "accuracy": accuracy(data),
                   **({"top8_recall": accuracy(data, "in_top8")} if name == "embedding" else {}),
                   **({"p50_ms": p50([r["ms"] for r in data])} if data and "ms" in data[0] else {})}
            for name, data in rows.items()}


def effects(agent):
    fixture = load("test-effects.json")
    definitions = fixture["definitions"]
    question = {"effect": {"type": "choice",
                           "instructions": "What kind of effect does running this shell command have?",
                           "criteria": definitions}}
    rows = {"patterns": [], "laya": [], "hybrid": []}
    for item in fixture["items"]:
        command, expected = item["command"], item["label"]
        gate_expected = expected != "local"
        pattern, matched = pattern_effect(command)
        result, ms = timed(agent.predict, command, question)
        model = result["answers"]["effect"]["choice"]
        hybrid = pattern if matched else model
        for name, got in (("patterns", pattern), ("laya", model), ("hybrid", hybrid)):
            rows[name].append({"id": item["id"], "command": command, "difficulty": item["difficulty"],
                               "expected": expected, "got": got, "correct": got == expected,
                               "gate_correct": (got != "local") == gate_expected,
                               "missed_gate": gate_expected and got == "local",
                               **({"ms": round(ms, 1)} if name == "laya" else {})})
    for name, data in rows.items():
        dump(f"effects-{name}", data)
    summary = {}
    for name, data in rows.items():
        clear = [r for r in data if r["difficulty"] == "clear"]
        summary[name] = {"n": len(data), "accuracy_3class": accuracy(data), "accuracy_gate": accuracy(data, "gate_correct"),
                         "missed_gates": sum(r["missed_gate"] for r in data),
                         "accuracy_gate_clear": accuracy(clear, "gate_correct"),
                         **({"p50_ms": p50([r["ms"] for r in data])} if name == "laya" else {})}
    return summary


def trivial(agent):
    fixture = load("test-trivial.json")
    # A two-option choice with neutral keys, per Laya's own note that noul can follow its labels.
    question = {"size": {"type": "choice",
                         "instructions": "Does this request need a real engineering workflow (research, tests, review, or an outward step), or is it a quick question, acknowledgement, or one-line mechanical edit?",
                         "criteria": {"quick": "a quick question, an acknowledgement, or a one-line mechanical edit",
                                      "workflow": "a change that needs research, tests, review, or an outward step"}}}
    rows = {"heuristic": [], "laya": []}
    for item in fixture["items"]:
        request, expected = item["request"], item["trivial"]
        rows["heuristic"].append({"id": item["id"], "expected": expected, "got": heuristic_trivial(request),
                                  "correct": heuristic_trivial(request) == expected})
        result, ms = timed(agent.predict, request, question)
        got = result["answers"]["size"]["choice"] == "quick"
        rows["laya"].append({"id": item["id"], "lang": item["lang"], "expected": expected, "got": got,
                             "correct": got == expected, "ms": round(ms, 1)})
    for name, data in rows.items():
        dump(f"trivial-{name}", data)
    return {name: {"n": len(data), "accuracy": accuracy(data),
                   **({"p50_ms": p50([r["ms"] for r in data])} if name == "laya" else {})}
            for name, data in rows.items()}


def main():
    agent, load_ms = timed(laya.load, CHECKPOINT)
    # cached_embed_fn is documented upstream but absent from the 0.3.20 wheel.
    embed = laya.embed_fn_from_agent(agent)
    summary = {"checkpoint": CHECKPOINT, "device": str(getattr(agent, "device", "?")),
               "load_ms": round(load_ms), "routing": routing(agent, embed),
               "effects": effects(agent), "trivial": trivial(agent)}
    out = SPIKE / "eval" / f"stage1-{CHECKPOINT.split('/')[-1]}.json"
    out.write_text(json.dumps(summary, indent=1) + "\n")
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
