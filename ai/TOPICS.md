# TOPICS.md — Required GitHub Topics

All scrapers derived from the reference template **MUST** have these two topics set on the GitHub repo:

## Required Topics

1. `job-seeker-ro-spider`
2. `peviitor-ro`

## How to Add Topics

```bash
gh api repos/sebiboga/artsoft-consult-srl-nodejs-scraper/topics \
  -X PUT \
  -f names='["job-seeker-ro-spider","peviitor-ro"]'
```

## Why?

- `job-seeker-ro-spider` — identifies this as a member of the scraper ecosystem
- `peviitor-ro` — identifies the target platform

The consistency test `tests/consistency/topics.test.js` verifies both topics are set.
