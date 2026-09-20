# Evidence record

Save a concise record beside the relevant artifacts in `output/`:

```text
Task/change and git revision (note uncommitted changes):
Scenario and initial state:
Backend verified from response; server/deployment revision if known:
Browser, viewport/input mode, distinct QA identities (aliases only):
Assertions and observed turn/revision/reward deltas:
Failure injection: before-send, lost response, reads only, or offline:
Passed / failed / not run:
Artifacts and relevant test commands/results:
Setup time and script/locator repairs needed:
Cleanup performed and remaining QA data:
Limits: local / API / Realtime / physical-device evidence:
```

Judge skill usefulness on a real changed feature: reproduce the failure, verify the fix, then repeat from fresh sessions. Compare setup time and manual repairs. Do not assert measured improvement from skill validation alone.
