# job_seeker_ro_spider

**job_seeker_ro_spider** — scraper pentru job-urile ArtSoft Consult din România.

Extrage anunțurile de pe [ArtSoft Consult careers](https://www.artsoft-consult.ro/careers/job-openings) și le publică în [peviitor.ro](https://peviitor.ro) prin [API-ul peviitor.ro](https://api.peviitor.ro/).

## Identificare

Toate request-urile HTTP folosesc User-Agent-ul:

```
job_seeker_ro_spider
```

## Ce face

1. **Validează compania** — interoghează API-ul public ANAF ([demoanaf.ro](https://demoanaf.ro)) după CIF-ul ArtSoft (15997630) și verifică (cu fallback CUIScan/CUIFirma când ANAF e indisponibil):
   - Denumirea oficială: ARTSOFT CONSULT SRL
   - Status: activ/inactiv/radiat
   - Adresa completă din registrul comerțului
2. **Cross-validează cu Peviitor** — verifică existența companiei în API-ul Peviitor
3. **Scrape-uiește job-urile** — extrage lista completă de job-uri din pagina de cariere ArtSoft Consult (HTML scraping cu cheerio)
4. **Transformă datele** — normalizează locațiile (doar orașe românești), tag-urile (lowercase), workmode-ul (remote/on-site/hybrid)
5. **Stochează** — upsert prin API-ul peviitor.ro în `job` core (job-urile) și `company` core (datele companiei)
6. **Generează docs/jobs.md** — fișier markdown cu informații companie + toate job-urile curente

## Structură proiect

```
├── scraper/config/company.json  # Sursa unică de adevăr (id, company, brand, URL-uri)
├── scraper/config/scraper.json  # Config scraper (apiBase, careerUrl, defaultLocation)
├── scraper/index.js             # Orchestrator principal (HTML scraping cu cheerio)
├── scraper/company.js           # Validare companie (ANAF + CUIScan + Peviitor) cu cache 7 zile
├── scraper/api.js               # Operații peviitor API (query, upsert, delete, company)
├── scraper/anaf.js              # Modul ANAF API (search + details + fallback)
├── scraper/demoanaf.js          # CLI wrapper pentru scraper/anaf.js
├── scraper/markdown-generator.js# Generează docs/jobs.md după scrape
├── scraper/job-validator.js     # Primitivă comună: validateByHead/Content/Browser
├── scraper/validate-jobs.js     # Validator manual deep (content-aware)
├── ai/                          # Documentație pentru AI agents (AGENTS.md, files.md, ș.a.)
├── tests/
│   ├── unit/                    # Teste unitare (API-uri mock-uite)
│   ├── integration/             # Teste de integrare (ANAF + peviitor API live)
│   ├── e2e/                     # Teste end-to-end (pipelin complet)
│   └── consistency/             # Teste structură repo (fișiere, topics, version)
└── .github/workflows/
    ├── job-seeker-ro-spider.yml         # Rulează zilnic la 6 AM UTC
    ├── automation-testing.yml           # Teste automate la fiecare push/PR
    ├── job-deep-validate.yml            # Deep validation manual (Playwright)
    ├── automation-template-sync-check.yml # Check săptămânal sincronizare template
    └── job-recovery-from-disaster.yml   # Recuperare manuală job-uri stale
```

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| ArtSoft Consult | `https://www.artsoft-consult.ro/careers/job-openings` | Public |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| CUIFirma / CUIScan | `https://www.cuifirma.ro`, `https://www.cuiscan.ro` | Public (fallback) |
| Peviitor | `https://api.peviitor.ro/v1/` | Public |

Accesul la SOLR se face exclusiv prin API-ul peviitor.ro — nu e necesar `SOLR_AUTH`.

## Testare

```bash
# Toate testele
npm test

# Doar unitare
npm run test:unit

# Doar integrare (necesită ANAF live)
npm run test:integration

# Doar E2E (site-ul real ArtSoft + ANAF + peviitor API)
npm run test:e2e

# Doar consistency (necesită GITHUB_REPOSITORY + GITHUB_TOKEN)
npm run test:consistency
```
