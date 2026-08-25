# Template curation method

## Source authorization

Private access is a separate decision from template persistence. Before reading,
record the exact source, scope, author filter, author class, date range, artifact
type, and retention mode. Authorization for one repository, channel, directory, or
document set does not authorize adjacent material. Existing credentials do not
expand scope.

Pasted text and public URLs supplied by the user are bounded to that material.
Connectors are optional. When unavailable, use authorized local files, pasted
text, named public sources, or the bundled baseline and state the limitation.

Tell the user that the host may retain conversation and tool history even when
temporary files are deleted. Never promise erasure outside the files controlled by
the workflow.

## Author separation

Classify each source before deriving a rule:

- `owner`: owner-authored work that may establish owner structural preferences;
- `community`: team or community work that may establish shared conventions;
- `external`: public third-party implementation examples;
- `official`: standards, official documentation, or method guidance.

One locator belongs to one author class. A mixed-author thread or document must be
split into separately attributable locators or excluded. Community evidence never
becomes owner identity and never licenses copying a contributor's distinctive
phrase.

## Candidate selection

Match artifact class, type, destination, audience, purpose, and use conditions.
Use the smallest useful evidence set. Length, recency, reactions, downloads, and
popularity may help discover candidates but do not prove usefulness.

For each selected source, derive only load-bearing structural strengths:

- information the reader needs;
- order in which it becomes useful;
- decision, action, or completion made observable;
- destination conventions that remove reader effort;
- risks, limitations, and cases where the shape should not be used.

Do not preserve topic-specific facts as general instructions. Do not create a rule
whose only evidence is that one example happened to contain it. A reusable rule
must either recur across independent evidence, follow an approved method, or be an
explicit owner preference.

## One-delta review

One invocation changes one coherent behavior in one template. Present:

1. current behavior;
2. proposed behavior;
3. affected scope and version change;
4. provenance groups and source summaries;
5. strengths preserved or improved;
6. trade-offs, conflicts, and limitations;
7. exact target layer and visibility;
8. complete candidate and its prepared digest.

Use approve or reject. A deferral is a rejection for persistence purposes. Do not
batch unrelated changes or infer approval from earlier source access.

## Retention and cleanup

Default retention is derived-only. Persist locators, non-identifying summaries,
derived rules, strengths, trade-offs, limitations, and approval state. Do not
persist source bodies, message exports, document snapshots, or model-generated
drafts.

An exact excerpt needs its own explicit retention approval and must satisfy the
contract. Retention approval does not make the excerpt an instruction or license
distinctive phrase copying.

Keep raw sources, the candidate JSON, and the approval JSON in an OS temporary
directory outside every Git repository. Delete them after acceptance, rejection,
or a failed write when cleanup remains possible. Verify the selected template from
the store after a successful write; never treat the temporary candidate as proof
that persistence succeeded.
