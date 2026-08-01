# job_seeker_ro_spider — ArtSoft Consult Scraper

[![Oportunitati SI Cariere](https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper/actions/workflows/job-seeker-ro-spider.yml/badge.svg)](https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper/actions/workflows/job-seeker-ro-spider.yml)
[![Automation Tests](https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper/actions/workflows/automation-testing.yml/badge.svg)](https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper/actions/workflows/automation-testing.yml)

[![Version](https://img.shields.io/github/package-json/v/sebiboga/artsoft-consult-srl-nodejs-scraper?label=version&color=blue)](CHANGELOG.md)
[![Test Results](https://img.shields.io/badge/test--results-HTML-9b59b6)](https://sebiboga.github.io/artsoft-consult-srl-nodejs-scraper/test-results/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/javascript-ESM-F7DF1E?logo=javascript&logoColor=black)](https://ecma-international.org/)
[![Node.js](https://img.shields.io/badge/node-24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpeviitor.ro&label=peviitor.ro)](https://peviitor.ro)
[![API](https://img.shields.io/website?url=https%3A%2F%2Fapi.peviitor.ro%2F&label=api.peviitor.ro)](https://api.peviitor.ro/)
[![SOLR](https://img.shields.io/website?url=https%3A%2F%2Fsolr.peviitor.ro%2Fsolr%2F&label=solr.peviitor.ro)](https://solr.peviitor.ro/solr/)
[![GitHub Pages](https://img.shields.io/github/deployments/sebiboga/artsoft-consult-srl-nodejs-scraper/github-pages?label=GitHub%20Pages)](https://sebiboga.github.io/artsoft-consult-srl-nodejs-scraper/)

**job_seeker_ro_spider** — un scraper pentru job-urile ArtSoft Consult din România. Extrage anunțurile de pe [ArtSoft Consult careers](https://www.artsoft-consult.ro/careers/job-openings) și le publică în [peviitor.ro](https://peviitor.ro) prin [API-ul peviitor.ro](https://api.peviitor.ro/).

> **🌱 Derived scraper.** Acest repo este **derivat** din [template-ul de referință](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper) — template-ul de referință pentru ecosistemul peviitor.ro. Consultă [CONTRIBUTING.md](CONTRIBUTING.md) pentru detalii despre derivare.

## Overview

Proiectul automatizează colectarea zilnică a job-urilor ArtSoft Consult din România, menținând board-ul peviitor.ro la zi cu cele mai recente oportunități de carieră.

## Features

- Extrage job-uri din pagina de cariere ArtSoft Consult (HTML scraping cu cheerio)
- Validează compania via ANAF (CUI, status activ/inactiv, adresă completă) + fallback CUIScan/CUIFirma
- **Cache ANAF la 7 zile** — ținut local, nu lovește demoANAF la fiecare scrape
- **Fallback la cache stale** dacă ANAF e indisponibil
- Cross-validează cu Peviitor API
- Upsert job-uri + company core prin API-ul peviitor.ro (fără acces direct SOLR, fără `SOLR_AUTH`)
- Generează `docs/jobs.md` automat — accesibil pe GitHub Pages
- **Identitate companie într-un singur fișier** (`scraper/config/company.json`) — derivare ușoară
- GitHub Actions: scrape zilnic + testare automată (unit, integration, e2e, consistency)
- E2E cu site-ul real, deep validation cu Playwright (browser mode)

## Project Structure

```
├── scraper/
│   ├── index.js                    # Main scraper entry point (HTML scraping cu cheerio)
│   ├── company.js                  # Company validation via ANAF + CUIScan + Peviitor
│   ├── demoanaf.js                 # CLI wrapper for scraper/anaf.js
│   ├── api.js                      # Peviitor API operations (query, upsert, delete, company)
│   ├── validate-jobs.js            # Job URL validator — checks active/expired, deletes stale jobs
│   ├── anaf.js                     # ANAF API core module (search + company details + fallback)
│   ├── markdown-generator.js       # Generates docs/jobs.md from scraped data
│   ├── job-validator.js            # Shared validateByHead + validateByContent + validateByBrowser
│   └── config/
│       ├── company.json            # Single source of truth: id, brand, URLs
│       ├── company.js              # ESM loader for company.json
│       ├── scraper.json            # API base, career/internship URLs, defaultLocation
│       └── scraper.js              # ESM loader for scraper.json
├── ai/                             # Documentation pentru AI agents
│   ├── AGENTS.md, INSTRUCTIONS.md, files.md, job-model.md, company-model.md
│   ├── AI-DERIVATION-GUIDE.md, MAINTENANCE.md, VERIFY.md, BRANCH.md, ISSUES.md
│   └── PUBLIC.md, ROBOTS.md, TOPICS.md, UPDATE-REPO-ABOUT.md
├── tests/
│   ├── package.json                # Jest config for test suite
│   ├── company.json                # Mock ANAF data used in unit tests
│   ├── validate-artsoft-consult-jobs.js  # CI job URL validation script (--head/--content/--browser)
│   ├── unit/
│   │   ├── index.test.js           # Tests for parseHtmlJobs, mapToJobModel, transformJobsForSOLR
│   │   ├── company.test.js         # Tests for validateAndGetCompany, fallback caching
│   │   ├── api.test.js             # Tests for api.js query/upsert/delete operations
│   │   ├── demoanaf.test.js        # Tests for ANAF search, retrieval, CUIScan/CUIFirma fallback
│   │   ├── job-validator.test.js   # Tests for validateByHead/Content/Browser
│   │   └── markdown-generator.test.js
│   ├── integration/
│   │   └── workflow.test.js        # Live ANAF + Peviitor API integration tests
│   ├── e2e/
│   │   └── scraper.test.js         # Full pipeline tests with real ArtSoft website
│   └── consistency/
│       ├── root-files.test.js      # Verifies required root files
│       ├── repo.test.js            # Verifies branch, Pages, secrets, workflows
│       ├── version.test.js         # Verifies version consistency
│       ├── topics.test.js          # Verifies required repo topics
│       └── workflow-naming.test.js # Validates workflow naming conventions
├── docs/
│   ├── index.html                  # Live job board (GitHub Pages)
│   ├── jobs.md                     # Scraped jobs in markdown (generated by CI)
│   └── README.md
├── .github/
│   └── workflows/
│       ├── job-seeker-ro-spider.yml       # Daily scraping at 6 AM UTC
│       ├── automation-testing.yml         # Automation Tests on push/PR
│       ├── job-deep-validate.yml          # Manual deep validation (Playwright)
│       ├── automation-template-sync-check.yml  # Weekly template sync check
│       └── job-recovery-from-disaster.yml # Manual stale-job recovery
└── package.json
```

## Setup

### Prerequisites

- Node.js 24+
- npm

### Installation

```bash
npm install
```

### Configuration

Nu sunt necesare variabile de mediu pentru scrape — toate operațiile trec prin [API-ul peviitor.ro](https://api.peviitor.ro/) (fără acces direct SOLR, fără `SOLR_AUTH`).

Testele de consistency au nevoie de `GITHUB_REPOSITORY` (format `owner/repo`) și `GITHUB_TOKEN` (rulează automat în GitHub Actions).

## Usage

### Run the Scraper

```bash
npm run scrape
```

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Related Scrapers

Acest scraper este derivat din [template-ul de referință](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper), template-ul de referință pentru toate scraper-ele Node.js din ecosistemul peviitor.ro. Alte scraper-e din același ecosistem:

| Repo | Companie | CIF | Metodă | Status |
|------|----------|-----|--------|--------|
| [mejix-srl-nodejs-scraper](https://github.com/sebiboga/mejix-srl-nodejs-scraper) | MEJIX SRL | 17372688 | HTML scraping (cheerio) | ✅ Live |
| [talent-matchmakers-srl-nodejs-scraper](https://github.com/sebiboga/talent-matchmakers-srl-nodejs-scraper) | TALENT MATCHMAKERS S.R.L. | 38460545 | Teamtailor HTML (cheerio) | ✅ Live |
| [artsoft-consult-srl-nodejs-scraper](https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper) | ARTSOFT CONSULT SRL | 15997630 | HTML scraping (cheerio) | ✅ Live |

## Derived From

Acest scraper este derivat din [template-ul de referință](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper), template-ul de referință pentru toate scraper-ele Node.js din ecosistemul peviitor.ro.

Pentru a deriva un scraper nou, urmează [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Copyright (c) 2024-2026 BOGA SEBASTIAN-NICOLAE

Licensed under the [MIT License](LICENSE).

## Managed By

This project is managed by [ASOCIATIA OPORTUNITATI SI CARIERE](https://oportunitatisicariere.ro) and used as a web scraper for the [peviitor.ro](https://peviitor.ro) job board project.
