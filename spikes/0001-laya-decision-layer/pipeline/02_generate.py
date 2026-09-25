"""Stage 2a: generate training data with a teacher model through the Claude Code CLI.

Each call runs in an empty temporary directory with project-only settings, one turn and no
tools, so the teacher sees only the prompt. The teacher never sees the held-out fixtures.
Outputs land in ~/.cache/laya-spike/train/ (outside the repository); a cost ledger with
the host-reported cost of every call is written to eval/generation-ledger.json.

  python 02_generate.py probe            # one routing call, to measure cost
  python 02_generate.py all [--max-usd N] # every call, stopping before the budget
  python 02_generate.py v2 [--max-usd N]  # boundary commands and neighbouring-skill requests
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from common import SPIKE, load

REPO = SPIKE.parent.parent
OUT = Path.home() / ".cache" / "laya-spike" / "train"
OUT.mkdir(parents=True, exist_ok=True)
LEDGER = SPIKE / "eval" / "generation-ledger.json"
MODEL = "claude-sonnet-5"


def skill_card(name):
    text = (REPO / "src" / "skills" / "claude-code" / name / "SKILL.md").read_text()
    end = text.index("\n---", 4)
    body = text[end + 4:].strip()
    return text[4:end].strip() + "\n\n" + body[:1800]


def call(prompt):
    with tempfile.TemporaryDirectory() as empty:
        proc = subprocess.run(
            ["claude", "-p", prompt, "--model", MODEL, "--max-turns", "1", "--setting-sources", "project",
             "--output-format", "json", "--tools", ""],
            cwd=empty, capture_output=True, text=True, timeout=600, stdin=subprocess.DEVNULL)
    if proc.returncode != 0:
        raise RuntimeError(f"teacher call failed ({proc.returncode}): {proc.stderr[-500:]}")
    record = json.loads(proc.stdout)
    text = record.get("result", "")
    match = re.search(r"\[[\s\S]*\]", text)
    if not match:
        raise RuntimeError(f"no JSON array in teacher output: {text[:300]}")
    return json.loads(match.group(0)), record.get("total_cost_usd", 0.0)


def routing_prompt(name, labels):
    others = ", ".join(l for l in labels if l not in (name, "none"))
    return f"""You are generating training data for a request router in an engineering-workflow kit.
Here is one skill's definition:

<skill>
{skill_card(name)}
</skill>

Write 36 distinct requests a developer might type to an AI coding agent, as a JSON array of
objects {{"request": str, "label": str, "lang": "en"|"pt"}}.
- 26 requests are clearly the job of this skill: label "{name}". Vary length (5 to 45 words),
  tone, and context; describe the situation rather than naming the skill, never use the skill's
  name, slash command, or quoted trigger phrases verbatim; write 7 of them in Brazilian Portuguese.
- 10 requests are near misses that sound related but belong to a different skill or to none:
  label each with the right one from this list, or "none": {others}.
Output only the JSON array."""


def none_prompt():
    return """Generate training data for a request router in an engineering-workflow kit whose skills
cover planning documents, research, tests, review, commits, pull requests, releases, hooks, and
writing in the owner's voice. Write 70 requests that need NO workflow skill: plain questions
about code or tools, one-line mechanical edits, acknowledgements, small talk, and general
programming questions. Vary length and tone; write 20 in Brazilian Portuguese. Output only a
JSON array of objects {"request": str, "label": "none", "lang": "en"|"pt"}."""


def effects_prompt(kind, definitions):
    return f"""Generate training data for a classifier of shell commands an AI coding agent may run
in a git repository. Classes:
- local: {definitions['local']}
- irreversible: {definitions['irreversible']}
- outward: {definitions['outward']}
Write 90 distinct, realistic commands whose correct class is "{kind}" (git, gh, npm, npx,
node, python, curl, rm, cp, mv, brew, shell redirections, and tools a Node project uses), with
varied flags and paths. Include hard cases near the boundary with the other classes. Output
only a JSON array of objects {{"command": str, "label": "{kind}"}}."""


def trivial_prompt(trivial):
    side = ("quick requests: a question about code or tools, an acknowledgement, or a one-line "
            "mechanical edit that needs no research, tests, review, or outward step") if trivial else \
           ("requests that need a real engineering workflow: a feature, a bug hunt, a refactor, a "
            "review, a plan, a release, or any outward step")
    return f"""Generate training data for a classifier of requests to an AI coding agent. Write 110
distinct {side}. Vary length (1 to 40 words) and tone; write 30 in Brazilian Portuguese.
Output only a JSON array of objects {{"request": str, "trivial": {str(trivial).lower()}, "lang": "en"|"pt"}}."""


NEIGHBOURS = [
    ("ad-review", "ad-audit"), ("ad-pr", "ad-merge"), ("ad-commit", "ad-pr"), ("ad-grill-me", "ad-question-me"),
    ("ad-ground", "ad-research"), ("ad-ground", "ad-tdg"), ("ad-spike", "ad-tdg"), ("ad-derisk", "ad-task"),
    ("ad-brief", "ad-handoff"), ("ad-brief", "ad-roadmap"), ("ad-next", "ad-roadmap"), ("ad-drift", "ad-architecture"),
    ("ad-guidelines", "ad-bootstrap"), ("ad-community-docs", "ad-guidelines"), ("ad-domain", "ad-design"),
    ("ad-deepen", "ad-philosophy"), ("ad-voice", "ad-voice-tune"), ("ad-publish", "ad-report"),
    ("ad-template-tune", "ad-publish"), ("ad-skill", "ad-subagent"), ("ad-spec", "ad-prd"), ("ad-adr", "ad-research"),
]


def neighbours_prompt(pairs):
    lines = "\n".join(f"- {a} versus {b}" for a, b in pairs)
    cards = "\n\n".join(f"<skill name=\"{n}\">\n{skill_card(n)[:900]}\n</skill>" for n in sorted({x for p in pairs for x in p}))
    return f"""You are generating training data for a request router in an engineering-workflow kit.
Some skills are easy to confuse. For each pair below, write 4 requests that clearly belong to the
first skill and 4 that clearly belong to the second, each one close enough to the other skill that a
careless router could mix them up; the difference must be in what the request actually asks for.
{lines}

Skill definitions:
{cards}

Never use a skill's name, slash command, or phrases copied from its definition. Write a quarter in
Brazilian Portuguese. Output only a JSON array of objects {{"request": str, "label": str, "lang": "en"|"pt"}}."""


def effects_wide_prompt(kind, definitions):
    return f"""Generate training data for a classifier of shell commands an AI coding agent may run on a
developer's machine while working in a git repository. Classes:
- local: {definitions['local']}
- irreversible: {definitions['irreversible']}
- outward: {definitions['outward']}
Write 90 distinct, realistic commands whose correct class is "{kind}", deliberately spread across the
whole range of tools a developer's machine runs beyond git and npm: other package and version managers,
cloud and container CLIs, deployment and infrastructure tools, system configuration and schedulers,
remote copy and sync, databases, messaging and publishing CLIs. Include hard cases near the boundary
with the other classes. Output only a JSON array of objects {{"command": str, "label": "{kind}"}}."""


def jobs_v2():
    definitions = load("test-effects.json")["definitions"]
    for kind in ("local", "irreversible", "outward"):
        yield f"effects-wide-{kind}", effects_wide_prompt(kind, definitions)
    yield "routing-neighbours-a", neighbours_prompt(NEIGHBOURS[:11])
    yield "routing-neighbours-b", neighbours_prompt(NEIGHBOURS[11:])


def jobs():
    labels = list(load("skill-criteria.json"))
    definitions = load("test-effects.json")["definitions"]
    for name in labels:
        if name != "none":
            yield f"routing-{name}", routing_prompt(name, labels)
    yield "routing-none", none_prompt()
    for kind in ("local", "irreversible", "outward"):
        yield f"effects-{kind}", effects_prompt(kind, definitions)
    yield "trivial-true", trivial_prompt(True)
    yield "trivial-false", trivial_prompt(False)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "probe"
    max_usd = float(sys.argv[sys.argv.index("--max-usd") + 1]) if "--max-usd" in sys.argv else 8.0
    ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else {"model": MODEL, "calls": []}
    done = {c["job"] for c in ledger["calls"]}
    spent = sum(c["usd"] for c in ledger["calls"])
    for job, prompt in (jobs_v2() if mode == "v2" else jobs()):
        if job in done:
            continue
        if spent >= max_usd:
            print(f"stopping before {job}: spent {spent:.2f} of {max_usd:.2f}")
            break
        items, usd = call(prompt)
        (OUT / f"{job}.json").write_text(json.dumps(items, ensure_ascii=False, indent=1))
        spent += usd
        ledger["calls"].append({"job": job, "items": len(items), "usd": round(usd, 4)})
        LEDGER.write_text(json.dumps(ledger, indent=1) + "\n")
        print(f"{job}: {len(items)} items, USD {usd:.4f}, total {spent:.2f}", flush=True)
        if mode == "probe":
            break


if __name__ == "__main__":
    main()
