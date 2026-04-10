/**
 * Flat key→{en,no} translation dictionary for the CIO Analytics UI.
 *
 * English is the primary language; Norwegian is the fallback.
 * Keys are dot-separated: "component.stringId".
 */

export type UILang = "en" | "no";

const dict: Record<string, Record<UILang, string>> = {
  // ── Nav ────────────────────────────────────────────────
  "nav.dashboard": { en: "Dashboard", no: "Dashboard" },
  "nav.dashboardDesc": { en: "Overview", no: "Oversikt" },
  "nav.write": { en: "Write", no: "Skriv" },
  "nav.writeDesc": { en: "New article", no: "Ny artikkel" },
  "nav.translate": { en: "Translate", no: "Oversett" },
  "nav.translateDesc": { en: "To en/sv/da/fi", no: "Til en/sv/da/fi" },
  "nav.articles": { en: "Articles", no: "Artikler" },
  "nav.articlesDesc": { en: "All", no: "Alle" },
  "nav.prompts": { en: "Prompts", no: "Prompts" },
  "nav.promptsDesc": { en: "Edit agents", no: "Rediger agenter" },
  "nav.footer": { en: "Claude in Foundry · Sweden Central", no: "Claude i Foundry · Sweden Central" },

  // ── Common ─────────────────────────────────────────────
  "common.unauthorized": { en: "Unauthorized. Check your session.", no: "Unauthorized. Sjekk sesjonen din." },
  "common.error": { en: "Error", no: "Feil" },
  "common.errorPrefix": { en: "Error:", no: "Feil:" },
  "common.cancel": { en: "Cancel", no: "Avbryt" },
  "common.remove": { en: "Remove", no: "Fjern" },
  "common.loading": { en: "Loading…", no: "Laster…" },
  "common.done": { en: "Done", no: "Ferdig" },
  "common.streaming": { en: "Streaming", no: "Streaming" },
  "common.waiting": { en: "Waiting", no: "Venter" },
  "common.save": { en: "Save", no: "Lagre" },
  "common.saving": { en: "Saving…", no: "Lagrer…" },
  "common.tokens": { en: "tokens", no: "tokens" },

  // ── 404 ────────────────────────────────────────────────
  "notFound.message": { en: "Page not found.", no: "Fant ikke siden." },
  "notFound.back": { en: "Back to dashboard", no: "Tilbake til dashboard" },

  // ── Dashboard ──────────────────────────────────────────
  "dashboard.section": { en: "Dashboard", no: "Dashboard" },
  "dashboard.description": {
    en: "Write new Norwegian CIO Analytics articles and translate existing articles to English, Swedish, Danish, and Finnish. All prompts can be edited live without redeployment.",
    no: "Skriv nye norske CIO Analytics-artikler og oversett eksisterende artikler til engelsk, svensk, dansk og finsk. Alle prompts kan redigeres live uten redeploy.",
  },
  "dashboard.ctaWriteTitle": { en: "Write new article", no: "Skriv ny artikkel" },
  "dashboard.ctaWriteDesc": { en: "Brief + research material → 600–900 word Norwegian case study.", no: "Brief + researchmateriale → 600–900 ord norsk case-study." },
  "dashboard.ctaTranslateTitle": { en: "Translate article", no: "Oversett artikkel" },
  "dashboard.ctaTranslateDesc": { en: "Parallel translation to en, sv, da, fi — with executive register.", no: "Parallell oversettelse til en, sv, da, fi — med executive-register." },
  "dashboard.ctaPromptsTitle": { en: "Edit agents", no: "Rediger agenter" },
  "dashboard.ctaPromptsDesc": { en: "Change system prompts, model, and temperature — no redeployment.", no: "Endre system-prompts, modell og temperatur — ingen redeploy." },
  "dashboard.recentArticles": { en: "Recent articles", no: "Siste artikler" },
  "dashboard.viewAll": { en: "View all →", no: "Se alle →" },
  "dashboard.noArticles": { en: "No articles yet.", no: "Ingen artikler ennå." },
  "dashboard.writeFirst": { en: "Write the first one", no: "Skriv den første" },
  "dashboard.noOnly": { en: "NO only", no: "Kun NO" },

  // ── Write page ─────────────────────────────────────────
  "write.section": { en: "Write", no: "Skriv" },
  "write.title": { en: "New CIO Analytics article", no: "Ny CIO Analytics-artikkel" },
  "write.description": {
    en: "The Writer agent writes a 600–900 word Norwegian case study in CIO Analytics style based on brief and research material. Unknown claims are marked",
    no: "Writer-agenten skriver en 600–900 ord norsk case-study i CIO Analytics-stil basert på brief og researchmateriale. Ukjente påstander merkes",
  },
  "write.sourceMissing": { en: "[SOURCE MISSING]", no: "[KILDE MANGLER]" },

  // ── Translate page ─────────────────────────────────────
  "translate.section": { en: "Translate", no: "Oversett" },
  "translate.title": { en: "Translate article", no: "Oversett artikkel" },
  "translate.description": {
    en: "Translate existing Norwegian articles to English, Swedish, Danish, and Finnish in parallel. Executive register and structure are preserved.",
    no: "Oversett eksisterende norske artikler til engelsk, svensk, dansk og finsk parallelt. Executive-register og struktur bevares.",
  },

  // ── Articles page ──────────────────────────────────────
  "articles.section": { en: "Articles", no: "Artikler" },
  "articles.title": { en: "All generated articles", no: "Alle genererte artikler" },
  "articles.countSingular": { en: "article saved.", no: "artikkel lagret." },
  "articles.countPlural": { en: "articles saved.", no: "artikler lagret." },
  "articles.noArticles": { en: "No articles yet.", no: "Ingen artikler ennå." },
  "articles.writeFirst": { en: "Write the first one", no: "Skriv den første" },
  "articles.created": { en: "Created", no: "Opprettet" },
  "articles.lastUpdated": { en: "Last updated", no: "Sist oppdatert" },

  // ── Prompts page ───────────────────────────────────────
  "prompts.section": { en: "Prompts", no: "Prompts" },
  "prompts.title": { en: "Edit agents", no: "Rediger agenter" },
  "prompts.description": {
    en: "Change system prompts, model settings, and parameters live. Changes are versioned — you can roll back with one click. The test pane runs a draft against Foundry without saving anything.",
    no: "Endre system-prompts, modell-valg og parametere live. Endringer versjoneres — du kan rulle tilbake med ett klikk. Test-panen kjører et utkast mot Foundry uten å lagre noe.",
  },
  "prompts.writerDesc": { en: "Writes new Norwegian CIO Analytics articles from brief + research material. Default: Sonnet 4.6.", no: "Skriver nye norske CIO Analytics-artikler fra brief + researchmateriale. Default: Sonnet 4.6." },
  "prompts.translatorDesc": { en: "Translates Norwegian articles to English, Swedish, Danish, and Finnish. Default: Haiku 4.5.", no: "Oversetter norske artikler til engelsk, svensk, dansk og finsk. Default: Haiku 4.5." },
  "prompts.currentVersion": { en: "Current version", no: "Gjeldende versjon" },
  "prompts.model": { en: "Model", no: "Modell" },
  "prompts.temperature": { en: "Temperature", no: "Temperatur" },
  "prompts.totalVersions": { en: "Total versions", no: "Totale versjoner" },
  "prompts.edit": { en: "Edit", no: "Rediger" },
  "prompts.history": { en: "History", no: "Historikk" },
  "prompts.agent": { en: "Agent", no: "Agent" },

  // ── Prompt history page ────────────────────────────────
  "history.back": { en: "← Back to editor", no: "← Tilbake til editor" },
  "history.section": { en: "History", no: "Historikk" },
  "history.title": { en: "Versions", no: "Versjoner" },
  "history.description": {
    en: "versions. Click 'Set as current' to roll back — this only affects future runs, not existing articles.",
    no: "versjoner. Klikk «Sett som gjeldende» for å rulle tilbake — det påvirker kun fremtidige kjøringer, ikke eksisterende artikler.",
  },

  // ── Writer form ────────────────────────────────────────
  "writer.topicLabel": { en: "Topic", no: "Tema" },
  "writer.topicPlaceholder": { en: "How Norwegian CIOs prioritize AI investments in 2026", no: "Hvordan norske CIO-er prioriterer AI-investeringer i 2026" },
  "writer.briefLabel": { en: "Brief (angle and reader pain)", no: "Brief (vinkel og lesersmerte)" },
  "writer.briefPlaceholder": { en: "What's the angle? What problem does the article solve for the IT leader?", no: "Hva er vinkelen? Hvilket problem løser artikkelen for IT-lederen?" },
  "writer.targetLengthLabel": { en: "Target length (words)", no: "Mål-lengde (ord)" },
  "writer.targetLengthDefault": { en: "Default: 750", no: "Standard: 750" },
  "writer.styleNotesLabel": { en: "Style notes (optional)", no: "Stil-notater (valgfritt)" },
  "writer.styleNotesPlaceholder": { en: "E.g., avoid buzzwords, emphasize concrete numbers…", no: "F.eks. unngå buzzwords, legg vekt på konkrete tall…" },
  "writer.researchLabel": { en: "Research material", no: "Researchmateriale" },
  "writer.addResearch": { en: "+ Add", no: "+ Legg til" },
  "writer.noResearch": { en: "No research material added. Writer will write from brief only.", no: "Ingen researchmateriale lagt til. Writer vil skrive kun fra brief." },
  "writer.kindTranscript": { en: "Interview transcript", no: "Intervju-transkripsjon" },
  "writer.kindSurvey": { en: "Survey data", no: "Survey-data" },
  "writer.kindNotes": { en: "Notes", no: "Notater" },
  "writer.kindReference": { en: "Reference article", no: "Referanse-artikkel" },
  "writer.shortLabel": { en: "Short label", no: "Kort merkelapp" },
  "writer.pasteContent": { en: "Paste content here…", no: "Lim inn innholdet her…" },
  "writer.generate": { en: "Generate article", no: "Generer artikkel" },
  "writer.generating": { en: "Generating…", no: "Genererer…" },
  "writer.openArticle": { en: "Open article →", no: "Åpne artikkel →" },
  "writer.draft": { en: "Draft", no: "Utkast" },
  "writer.draftPlaceholder": { en: "Fill in the form and click 'Generate article'.", no: "Fyll ut skjemaet og klikk «Generer artikkel»." },
  "writer.selectArticleFirst": { en: "Select or paste an article first.", no: "Velg eller lim inn en artikkel først." },

  // ── Translator form ────────────────────────────────────
  "translator.selectSaved": { en: "Select from saved", no: "Velg fra lagret" },
  "translator.pasteMarkdown": { en: "Paste markdown", no: "Lim inn markdown" },
  "translator.selectArticle": { en: "— Select article —", no: "— Velg artikkel —" },
  "translator.chars": { en: "chars", no: "tegn" },
  "translator.alreadyTranslated": { en: "Already translated:", no: "Allerede oversatt:" },
  "translator.pasteHere": { en: "Paste Norwegian markdown here…", no: "Lim inn norsk markdown her…" },
  "translator.targetLanguages": { en: "Target languages", no: "Målspråk" },
  "translator.glossary": { en: "Glossary (optional)", no: "Glossar (valgfritt)" },
  "translator.newTerm": { en: "+ New term", no: "+ Ny term" },
  "translator.glossaryHint": { en: "Add Atea-specific terms that should not be translated, or terms with fixed translation.", no: "Legg til Atea-spesifikke termer som ikke skal oversettes, eller termer med fast oversettelse." },
  "translator.sourceTerm": { en: "Norwegian source term", no: "Norsk kildeterm" },
  "translator.translation": { en: "Translation", no: "Oversettelse" },
  "translator.cancelAll": { en: "Cancel all", no: "Avbryt alle" },
  "translator.viewArticle": { en: "View article →", no: "Se artikkel →" },
  "translator.selectFirst": { en: "Select or paste an article first.", no: "Velg eller lim inn en artikkel først." },
  "translator.selectLanguage": { en: "Select at least one target language.", no: "Velg minst ett målspråk." },

  // ── Article viewer ─────────────────────────────────────
  "viewer.allArticles": { en: "← All articles", no: "← Alle artikler" },
  "viewer.norwegianSource": { en: "Norwegian (source)", no: "Norsk (kilde)" },
  "viewer.downloadMd": { en: "Download .md", no: "Last ned .md" },
  "viewer.downloadDocx": { en: "Download .docx", no: "Last ned .docx" },
  "viewer.exportFailed": { en: "Export failed:", no: "Eksport feilet:" },
  "viewer.created": { en: "Created", no: "Opprettet" },
  "viewer.translated": { en: "Translated:", no: "Oversatt:" },
  "viewer.revision": { en: "Revision", no: "Revisjon" },
  "viewer.updated": { en: "updated", no: "oppdatert" },
  "viewer.missingTranslation": { en: "Missing translation for:", no: "Mangler oversettelse for:" },
  "viewer.translateLink": { en: "Translate →", no: "Oversett →" },

  // ── Article reviser ────────────────────────────────────
  "reviser.title": { en: "Revise article", no: "Revider artikkelen" },
  "reviser.description": { en: "Provide feedback on what should be changed or improved, and the AI will create a new version.", no: "Gi tilbakemelding på hva som bør endres eller forbedres, så lager AI en ny versjon." },
  "reviser.startRevision": { en: "Start revision", no: "Start revisjon" },
  "reviser.close": { en: "Close", no: "Lukk" },
  "reviser.feedbackLabel": { en: "Feedback", no: "Tilbakemelding" },
  "reviser.feedbackPlaceholder": { en: "E.g. 'Make the intro sharper and more concrete', 'Shorten the section about costs', 'Use more active voice'…", no: "F.eks. «Gjør ingressen skarpere og mer konkret», «Kort ned seksjonen om kostnader», «Bruk mer aktiv form»…" },
  "reviser.feedbackMin": { en: "min 10 characters", no: "minst 10 tegn" },
  "reviser.revising": { en: "Generating…", no: "Genererer…" },
  "reviser.useNewVersion": { en: "Use new version →", no: "Bruk ny versjon →" },
  "reviser.newVersionDraft": { en: "New version (draft)", no: "Ny versjon (utkast)" },
  "reviser.staleTranslations": {
    en: "Note: Any existing translations are now based on the previous version. Consider re-running translation from the article's 'Translate' link.",
    no: "Merk: Eventuelle oversettelser er nå basert på den forrige versjonen. Vurder å kjøre oversettelse på nytt fra artikkelen sin «Oversett»-lenke.",
  },

  // ── Reviewer ────────────────────────────────────────────
  "reviewer.title": { en: "Quality review", no: "Kvalitetsvurdering" },
  "reviewer.reviewing": { en: "Reviewing…", no: "Vurderer…" },
  "reviewer.overallScore": { en: "Overall score", no: "Totalvurdering" },
  "reviewer.summary": { en: "Summary", no: "Oppsummering" },
  "reviewer.suggestions": { en: "Suggestions", no: "Forbedringsforslag" },
  "reviewer.fixIssues": { en: "Fix issues →", no: "Fiks problemer →" },
  "reviewer.autoReview": { en: "Auto-reviewing article quality…", no: "Automatisk kvalitetsvurdering…" },
  "reviewer.dimensions": { en: "Dimensions", no: "Dimensjoner" },
  "reviewer.model": { en: "Model", no: "Modell" },
  "reviewer.duration": { en: "Duration", no: "Varighet" },
  "reviewer.tokens": { en: "Tokens", no: "Tokens" },

  // ── Prompt editor ──────────────────────────────────────
  "editor.writerAgent": { en: "Writer agent", no: "Writer-agent" },
  "editor.translatorAgent": { en: "Translator agent", no: "Translator-agent" },
  "editor.title": { en: "Prompt editor", no: "Prompt-editor" },
  "editor.current": { en: "Current:", no: "Gjeldende:" },
  "editor.versions": { en: "versions", no: "versjoner" },
  "editor.historyLink": { en: "History", no: "Historikk" },
  "editor.unsavedChanges": { en: "Unsaved changes", no: "Ulagrede endringer" },
  "editor.discard": { en: "Discard", no: "Forkast" },
  "editor.saveNewVersion": { en: "Save new version", no: "Lagre ny versjon" },
  "editor.saved": { en: "Saved", no: "Lagret" },
  "editor.modelLabel": { en: "Model", no: "Modell" },
  "editor.maxTokensLabel": { en: "Max tokens", no: "Max tokens" },
  "editor.temperatureLabel": { en: "Temperature", no: "Temperatur" },
  "editor.variablesLabel": { en: "Variables", no: "Variabler" },
  "editor.systemPromptLabel": { en: "System prompt", no: "System-prompt" },
  "editor.chars": { en: "characters", no: "tegn" },
  "editor.words": { en: "words", no: "ord" },
  "editor.testPane": { en: "Test pane", no: "Test-pane" },
  "editor.savesNothing": { en: "Saves nothing", no: "Lagrer ingenting" },
  "editor.testUserMessage": { en: "Test user message", no: "Test user-message" },
  "editor.runTest": { en: "Run test (without saving)", no: "Kjør test (uten å lagre)" },
  "editor.runningTest": { en: "Running test…", no: "Kjører test…" },
  "editor.testPlaceholder": { en: "Click 'Run test' to send the draft to Foundry and see output.", no: "Klikk «Kjør test» for å sende draftet til Foundry og se output." },
  "editor.saveDialogTitle": { en: "Save new version", no: "Lagre ny versjon" },
  "editor.saveDialogDesc": { en: "Versions are immutable. This save becomes the new 'current'.", no: "Versjoner er immutable. Denne lagringen blir ny «current»." },
  "editor.authorLabel": { en: "Author", no: "Forfatter" },
  "editor.authorPlaceholder": { en: "Name or initials", no: "Navn eller initialer" },
  "editor.changeNoteLabel": { en: "Change note", no: "Change-note" },
  "editor.changeNotePlaceholder": { en: "What did you change, and why?", no: "Hva endret du, og hvorfor?" },
  "editor.authorRequired": { en: "Author and change note are required.", no: "Forfatter og change-note er påkrevd." },

  // ── Rollback button ────────────────────────────────────
  "rollback.current": { en: "Current", no: "Gjeldende" },
  "rollback.setAsCurrent": { en: "Set as current", no: "Sett som gjeldende" },
  "rollback.failed": { en: "Rollback failed:", no: "Rollback feilet:" },
};

/**
 * Look up a translation key. Falls back: lang → english → raw key.
 */
export function t(key: string, lang: UILang): string {
  return dict[key]?.[lang] ?? dict[key]?.en ?? key;
}
