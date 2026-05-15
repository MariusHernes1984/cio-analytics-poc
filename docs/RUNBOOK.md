# Runbook · CIO Analytics AI Studio

Operational reference for the deployed PoC. Kept short — most things work and need no attention.

## Resources overview

All resources live in a single resource group in **Sweden Central**:

- `app-cioa-<env>-<hash>` — App Service (P0v3 Linux, Node 20), runs the Next.js app
- `plan-cioa-<env>` — App Service plan
- `cioa<hash>` — Storage account (LRS, blob versioning, 30d soft-delete) with `prompts`, `articles`, `sources`, `users`, and `evaluations` containers
- `appi-cioa-<env>` — Application Insights
- `log-cioa-<env>` — Log Analytics workspace
- **Foundry resource** — provisioned separately (by design — different lifecycle)

## Health check

```bash
curl https://<your-app>.azurewebsites.net/api/health
```

Expected: `{"status":"ok","foundry":"reachable"}`. If `foundry` is not reachable, the app is still up but generations will fail — check Foundry resource, its API key, and the `FOUNDRY_RESOURCE` app setting.

## Monitoring

**Application Insights** is wired in:

- Portal → `appi-cioa-<env>` → **Live metrics** while a generation is running — you'll see the request, CPU, memory
- Portal → `appi-cioa-<env>` → **Failures** for 500-class errors
- Portal → `appi-cioa-<env>` → **Logs** (Kusto) for deep dives
  - `traces | where message contains "foundry"` — inspect agent calls
  - `requests | where resultCode == 401` — any Basic Auth denials

## Common tasks

### Rotate the shared password

1. Portal → App Service → Configuration → Application settings
2. Edit `POC_PASSWORD`, click Save
3. App Service restarts automatically (~30s). No redeploy needed.
4. Communicate the new password out-of-band.

### Change default model for writer or translator

Preferred: change it in the UI. `/prompts/writer` → change the model dropdown → Save as new version. Takes effect immediately, no redeploy.

Alternative (if the UI is unavailable): set `WRITER_MODEL` or `TRANSLATOR_MODEL` env var. Note this only sets the **fallback default** — the persisted prompt version still wins if there's one in storage.

### Roll back a bad prompt edit

1. `/prompts/[agent]/history` → find the last-known-good version → **Set as current**
2. Or API: `POST /api/prompts/[agent]` with body `{"action":"set-current","version":"v0005"}`

Existing articles are unaffected. Only new generations use the restored version.

### Tail logs

Portal → App Service → **Log stream** (live). Or via Azure CLI:

```bash
az webapp log tail --resource-group <rg> --name <app-cioa-name>
```

### Check blob storage contents

```bash
az storage blob list \
  --account-name cioa<hash> \
  --container-name prompts \
  --auth-mode login \
  --query "[].name"
```

Expected layout:
```
prompts/writer/v0001.json
prompts/writer/current.txt
prompts/writer/v0002.json
prompts/translator/v0001.json
prompts/translator/current.txt
articles/<uuid>.json
sources/sources.json
users/users.json
evaluations/cases.json
evaluations/runs.json
```

### Restore a deleted article

Blob container has 30-day soft-delete enabled.

```bash
az storage blob undelete \
  --account-name cioa<hash> \
  --container-name articles \
  --name <uuid>.json \
  --auth-mode login
```

Or use blob versioning to pin to a prior version.

## Incidents

### "Unauthorized" on every request

- **Cause:** `POC_PASSWORD` cleared or mistyped
- **Fix:** re-set in App Service Configuration → restart

### All generations fail with "Foundry unreachable"

- Check `FOUNDRY_RESOURCE` and `FOUNDRY_API_KEY` app settings
- Portal → Foundry resource → Deployments — verify `claude-sonnet-4-6` and `claude-haiku-4-5` still exist and are not paused
- Foundry quota — check for rate-limit or capacity errors in App Insights Failures
- As a last resort, redeploy Foundry to East US 2 (requires Bicep parameter change — see §Risk table in `docs/AUTH_MIGRATION.md`'s parent plan)

### Generations fail partway through with "context too large"

- Research material is over the 1M context. UI has a soft warning at 800k, hard block at 950k — verify it's firing.
- Ask editor to trim research material or split the brief into multiple smaller articles

### Slow first request after deploy (cold start)

- App Service B1 doesn't have autowarm. First request after deploy takes 10–20 seconds. This is expected.
- Workaround: `alwaysOn: true` is already enabled in Bicep, so App Service shouldn't sleep. If you still see cold starts, check the `alwaysOn` setting wasn't disabled.

### Token cost suddenly spikes

- App Insights → Logs:
  ```kusto
  traces
  | where timestamp > ago(1d)
  | where message contains "agent=writer" or message contains "agent=translator"
  | summarize count(), sum(toint(customDimensions["outputTokens"])) by bin(timestamp, 1h)
  ```
- Check for runaway generations (prompt changes that removed output-length constraints)
- Rollback the offending prompt version

## Escalation

- **Foundry capacity / preview SLA:** Microsoft Foundry support
- **App Service platform issues:** Azure support portal
- **App bugs:** file issue in this repo + ping the project owner
