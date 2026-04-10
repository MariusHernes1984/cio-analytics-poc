# CIO Analytics · AI Studio (PoC)

Proof-of-concept webapp for **Atea CIO Analytics** that uses **Claude in Microsoft Foundry** to:

1. **Write** new Norwegian CIO Analytics case studies from a brief + research material
2. **Review** — auto-scores articles on 6 quality dimensions and suggests improvements
3. **Revise** — AI rewrites the article based on editor feedback or reviewer suggestions
4. **Translate** existing Norwegian articles to English, Swedish, Danish, and Finnish
5. Let editors **edit the system prompts live** via a web UI without redeploying

The UI supports **English and Norwegian** with a one-click toggle.

Built as a Next.js 15 App Router app, deployed to Azure App Service Linux (Sweden Central), hitting Claude via the official `@anthropic-ai/sdk` with a custom `baseURL`.

---

## Quick start (local)

Requires Node 20+.

```bash
npm install
cp .env.example .env.local
# edit .env.local — at minimum you need FOUNDRY_RESOURCE + FOUNDRY_API_KEY
npm run test:foundry   # smoke-test — hits Foundry with a 50-token Norwegian prompt
npm run seed           # writes default prompts to .local-prompts/
npm run dev            # runs on http://localhost:3000
```

The local dev server runs **without any authentication** — auth only kicks in when `POC_PASSWORD` is set (which happens in Azure App Service Configuration, not locally).

Articles and prompts are stored in `.local-prompts/` and `.local-articles/` — both git-ignored.

---

## Environment variables

See `.env.example` for the full list. Required at runtime:

| Var | Purpose | Required |
|---|---|---|
| `FOUNDRY_RESOURCE` | Name of your Foundry resource (without `.services.ai.azure.com`) | Yes |
| `FOUNDRY_API_KEY` | API key for the Foundry resource | Yes |
| `STORAGE_MODE` | `local` (dev) or `azure` (prod) | Defaults to `local` |
| `AZURE_STORAGE_ACCOUNT` | Storage account name, when `STORAGE_MODE=azure` | Conditionally |
| `AZURE_STORAGE_CONNECTION_STRING` | Alternative to account+MI | Conditionally |
| `POC_PASSWORD` | HTTP Basic Auth password for deployed envs | Only in Azure |
| `WRITER_MODEL` | Default model for writer agent | `claude-sonnet-4-6` |
| `TRANSLATOR_MODEL` | Default model for translator agent | `claude-haiku-4-5` |

---

## Project structure

```
src/
  app/                          # Next.js App Router
    api/
      health/route.ts           # GET — pings Foundry
      write/route.ts            # POST — SSE writer streaming
      review/route.ts           # POST — SSE reviewer (auto-quality scoring)
      revise/route.ts           # POST — SSE revision streaming
      translate/route.ts        # POST — SSE translator streaming
      articles/                 # GET list + single
      prompts/[agent]/          # GET/PUT/POST prompts + /test dry-run
      export/docx|md/route.ts   # POST — markdown → file download
    page.tsx                    # Dashboard
    write/, translate/,
    articles/, prompts/         # UI pages
    layout.tsx, globals.css
  components/                   # Client components (Nav, Editor, Viewer, Forms,
                                #   ReviewPanel, ArticleReviser)
  lib/
    env.ts                      # zod-validated env loader
    foundry/
      auth.ts                   # SEAM: api-key → managed identity (future)
      client.ts                 # cached Anthropic SDK with Foundry baseURL
    agents/
      types.ts                  # shared types, stream events, review types
      writer.ts                 # writer runner (sonnet)
      reviewer.ts               # quality reviewer (haiku, hardcoded prompt)
      translator.ts             # translator runner (haiku)
    prompts/
      PromptStore.ts            # SEAM: interface + factory
      BlobPromptStore.ts        # prod impl
      LocalPromptStore.ts       # dev impl
      defaults.ts               # initial Norwegian system prompts (v0001)
    articles/                   # same pattern as prompts/
    export/
      markdown.ts, docx.ts      # file-export helpers
    auth/
      requireSession.ts         # SEAM: stub for Entra ID (future)
    i18n/
      translations.ts           # EN/NO translation dictionary + t() helper
      LanguageProvider.tsx       # client-side React context for language
      getServerLang.ts           # server-side cookie reader
    streaming.ts                # generic SSE helpers (server)
    sseClient.ts                # SSE helpers (browser)
  middleware.ts                 # HTTP Basic Auth (PoC gatekeeper)
infra/
  main.bicep                    # Azure infra as code
  main.parameters.json          # azd parameter file
azure.yaml                      # azd service descriptor
scripts/
  test-foundry.ts               # smoke test (tsx)
  seed-prompts.ts               # seeds default prompts to storage
docs/
  AUTH_MIGRATION.md             # how to replace Basic Auth with Entra ID
  PROMPT_GUIDE.md               # guide for editors working in /prompts
  RUNBOOK.md                    # ops runbook
```

---

## Architecture seams (why the codebase is structured this way)

The PoC is deliberately simple, but three "seams" exist so that production migration is a single-file swap:

| Seam | PoC | Production |
|---|---|---|
| `lib/foundry/auth.ts` | returns static API key | `DefaultAzureCredential` with scope `https://ai.azure.com/.default` |
| `lib/auth/requireSession.ts` | returns `{ok:true}` (Basic Auth handled in middleware) | resolves a NextAuth session against Entra ID |
| `lib/prompts/PromptStore.ts` | `LocalPromptStore` (dev) or `BlobPromptStore` (Azure) | `CosmosPromptStore` (if rich queries needed) |

The managed identity for the App Service is already provisioned and has `Storage Blob Data Contributor` on the storage account (see `infra/main.bicep`), so migration to MI doesn't need any new infra.

---

## Deploy to Azure

Prerequisites: [azd CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd), Azure subscription, a Foundry resource in Sweden Central with `claude-sonnet-4-6` and `claude-haiku-4-5` deployments.

### Option A — azd (full infra + app)

```bash
azd auth login
azd env new cio-analytics-poc
azd env set FOUNDRY_RESOURCE <your-foundry-name>
azd env set FOUNDRY_API_KEY <your-api-key>
azd env set POC_PASSWORD <choose-a-strong-password>
azd up
```

First `azd up` provisions infra + deploys in ~5–8 minutes. Subsequent `azd deploy` only ships the app (~1–2 min).

### Option B — zip deploy (app only, infra already exists)

```bash
# Create zip with forward-slash paths (critical on Windows)
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

After deploy, the web URL is printed. Visit it — browser shows a native Basic Auth prompt. Username can be anything (e.g. `admin`); password is what you set as `POC_PASSWORD`.

---

## PoC constraints (out of scope)

- **No CMS integration** — export is file-only (`.md` / `.docx`)
- **No Entra ID** — single shared password via HTTP Basic Auth
- **No RBAC** — all authenticated users have full access
- **No RAG** — no vector search over the article archive
- **No multi-turn agents** — each call is a single `messages.create`
- **No A/B testing in production traffic** — only in the prompt-editor test pane

See `docs/AUTH_MIGRATION.md` for the documented path from shared password to Entra ID.

---

## License

Internal Atea project. Not for redistribution.
