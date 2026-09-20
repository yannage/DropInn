# DropInn agent guidance

Read [CLAUDE.md](CLAUDE.md) for the code map, local development commands, and gameplay invariants.

Before creating or substantially revising any player-facing story, read [the storytelling and pacing baseline](docs/storytelling-guide.md) and use [the story packet template](docs/stories/TEMPLATE.md). Apply its Story Circle, drop-in pacing and outcome review to authored adventures, community adaptations and AI-assisted drafts. Distinguish design drafts from implemented or published stories.

For MS Paint / MS painter artwork, sheep-style characters, NPCs, props, or scene illustrations, use [dropinn-art](.agents/skills/dropinn-art/SKILL.md). It contains the visual references, prompts, asset inventory, and generation/QA workflow. The same game-development task can generate and integrate the artwork.

For modular hero parts, also read [docs/hero-art.md](docs/hero-art.md) before changing an asset. Preserve the full canvas, alignment, tint masks, and saved catalog IDs.

For V2 feature verification across two players, reconnects, hero saves, or mobile input, use [dropinn-playtest](.agents/skills/dropinn-playtest/SKILL.md).

For persisted fields, authentication/ownership, migrations, command/reward transactions, or Netlify/Supabase failures, use [dropinn-hosted-contract](.agents/skills/dropinn-hosted-contract/SKILL.md).

For provider, prompt, creative-effect, or signed-preview evaluation, use [dropinn-spotlight-evaluation](.agents/skills/dropinn-spotlight-evaluation/SKILL.md). Live inference and hosted checks follow the current task's authorization; skill selection alone does not authorize external writes.
