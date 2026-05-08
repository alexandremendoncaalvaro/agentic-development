# Bootstrap DESIGN.md

Spec: [github.com/google-labs-code/design.md](https://github.com/google-labs-code/design.md) (Apache 2.0). Format: YAML frontmatter (W3C-compatible `$value`/`$type` tokens) + Markdown body (rationale, do's/don'ts).

Canonical sections: `Overview`, `Colors`, `Typography`, `Layout`, `Elevation & Depth`, `Shapes`, `Components`, `Do's and Don'ts`. **Add `Motion`** (easings, durations) — not in the official spec yet.

There is no template — bootstrap from existing tokens.

## Workflow

1. **Retrieval** — point the agent at the source: Figma file, `tailwind.config.js`, `tokens.json`, design system docs, or stylesheet.
2. **Extraction** — agent extracts tokens (colors, typography, spacing, radii, shadows, motion) into YAML frontmatter.
3. **Synthesis** — agent writes the Markdown body: rationale per token group, application rules, do's/don'ts. Cite the source.
4. **Validation** — `npx @google/design.md lint DESIGN.md`. Fix errors before shipping.
5. **Component mapping** — if you use Figma, set up Code Connect to map each Figma component to its code component. Without this, the agent guesses.

## Paste to your agent

> Read the DESIGN.md spec at https://github.com/google-labs-code/design.md. Extract tokens from `<source: Figma URL / tailwind.config.js / tokens.json / stylesheet>`. Generate `DESIGN.md` at the repo root with YAML frontmatter (W3C-compliant `$value`/`$type`) + Markdown body explaining rationale and application rules per token group. Add a `## Motion` section if any easings/durations are defined. Validate with `npx @google/design.md lint`. **Do not invent tokens not in the source** — if a category is missing, leave the section with a `<TODO>` note.
