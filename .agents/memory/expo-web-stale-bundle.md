---
name: Expo web stale bundle
description: When Expo web preview appears to ignore recent code changes, the Metro watcher may be serving an old bundle.
---

If a web preview test reports behavior from an old version of the code (e.g. a button handler you already changed still does nothing), check the file modification time against the last bundle log. A full `WorkflowsRestart` of the Expo workflow is the reliable fix; manual page reloads or HMR alone may not pick up the new bundle in time.

**Why:** The Metro file watcher can get stuck in this Replit environment, so edits land on disk but the served bundle is not regenerated.
**How to apply:** After significant edits to navigation handlers or context providers, restart the `artifacts/<slug>: expo` workflow and wait for the new bundle before re-testing.
