---
name: gauge
description: Assess task complexity locally and compare model proposals through the existing swarm resolver. Use for routing diagnostics and shadow evaluation across the seven harnesses; does not switch native sessions or promote models.
---

# Gauge

Run `bun scripts/gauge.ts assess` with a JSON object on stdin containing `task_text` and `harness`. Optional fields: `current_tier`, `current_model`, `task_model`, `role_model`.

Classification is deterministic. Missing context produces abstention. The resolver and registry remain owned by the swarm package; configure `GAUGE_SWARM_ROOT` to its absolute directory. Missing dependencies produce no model proposal.

The installed shared observer is shadow only. It returns the original route, writes bounded private receipts without raw tasks, and can be disabled with `GAUGE_MODE=off`. There is no live routing mode in this release. Human-reviewed evaluation and separate authorization are required before promotion. See README.md for installation, recovery and compatibility limits.
