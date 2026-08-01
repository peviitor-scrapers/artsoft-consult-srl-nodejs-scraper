# Instructions

## Project Purpose

This scraper extracts job listings from ArtSoft Consult careers page (Romania only) and imports them to peviitor.ro.

Target: https://www.artsoft-consult.ro/careers/job-openings

## Model Schemas

The job and company models are defined in:
- `ai/job-model.md` - Job model schema
- `ai/company-model.md` - Company model schema

## Important

These models are **dynamic** and can change over time. They are based on the official Peviitor Core schemas which may be updated.

## How to Keep Models Updated

When working on this scraper:

1. **Check for updates** in the Peviitor Core repository:
   - Repository: https://github.com/peviitor-ro/peviitor_core
   - Main file: README.md (contains Job and Company model schemas)

2. **When to update**:
   - Before starting new development work
   - If field requirements or validations have changed
   - If new fields have been added

3. **How to update**:
   - Fetch the latest README.md from peviitor_core main branch
   - Compare with current job-model.md and company-model.md
   - Update local files if there are differences
   - Update scraper/index.js mapping logic if field requirements changed

## Technologies

- **Node.js & JavaScript (ESM)** - For scraping and data extraction
- **Apache SOLR** - For data storage (acces numai prin API-ul peviitor.ro, fără acces direct)
- **cheerio** - HTML scraping pentru pagina de cariere ArtSoft Consult
- **Jest** - Testare (unit, integration, e2e, consistency)
- **Playwright** - Deep validation a URL-urilor de job (browser mode)

## Workflow Steps

1. **Start with brand** - We know the brand (e.g., "ArtSoft Consult")
2. **Search in DemoANAF** - Find company by brand, get CIF from search results (fallback CUIFirma dacă demoANAF e indisponibil)
3. **Get company details from ANAF** - Using CIF, fetch full company data from ANAF (fallback CUIScan)
4. **Validate with Peviitor** - Verify company exists in Peviitor, get group/brand info
5. **Check existing jobs** - Query peviitor API by CIF to see what jobs already exist
6. **Check company status** - If ANAF status = "inactive" → DELETE existing jobs and STOP
7. **Scrape new jobs** - Extract jobs from ArtSoft Consult careers page (HTML + cheerio)
8. **Transform for SOLR** - Validate and fix job data:
   - location: Only Romanian cities allowed
   - tags: lowercase, no diacritics
   - company: uppercase
9. **Upsert** - Import/update jobs prin API-ul peviitor.ro
10. **Verify URLs** - Check existing job URLs still work, delete 404s

## Running the Scraper

```bash
# Run the full scraper workflow (single command)
npm run scrape

# Test mode (one page only, limit 10 jobs)
npm run scrape -- --test
```

> **Important**: Scraper does NOT delete jobs from other sources (ANOFM, etc). It only upserts ArtSoft Consult jobs. Existing jobs are preserved.

## Full Workflow (automatic)

When running `npm run scrape`, the following steps happen automatically:

1. **Check existing jobs count** - Query peviitor API by CIF (read-only)
2. **Validate company via ANAF** - Check company exists and is active (CUIScan/CUIFirma fallback)
3. **Scrape jobs** - Extract jobs from ArtSoft Consult careers page (HTML + cheerio)
4. **Transform for SOLR** - Fix locations (only Romanian cities), normalize fields
5. **Upsert** - Add/update jobs prin API-ul peviitor.ro (handles duplicates by URL)
6. **Show Summary** - Log job counts

**Important**: We do NOT delete existing jobs! This preserves jobs from other sources (ANOFM, etc).

## Workflow Flowchart

```
scraper/config/company.json (single source of truth: id, brand, URLs)
    │
    ▼
scraper/index.js
    │
    ▼
querySOLR(CIF) - just count, don't delete (via scraper/api.js)
    │
    ▼
scraper/company.js (validate company)
    ├── load cache (tmp/company.json)
    │   └── if fresh (<7 days), skip ANAF entirely
    ├── ANAF API ──► get company name + CIF (only if cache stale/missing)
    │   └── fallback: CUIScan (details) / CUIFirma (search)
    └── Peviitor API ──► validate company model
    │
    ▼ (if active)
scrape ArtSoft Consult HTML (fetchJobsHtml + parseHtmlJobs)
    │
    ▼
transformJobsForSOLR()
    ├── Filter: keep only Romanian locations
    ├── Fallback: "România" for unknown
    └── Format: lowercase tags, uppercase company
    │
    ▼
upsertJobs() - via api.peviitor.ro (handles duplicate by URL)
    │
    ▼
generateJobsMarkdown() → docs/jobs.md
    └── committed to repo by CI → available on GitHub Pages
```

## File Responsibilities

| File | Role |
|------|------|
| `scraper/config/company.json` | **Single source of truth** for company identity (id, company, brand, URLs, scraperFile) |
| `scraper/config/company.js` | ESM wrapper that loads `scraper/config/company.json` for Node code |
| `scraper/config/scraper.json` | Scraper-specific config (apiBase, careerUrl, internshipUrl, internshipApplyUrl, defaultLocation) |
| `scraper/config/scraper.js` | ESM wrapper that loads `scraper/config/scraper.json` for Node code |
| `scraper/index.js` | Main entry point - full workflow: validate company → scrape (cheerio) → transform → upsert → generate docs/jobs.md |
| `scraper/company.js` | Validates company via ANAF + CUIScan + Peviitor; caches in `tmp/company.json` (7-day TTL) |
| `scraper/api.js` | Peviitor API operations - querySOLR, upsertJobs, deleteJobByUrl + standalone verify/extract/company commands |
| `scraper/anaf.js` | ANAF API core module - searchCompany(brand) and getCompanyFromANAF(cif) with CUIScan/CUIFirma fallback |
| `scraper/demoanaf.js` | CLI entry point for ANAF module (thin wrapper around scraper/anaf.js) |
| `scraper/job-validator.js` | Shared validation primitives: `validateByHead`, `validateByContent`, `validateByBrowser` |
| `scraper/markdown-generator.js` | Generates `docs/jobs.md` with company info and all scraped jobs |
| `scraper/validate-jobs.js` | Manual deep validator (content-aware); thin CLI wrapper over scraper/job-validator.js |
| `tests/validate-artsoft-consult-jobs.js` | CI fast validator (HEAD); thin CLI over scraper/job-validator.js + scraper/api.js |
| `tests/unit/index.test.js` | Unit tests for parseHtmlJobs, mapToJobModel, transformJobsForSOLR |
| `tests/unit/company.test.js` | Unit tests for validateAndGetCompany and fallback caching |
| `tests/unit/api.test.js` | Unit tests for api.js query, upsert, delete operations |
| `tests/unit/demoanaf.test.js` | Unit tests for ANAF search, retrieval, CUIScan/CUIFirma fallback |
| `tests/unit/job-validator.test.js` | Unit tests for validateByHead/Content/Browser |
| `tests/unit/markdown-generator.test.js` | Unit tests for markdown-generator.js |
| `tests/integration/workflow.test.js` | Live integration tests - ANAF + Peviitor API |
| `tests/e2e/scraper.test.js` | End-to-end tests with real ArtSoft Consult website |
| `tests/consistency/root-files.test.js` | Verifies required root files exist |
| `tests/consistency/repo.test.js` | Verifies branch, Pages, workflow files |
| `tests/consistency/version.test.js` | Verifies version consistency |
| `tests/consistency/topics.test.js` | Verifies required repo topics |
| `tests/consistency/workflow-naming.test.js` | Validates workflow naming conventions |

## API Endpoints

- **DemoANAF Search**: `https://demoanaf.ro/api/search?q=BRAND` - Search companies by name/brand
- **DemoANAF Company**: `https://demoanaf.ro/api/company/:cui` - Get company details by CIF
- **CUIFirma Search**: `https://www.cuifirma.ro/api/...` - Fallback pentru search
- **CUIScan Company**: `https://www.cuiscan.ro/api/...` - Fallback pentru detalii companie
- **Peviitor API**: `https://api.peviitor.ro/v1/` - Upsert job-uri, query companii/job-uri

## Rate Limiting & Politeness

The scraper is intentionally slow to be a good citizen:

| Setting | Value | Where |
|---------|-------|-------|
| Delay between pages | 1000 ms | `scraper/index.js` — `sleep(1000)` |
| Request timeout | 10000 ms | `scraper/index.js` — `TIMEOUT` constant |
| ANAF retries | 3 attempts, 2s exponential backoff | `scraper/anaf.js` |
| Concurrency | 1 (sequential) | No `Promise.all` for paginated fetches |
| User-Agent | `job_seeker_ro_spider` | Identifies the scraper in server logs |

Derived scrapers should keep these defaults unless the target site explicitly permits otherwise.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_REPOSITORY` | Used by consistency tests — format: `owner/repo` |
| `GITHUB_TOKEN` | GitHub API token for consistency tests |

Nu este necesar `SOLR_AUTH` — toate operațiile trec prin API-ul public peviitor.ro.

## Standalone Commands

```bash
# Verify jobs by CIF (via peviitor API)
npm run scrape -- verify <CIF>

# Extract existing jobs by CIF
npm run scrape -- extract <CIF>

# Query company
npm run scrape -- company <search_term>

# Get company details from ANAF by CIF
node scraper/demoanaf.js <CIF>

# Search companies in ANAF by brand
node scraper/demoanaf.js search <brand>

# Validate job URLs by CIF (check active/expired)
node scraper/validate-jobs.js <CIF>

# Validate a single job URL
node scraper/validate-jobs.js url <url>

# Delete expired jobs by CIF
node scraper/validate-jobs.js <CIF> --delete
```

## Testing

This project requires multiple levels of testing:

1. **Unit Tests** - Test individual modules (scraper/company.js, scraper/api.js) in isolation
2. **Integration Tests** - Test API interactions (ANAF, Peviitor) in `/tests/integration` folder
3. **E2E Tests** - Test full workflow in `/tests/e2e` folder
4. **Consistency Tests** - Verifică structura repo-ului (fișiere, topics, version)

Run tests:
```bash
npm test
```

## Temporary Files

All temporary/scratch files must be placed in `tmp/` inside the project root (never outside the project). The `tmp/` directory is in `.gitignore` and will not be committed.

## Technical Debt / Completed

- [x] Extract demoanaf.js to separate module (#2)
- [x] Write Unit Tests for all modules (#3)
- [x] Write Integration Tests in separate folder (#4)
- [x] Write E2E automated tests in separate folder (#5)
- [x] Refactor to scraper/ structure matching template (#6)
- [x] Replace SOLR_AUTH with peviitor API (#7)
- [x] Add CUIScan/CUIFirma fallback for ANAF (#8)
