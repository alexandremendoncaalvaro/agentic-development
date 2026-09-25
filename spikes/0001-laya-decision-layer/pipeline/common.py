"""Shared fixture loading, scoring, and the deterministic baselines for spike 0001."""

import json
import re
import time
from pathlib import Path

SPIKE = Path(__file__).resolve().parent.parent
FIX = SPIKE / "fixtures"


def load(name):
    return json.loads((FIX / name).read_text())


# Point 1: an explicit request names its skill; no model is needed.
MENTION = re.compile(r"^[/$]([a-z0-9][a-z0-9-]*)(?:\s|$)")


def explicit_route(request):
    match = MENTION.match(request.strip())
    return match.group(1) if match else None


# Point 2 baseline, written from the ADR-0085 definitions: outward reaches other
# people or systems; irreversible is a change git cannot restore.
OUTWARD = [
    r"^git push(?! --force)",
    r"\bgit push origin v?\d",
    r"^gh pr (create|merge|comment|review|close|edit)\b",
    r"^gh issue (create|comment|close|edit)\b",
    r"^gh release (create|upload|edit)\b",
    r"^gh api .*(-f |-X (POST|PUT|PATCH|DELETE))",
    r"^npm (publish|dist-tag)\b",
    r"^curl .*-X (POST|PUT|PATCH|DELETE)",
    r"&& git push\b",
]
IRREVERSIBLE = [
    r"^git push .*--force",
    r"^git reset --hard",
    r"^git clean -[a-z]*f",
    r"^git rebase\b",
    r"^git commit .*--amend",
    r"^git stash (drop|clear)",
    r"^git branch -D",
    r"^git worktree remove .*--force",
    r"^rm .*(~|\$HOME|/Users/|\s/)",
    r"^rm -[a-z]*f",
    r"(>|>>|cp .*|mv .*)\s*~",
    r"^npm (install|i) -g\b",
    r"^npx --yes\b",
    r"^(lefthook|pre-commit) install\b",
    r"^npx husky\b",
    r"^brew install\b",
    r"^defaults write\b",
    r"^node bin/agentic\.js (init|update)(?!.*--(help|scope project|dry-run))",
]


def pattern_effect(command):
    """Return (label, matched) where matched is False when no rule fired."""
    for rule in IRREVERSIBLE:
        if re.search(rule, command):
            return "irreversible", True
    for rule in OUTWARD:
        if re.search(rule, command):
            return "outward", True
    return "local", False


# Point 3 baseline: short, or a question without a change verb.
CHANGE = re.compile(
    r"\b(add|implement|refactor|fix|write|create|open|publish|design|migrate|research|set up|"
    r"audit|split|change|delete|review|record|implementa|cria|revisa|audita|registra|muda)\b",
    re.IGNORECASE,
)


def heuristic_trivial(request):
    text = request.strip()
    if len(text) <= 20:
        return True
    if text.endswith("?") and not CHANGE.search(text):
        return True
    return not CHANGE.search(text) and len(text) <= 60


def timed(fn, *args, **kwargs):
    start = time.perf_counter()
    value = fn(*args, **kwargs)
    return value, (time.perf_counter() - start) * 1000


def accuracy(rows, key="correct"):
    return round(sum(1 for r in rows if r[key]) / len(rows), 3) if rows else None


def p50(values):
    ordered = sorted(values)
    return round(ordered[len(ordered) // 2], 1) if ordered else None
