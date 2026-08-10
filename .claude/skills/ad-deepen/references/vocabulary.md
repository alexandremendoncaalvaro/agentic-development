# Deepening vocabulary (ADR-0020 / WORKFLOW §8)

Canonical vocabulary for `ad-deepen`, used verbatim throughout the skill's output.

- **Module** — any unit with an interface and an implementation.
- **Interface** — what callers see.
- **Implementation** — what they don't.
- **Depth** — behavior leverage at the interface. Deep modules hide a lot of behavior behind a small interface.
- **Seam** — where behavior can be altered without editing in place (Feathers).
- **Adapter** — a concrete thing satisfying an interface at a seam. *Role*, not *substance*.
- **Leverage** — what callers gain from depth.
- **Locality** — what maintainers gain from depth (concentrated change, bugs, knowledge).

Never use:

- "Boundary" (overloaded with DDD bounded contexts) — use *Seam* or *Interface*.
- "Service" / "Handler" / "Manager" / "Helper" without a domain noun in front — these are noise.
- "Depth = implementation lines / interface lines" — explicitly rejected by ADR-0020. Rewards padding.

When the candidate's friction touches a domain noun, use the domain noun from `CONTEXT.md` ("the *Order* aggregate"), not a generic placeholder ("the order service").
