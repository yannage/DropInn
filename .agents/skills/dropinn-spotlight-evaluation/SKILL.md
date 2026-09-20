---
name: dropinn-spotlight-evaluation
description: Evaluate DropInn Spotlight interpretation after changes to providers, prompts, schemas, scene effects, or creative previews. Separate generated-response quality from authored fallback, five-second latency, and signed confirmation behavior; use for live evaluation planning and results analysis.
---

# DropInn Spotlight evaluation

Read `server/ai.ts`, `scripts/evaluate-ai.mjs`, and `docs/ai-evaluation.md` from the repository root. Use [rubric.md](references/rubric.md) for cases, measurements, and follow-through.

1. Identify what changed and select the corresponding cases. Keep authored suggestions, arbitrary creative interpretation, and post-resolution narration distinct.
2. Run relevant deterministic checks in `server/ai.test.ts`, `server/dropinn.test.ts`, and `src/store/adventureStore.test.ts`. They establish timeout/validation/signature/UI behavior, not live model competence.
3. Before live inference, establish the explicitly configured provider/model and target. Follow existing task authorization for any paid calls or submitted data; do not enable hosted inference merely to review code. Never silently switch providers or lengthen the shared deadline.
4. Use the existing evaluation script with explicit `--provider ollama` or `--provider openai`. It writes an ignored report and does not change game data; OpenAI calls can incur charges. An unavailable local service or missing credentials is a setup blocker, not evidence of incorrect interpretation.
5. Score generated semantics separately from fallback and latency. Read [rubric.md](references/rubric.md) before claiming success. The current adapter conflates timeout/refusal/unavailability/invalid output; report unknown causes honestly. Add bounded diagnostics only when implementation is in scope.
6. Preserve the five-second deadline, server-signed previews, authored outcomes, and confirmation-only token spending. Use `dropinn-playtest` when the task includes the browser confirmation flow.

Store timestamp/model/revision/results in `output/`; summarize durable findings in `docs/ai-evaluation.md` and update `NEXT.md` only for work actually completed. This skill does not authorize publishing a provider configuration or evaluating private player conversations.
