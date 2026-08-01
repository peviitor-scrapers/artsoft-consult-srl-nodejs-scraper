# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-01

### Changed
- Refactor complet pentru a respecta structura template-ului de referință (`scraper/` + `ai/` + `tests/consistency`)
- Înlocuit `solr.js` cu `scraper/api.js` — toate operațiile trec prin [API-ul peviitor.ro](https://api.peviitor.ro/); eliminat `SOLR_AUTH`
- Mutat tot codul scraper în `scraper/` (index, company, anaf, demoanaf, validators, markdown-generator, config)
- Identitate companie centralizată în `scraper/config/company.json` + `scraper/config/scraper.json`
- Adăugat fallback CUIScan/CUIFirma în `scraper/anaf.js` când demoANAF e indisponibil
- Documentația mutată în `ai/` (AGENTS.md, INSTRUCTIONS.md, files.md, job-model.md, company-model.md ș.a.)
- Adăugat `ai/AI-DERIVATION-GUIDE.md`, `ai/MAINTENANCE.md`, `CODE_OF_CONDUCT.md`

### Added
- `scraper/api.js` (querySOLR, upsertJobs, deleteJobByUrl + comenzi verify/extract/company)
- `scraper/job-validator.js` cu `validateByBrowser` (Playwright) pentru deep validation
- Workflow-uri noi: `job-deep-validate.yml`, `automation-template-sync-check.yml`, `job-recovery-from-disaster.yml`
- Teste noi din template: `tests/unit/api.test.js`, `tests/consistency/root-files.test.js`, `tests/consistency/version.test.js`
- Teste E2E reactivate pe site-ul real (cu `itIfApi`/`itIfAnaf`)

### Removed
- `solr.js`, `src/`, `config/` la rădăcină, `index.js` la rădăcină, `demoanaf.js` la rădăcină
- `company.json`/`company.js` la rădăcină (mutate în `scraper/config/`)
- `tests/unit/solr.test.js` (înlocuit de `tests/unit/api.test.js`)
- Toate referințele la `SOLR_AUTH` din workflow-uri și teste

## [1.0.0] - 2026-06-17

### Added
- Initial release
- Job scraping from ArtSoft Consult careers page (HTML/cheerio)
- Company validation via ANAF
- Solr integration for job storage
- GitHub Actions workflows for daily scraping and testing
- Comprehensive test suite (unit, integration, E2E)
- ANAF API fallback with cached data support
- Node 24 compatibility

### Features
- Automated daily job scraping
- Company core validation and management
- Job URL validation
- Data integrity checks
- Romanian location filtering
- Work mode normalization

### Derived From
- epam-systems-international-srl-nodejs-scraper (reference template)

## License

Copyright (c) 2024-2026 BOGA SEBASTIAN-NICOLAE
Licensed under MIT License
