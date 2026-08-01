# Contributing

Thank you for your interest in contributing!

## 🌱 This Repo Is a Derived Scraper

This repo is **derived from** the [reference template](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper) — the reference implementation for Node.js job scrapers in the peviitor.ro ecosystem.

### 1. Update company identity

**Primary edit (single source of truth):**

| File | What to change |
|------|---------------|
| `scraper/config/company.json` | Edit all fields: `id`, `company`, `brand`, `status`, `location[]`, `website[]`, `career[]`, `scraperFile` |
| `scraper/config/scraper.json` | Edit all fields: `apiBase`, `careerUrl`, `internshipUrl`, `internshipApplyUrl`, `defaultLocation` |

All scraper code, CI workflows, and the static HTML read from this file.

**Secondary edits (cosmetic / metadata):**

| File | What to change |
|------|---------------|
| `tests/company.json` | Replace with ANAF mock for the new company |
| `UPDATE-REPO-ABOUT.md` | New description with legal name and CIF |
| `package.json` | `name` field |
| `README.md` | Title, badges (URLs to the new repo), Overview |
| `tests/validate-artsoft-consult-jobs.js` | Rename to match new brand |

### 2. Adjust the scraper

- Rewrite `fetchJobsHtml()` and `parseHtmlJobs()` in `scraper/index.js` to match the new source
- Keep the **output shape identical** — `mapToJobModel()` and `transformJobsForSOLR()` should not change
- Update tests accordingly

### 3. Wire up CI

- No secrets needed — all operations go through the public Peviitor API
- Enable GitHub Pages (root: `docs/`)

### 4. Validate

Follow [VERIFY.md](VERIFY.md) before merging. All 4 levels of tests (unit / integration / e2e / consistency) must pass.

## Code Style

- Use ES6+ modules (`type: module` in `package.json`)
- Add tests for new features in the matching `tests/<level>/` folder
- Ensure all tests pass before submitting PR
- Reference a GitHub issue in every commit (see [ISSUES.md](ISSUES.md))

## Development Setup

```bash
git clone https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper.git

npm install

npm test
```

## Reporting Issues

Open a [GitHub Issue](https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper/issues) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
