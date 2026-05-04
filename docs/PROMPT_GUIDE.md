# Prompt-guide for redaksjonen

Denne guiden er for deg som skal redigere system-promptene til Writer- og Translator-agentene. Målet er at du skal kunne eksperimentere trygt — alt er versjonert, og du kan rulle tilbake med ett klikk.

## Hvor redigerer jeg?

- **`/prompts`** — oversikt over begge agenter med gjeldende versjon
- **`/prompts/writer`** — editor for writer-agenten
- **`/prompts/translator`** — editor for translator-agenten
- **`/prompts/[agent]/history`** — tidslinje + rollback

## Arbeidsflyt

1. **Åpne editor-en.** Gjeldende versjon er lastet automatisk.
2. **Rediger system-prompt** i editor-panen til venstre. Du kan også bytte modell (GPT-5.5, Haiku 4.5, Sonnet 4.6, Opus 4.6), endre `max_tokens` og temperatur.
3. **Test først.** Skriv en realistisk test-input i test-panen til høyre, klikk **Kjør test**. Dette sender utkastet til Foundry uten å lagre noe. Du ser output streame i sanntid.
4. **Iterér.** Juster prompten, kjør test på nytt. Gjenta til output ser bra ut.
5. **Lagre som ny versjon.** Klikk **Lagre ny versjon** → modal åpnes → skriv ditt navn og en change-note (hva og hvorfor), klikk Lagre. Det blir ny `current`.
6. **Rolle ut.** Neste gang noen genererer en artikkel bruker Writer-agenten den nye versjonen. Eksisterende artikler er uendret.

## Viktig om versjonering

- **Versjoner er immutable.** Når du har lagret v0012, kan ingen endre den.
- **`current.txt` er muterbar.** En rollback endrer bare hvilken versjon som er gjeldende.
- **Hver artikkel husker hvilken versjon den ble skrevet med.** Du kan alltid gjenskape en artikkel med nøyaktig samme prompt.
- **Ingen ting overskrives.** Selv en prompt du ikke er fornøyd med ligger der for ettertiden. Du kan sammenligne versjoner.

## Modell-valg — hvordan bestemme?

### Writer
- **Sonnet 4.6 (default)** — balansert. 1M context betyr at du kan dytte inn alle intervjuer + hele surveyen uten å dele opp. God kvalitet på executive-norsk. Bruk denne som førstevalg.
- **GPT-5.5** — alternativ modell for sammenlikning eller når redaksjonen ønsker OpenAI-basert output. Krever at `gpt-5.5` er deployet i Foundry.
- **Opus 4.6** — maks kvalitet. Bruk for flaggskip-artikler, komplekse vinkler, eller når Sonnet gir output som «nesten, men ikke helt». Koster ~5× mer.
- **Haiku 4.5** — raske utkast, iterering, «hvordan ville dette sett ut»-eksperimenter. Ikke bruk som endelig publisering.

### Translator
- **Haiku 4.5 (default)** — utmerket for nordisk-engelsk-oversettelse. Raskt, billig, høy troskap på vel-ressursede språk. Bruk denne som førstevalg.
- **GPT-5.5** — alternativ modell for kvalitetssjekk eller språk der OpenAI-output foretrekkes. Krever at `gpt-5.5` er deployet i Foundry.
- **Sonnet 4.6** — når nyanser betyr noe ekstra, eller for finsk (finsk er lavest-ressurset av de fire). Bruk hvis Haiku snubler på idiomer.
- **Opus 4.6** — sensitive tekster, politisk/juridisk terminologi, eller artikler hvor en feilaktig oversettelse kunne skapt problemer.

## Prinsipper for gode prompts

### 1. Vær konkret, ikke abstrakt
- Dårlig: «Skriv i en profesjonell tone»
- Bra: «Skriv i Bokmål. Unngå utropstegn, retoriske spørsmål i ledeteksten, og klisjéer som 'I en verden der…'»

### 2. Gi eksempler
To–tre korte eksempler på ønsket stil er verdt mer enn ti regler. Vi har allerede noen i default-prompten — legg til flere hvis du vil snevre inn tonen mer.

### 3. Vær eksplisitt på kildetrosskap
CIO Analytics-leserne er C-nivå IT-ledere. De oppdager oppfunnede tall og sitater umiddelbart, og det ødelegger tilliten. Writer-prompten krever `[KILDE MANGLER]`-merking i dag — ikke fjern denne regelen.

### 4. Struktur er kontrakt
Hvis du vil ha en fast struktur (lede → 4–6 seksjoner → pull-quote → takeaway), si det eksplisitt. Modellen respekterer strukturkrav.

### 5. Output-kontrakten på slutten
Avslutt alltid prompten med hva output skal være («kun markdown, ingen preamble»). Ellers får du noen ganger `Her er artikkelen:` som innledning.

### 6. Ikke redigér variabelnavn
Placeholders som `{{topic}}`, `{{brief}}`, `{{sourceMarkdown}}` kobles til UI-skjemaet. Hvis du endrer navn uten å oppdatere kode, knekker generering. Du kan **legge til** nye placeholders, men ikke endre eksisterende.

## Eksempler på endringer redaktøren ofte gjør

### Senke «marketing-voltage»
Legg til i husstil-seksjonen:
```
- Unngå alle superlativer («best», «ledende», «mest moderne»)
- Ikke bruk ordene «revolusjonerende», «game-changer», «disruptiv», «transformativ»
- Kvantifiser i stedet for å karakterisere: ikke «betydelige», skriv «47 prosent»
```

### Legge til en ny seksjons-mal
Erstatt «4–6 seksjoner med kortfattede mellomtitler» med:
```
- **Utfordring** (1 seksjon): hvilket problem sto virksomheten overfor
- **Tilnærming** (1–2 seksjoner): hvordan de angrep det
- **Resultat** (1 seksjon): konkrete tall
- **Lærdom** (1 seksjon): hva andre CIO-er kan ta med seg
```

### Stramme opp sitatreglene
Legg til:
```
- Ingen sitater uten tittel-attribusjon (aldri bare «en deltaker sa…»)
- Ingen sitater over tre setninger — bryt opp lange sitater med din egen prosa
- Ingen sitater som starter med «Vi…» uten at leseren er fortalt hvem «vi» er
```

## Når du står fast

1. **Rollback**. Gå til `/prompts/[agent]/history`, klikk «Sett som gjeldende» på forrige versjon.
2. **Test utkast-sammenlikning**. Kjør samme test-input mot både gammel og ny prompt i to nettleser-faner.
3. **Spør en kollega**. Prompt-redigering er et håndverk — det hjelper å ha noen å lese over skulderen.

## Hva du **ikke** kan styre fra editor-en

- **Variabel-navn** på eksisterende placeholders (`{{topic}}`, osv.)
- **Output-formatet** (markdown — dette er hardkoda fordi eksport til Word er avhengig av det)
- **Tidssone, lokalisering, dato-formater** (ikke relevant for vår use-case)
- **Fine-tuning** (vi trener ikke egne modeller — vi bruker stock Claude)

Dette er bevisst. Hvis du føler noe av det burde være konfigurerbart, snakk med teamet.
