"""Stage 2b: fine-tune Laya on the teacher data, single device (MPS), one multi-task model.

A port of the training loop in Laya's notebook
`notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb` (RLCD: sampled noisy logits,
a proper-scoring-rule reward with a group baseline, plus soft cross-entropy), without DDP or
CUDA. All three decision points train together as separate question types over one encoder.

  python 03_train.py <out_dir> [epochs]
"""

import json
import random
import shutil
import sys
import time
from pathlib import Path

import torch
from safetensors.torch import load_file, save_file
from transformers import AutoTokenizer

from laya.common import QTYPES, build_model, build_sequence, proper_reward
from laya.shortlist import render_options

from common import load, questions

BASE = next((Path.home() / ".cache/laya-spike/hf/hub/models--convaiinnovations--laya-multilingual/snapshots").iterdir())
TRAIN = Path.home() / ".cache/laya-spike/train"
OUT = Path(sys.argv[1])
EPOCHS = int(sys.argv[2]) if len(sys.argv) > 2 else 4
MICRO_BATCH, GRAD_ACCUM, GROUP_SIZE = 8, 4, 4
LR_ENCODER, LR_HEAD = 2.5e-5, 1.0e-4
SIGMA_START, SIGMA_END = 0.4, 0.1
MAX_LEN, HEAD_MAX_LEN = 1024, 512
DEVICE = torch.device("mps" if torch.backends.mps.is_available() else "cpu")


def teacher_rows():
    rows = []
    for path in sorted(TRAIN.glob("*.json")):
        for item in json.loads(path.read_text()):
            if path.name.startswith("routing-"):
                rows.append(("route", item["request"], item["label"]))
            elif path.name.startswith("effects-"):
                rows.append(("effect", item["command"], item["label"]))
            elif path.name.startswith("trivial-"):
                rows.append(("size", item["request"], "quick" if item["trivial"] else "workflow"))
    return rows


def build_item(tok, qs, qid, state, gold):
    q = qs[qid]
    keys = list(q["crit"].keys())
    if gold not in keys:
        return None
    target = [1.0 if k == gold else 0.0 for k in keys]
    seq, markers = build_sequence(tok, state, q, MAX_LEN, HEAD_MAX_LEN)
    if len(markers) != len(render_options({"t": q["t"], "crit": q["crit"]})):
        return None
    return {"ids": seq, "markers": markers, "qtype": QTYPES[q["t"]], "target": target,
            "label": keys.index(gold), "qid": qid}


def collate(items, pad_id):
    n, length = len(items), max(len(it["ids"]) for it in items)
    kmax = max(len(it["markers"]) for it in items)
    ids = torch.full((n, length), pad_id, dtype=torch.long)
    att = torch.zeros((n, length), dtype=torch.long)
    mpos = torch.zeros((n, kmax), dtype=torch.long)
    mmask = torch.zeros((n, kmax), dtype=torch.bool)
    target = torch.zeros((n, kmax), dtype=torch.float32)
    for i, it in enumerate(items):
        ids[i, : len(it["ids"])] = torch.tensor(it["ids"])
        att[i, : len(it["ids"])] = 1
        k = len(it["markers"])
        mpos[i, :k] = torch.tensor(it["markers"])
        mmask[i, :k] = True
        target[i, :k] = torch.tensor(it["target"])
    return ids, att, mpos, mmask, target, torch.tensor([it["qtype"] for it in items])


def main():
    cfg = json.loads((BASE / "rl_agent_config.json").read_text())
    cfg.update({"gradient_checkpointing": True, "max_len": MAX_LEN, "head_max_len": HEAD_MAX_LEN})
    tok = AutoTokenizer.from_pretrained(BASE / "tokenizer")
    model = build_model(cfg, encoder_dir=str(BASE / "encoder"))
    model.load_state_dict(load_file(BASE / "model.safetensors"), strict=True)
    model.encoder.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    model.head_checkpointing = True
    model.to(DEVICE).train()

    qs = questions()
    items = [it for it in (build_item(tok, qs, qid, s, g) for qid, s, g in teacher_rows()) if it]
    random.Random(20260925).shuffle(items)
    n_val = max(40, len(items) // 10)
    val, train = items[:n_val], items[n_val:]
    print(f"{len(train)} train, {len(val)} validation items on {DEVICE}", flush=True)

    enc = [p for n, p in model.named_parameters() if "encoder." in n]
    head = [p for n, p in model.named_parameters() if "encoder." not in n]
    opt = torch.optim.AdamW([{"params": enc, "lr": LR_ENCODER}, {"params": head, "lr": LR_HEAD}], weight_decay=0.01)
    total = max(1, (len(train) // (MICRO_BATCH * GRAD_ACCUM)) * EPOCHS)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=total, eta_min=1e-6)
    log = []
    t0 = time.time()
    for epoch in range(EPOCHS):
        random.Random(42 + epoch).shuffle(train)
        sigma = SIGMA_START + (SIGMA_END - SIGMA_START) * (epoch / max(1, EPOCHS - 1))
        opt.zero_grad(set_to_none=True)
        losses = []
        for step, start in enumerate(range(0, len(train), MICRO_BATCH), 1):
            ids, att, mpos, mmask, target, qtype = (t.to(DEVICE) for t in collate(train[start:start + MICRO_BATCH], tok.pad_token_id))
            logits, act = model(ids, att, mpos, mmask, qtype)
            logits = logits.float()
            k = mmask.sum(-1, keepdim=True).float()
            eps = torch.randn((GROUP_SIZE,) + logits.shape, device=DEVICE) * sigma * mmask
            eps = (eps - eps.sum(-1, keepdim=True) / k) * mmask
            z = logits.detach().unsqueeze(0) + eps
            q = torch.softmax(z.masked_fill(~mmask, -1e4), -1)
            with torch.no_grad():
                r = proper_reward(q, target.unsqueeze(0), qtype, mmask, w_sph=0.75, w_rps=1.0)
                adv = (r - r.mean(0, keepdim=True)) / (r.std() + 1e-6)
            logp = -(((z - logits.unsqueeze(0)) ** 2) * mmask).sum(-1) / (2 * sigma ** 2)
            loss_ce = -(target * torch.log_softmax(logits.masked_fill(~mmask, -1e4), -1)).sum(-1).mean()
            loss = (-(adv * logp).mean() + loss_ce) / GRAD_ACCUM + 0.0 * act.sum()
            loss.backward()
            if step % GRAD_ACCUM == 0 or start + MICRO_BATCH >= len(train):
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                opt.step()
                sched.step()
                opt.zero_grad(set_to_none=True)
            losses.append(loss.item() * GRAD_ACCUM)
            if step % 50 == 0:
                print(f"epoch {epoch + 1} step {step} loss {sum(losses[-50:]) / 50:.4f} {time.time() - t0:.0f}s", flush=True)
        acc = validate(model, val, tok)
        log.append({"epoch": epoch + 1, "loss": round(sum(losses) / len(losses), 4), "val": acc, "seconds": round(time.time() - t0)})
        print(json.dumps(log[-1]), flush=True)

    temperature = fit_temperature(model, val, tok)
    cfg["temperature"] = [temperature, 1.0, 1.0]  # (choice, score, noul): every spike question is a choice
    cfg.pop("temperature_by_options", None)
    print(f"fitted choice temperature {temperature:.3f} on {len(val)} held-back items", flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    save_file({k: v.float().contiguous().cpu() for k, v in model.state_dict().items()}, OUT / "model.safetensors")
    shutil.copytree(BASE / "encoder", OUT / "encoder", dirs_exist_ok=True)
    shutil.copytree(BASE / "tokenizer", OUT / "tokenizer", dirs_exist_ok=True)
    cfg.pop("gradient_checkpointing", None)
    (OUT / "rl_agent_config.json").write_text(json.dumps(cfg, indent=1))
    (OUT / "train-log.json").write_text(json.dumps({"items": len(train), "validation": len(val), "device": str(DEVICE),
                                                     "epochs": log}, indent=1))


def fit_temperature(model, val, tok):
    """One choice temperature on the held-back split, as Laya's notebook fits one per type."""
    model.eval()
    pairs = []
    with torch.no_grad():
        for start in range(0, len(val), 16):
            chunk = val[start:start + 16]
            ids, att, mpos, mmask, target, qtype = (t.to(DEVICE) for t in collate(chunk, tok.pad_token_id))
            logits, _ = model(ids, att, mpos, mmask, qtype)
            for row, it in zip(logits.float().cpu(), chunk):
                pairs.append((row[: len(it["target"])].tolist(), it["target"]))
    model.train()
    kmax = max(len(z) for z, _ in pairs)
    logits = torch.full((len(pairs), kmax), -1e4)
    target = torch.zeros((len(pairs), kmax))
    for i, (z, tgt) in enumerate(pairs):
        logits[i, : len(z)] = torch.tensor(z)
        target[i, : len(tgt)] = torch.tensor(tgt)
    log_t = torch.zeros(1, requires_grad=True)
    opt = torch.optim.LBFGS([log_t], lr=0.1, max_iter=100)

    def closure():
        opt.zero_grad()
        loss = -(target * torch.log_softmax(logits / log_t.exp(), -1)).sum(-1).mean()
        loss.backward()
        return loss

    opt.step(closure)
    return float(torch.clamp(log_t.exp(), 0.1, 10.0).item())


@torch.no_grad()
def validate(model, val, tok):
    model.eval()
    by = {}
    for start in range(0, len(val), 16):
        chunk = val[start:start + 16]
        ids, att, mpos, mmask, target, qtype = (t.to(DEVICE) for t in collate(chunk, tok.pad_token_id))
        logits, _ = model(ids, att, mpos, mmask, qtype)
        pred = logits.float().masked_fill(~mmask, -1e4).argmax(-1).cpu().tolist()
        for it, p in zip(chunk, pred):
            by.setdefault(it["qid"], []).append(p == it["label"])
    model.train()
    return {qid: round(sum(v) / len(v), 3) for qid, v in by.items()}


if __name__ == "__main__":
    main()
