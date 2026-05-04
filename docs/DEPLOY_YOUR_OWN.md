# Deploy your own CIO Analytics instance

Step-by-step guide for deploying CIO Analytics in **your own Azure subscription**. Total time: ~20 minutes.

---

## Prerequisites

| What | Why |
|---|---|
| Azure subscription | Hosts the App Service, Storage, and observability stack |
| [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`) | Login and manage resources |
| [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd) (`azd`) | One-command infra + deploy |
| Node.js 20+ | Local dev (optional — the build runs on Azure too) |
| Access to **Azure AI Foundry** (ai.azure.com) | Deploy the Claude and GPT models |

---

## Step 1 — Create a Foundry resource with Claude models (~10 min)

This is the only manual step. The Bicep template provisions everything else.

1. Go to **[ai.azure.com](https://ai.azure.com)** and sign in with your Azure account
2. Click **Create a project** (or use an existing one)
3. When choosing a hub, create a new one in **Sweden Central** (or another region that supports Anthropic models)
4. Once the project is ready, go to **Models + endpoints** → **Deploy model** → **Deploy base model**
5. Deploy these models:
    - `claude-sonnet-4-6` — used by the writer and reviser agents
    - `claude-haiku-4-5` — used by the translator and reviewer agents
    - `gpt-5.5` — optional alternative for the writer and translator agents
6. After deployment, go to the hub's **Overview** → note the **resource name** (e.g. `my-foundry-resource`)
7. Go to **Keys and Endpoint** → copy **Key 1**

You now have:
- **FOUNDRY_RESOURCE**: the resource name (e.g. `my-foundry-resource`)
- **FOUNDRY_API_KEY**: the key you just copied

---

## Step 2 — Deploy with `azd up` (~5 min)

```bash
# Clone the repo
git clone https://github.com/MariusHernes1984/cio-analytics-poc.git
cd cio-analytics-poc

# Login to Azure
az login
azd auth login

# Create a new environment
azd env new cio-analytics-prod   # pick any name you like

# Set the three required secrets
azd env set FOUNDRY_RESOURCE my-foundry-resource
azd env set FOUNDRY_API_KEY <paste-your-api-key>
azd env set POC_PASSWORD <choose-a-strong-password>

# Provision infra + build + deploy
azd up
```

When prompted for a region, choose **Sweden Central** (same as your Foundry resource).

`azd up` provisions:
- **Storage Account** (LRS, blob versioning, 30-day soft-delete)
- **App Service Plan** (P0v3 Linux)
- **App Service** (Node 20, system-assigned managed identity, RBAC to Storage)
- **Log Analytics** + **Application Insights**

After ~5 minutes you get a URL like `https://app-cioa-prod-xxxxx.azurewebsites.net`.

---

## Step 3 — Verify

Open the URL in a browser. You will see a Basic Auth prompt:
- **Username**: anything (e.g. `admin`)
- **Password**: the `POC_PASSWORD` you set above

Then visit `/api/health` — you should see:

```json
{ "status": "ok", "foundry": "reachable", "model": "claude-sonnet-4-6" }
```

The first time you write an article, the default system prompts are auto-seeded.

---

## Using Claude Code to deploy

If you use [Claude Code](https://claude.com/claude-code), you can deploy with a single prompt:

> Clone https://github.com/MariusHernes1984/cio-analytics-poc — my Foundry resource is called `X` with API key `Y`. Deploy it to my Azure subscription in Sweden Central with password `Z`.

Claude Code will run the `azd` commands for you.

---

## Subsequent deploys (app only)

After the initial `azd up`, you only need to redeploy the app code:

```bash
azd deploy
```

Or use the zip deploy method (useful from CI or Windows):

```bash
# Create a zip with forward-slash paths
python -c "
import zipfile, os
with zipfile.ZipFile('deploy.zip','w',zipfile.ZIP_DEFLATED) as zf:
  for r,d,f in os.walk('.'):
    d[:] = [x for x in d if x not in ('node_modules','.next','.git','.local-articles','.local-prompts','.claude')]
    for n in f:
      if n in ('.env.local','deploy.zip'): continue
      p = os.path.join(r,n)
      zf.write(p, os.path.relpath(p,'.').replace(os.sep,'/'))
"

az webapp deploy --name <app-name> --resource-group <rg> --src-path deploy.zip --type zip
```

---

## Local development

```bash
npm install
cp .env.example .env.local
# Edit .env.local — set FOUNDRY_RESOURCE and FOUNDRY_API_KEY
npm run seed           # seeds default prompts to .local-prompts/
npm run dev            # http://localhost:3000
```

No auth locally — `POC_PASSWORD` is only enforced when set.

---

## What the Bicep does NOT provision

| Resource | Why |
|---|---|
| Foundry resource + model deployments | Must be created manually in ai.azure.com (Step 1) |
| Entra ID app registration | PoC uses shared password; see `docs/AUTH_MIGRATION.md` |
| Private endpoints / VNet | Out of scope for PoC |
| Custom domain / SSL cert | App Service provides `*.azurewebsites.net` with TLS |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `azd up` fails on App Service Plan | B1 Linux doesn't work in all regions. The Bicep uses P0v3 which works in Sweden Central. |
| Health check says `foundry: unreachable` | Double-check `FOUNDRY_RESOURCE` and `FOUNDRY_API_KEY` in App Service → Configuration |
| Build fails with missing dependencies | Ensure `SCM_DO_BUILD_DURING_DEPLOYMENT=true` is set (the Bicep does this automatically) |
| Zip deploy returns 400 | Zip paths must use forward slashes (`/`), not backslashes (`\`). Use the Python script above. |
| Articles/prompts are empty after deploy | First run auto-seeds prompts. Articles are per-environment (local files vs Azure Blob). |
