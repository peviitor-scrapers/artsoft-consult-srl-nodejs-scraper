# job_seeker_ro_spider

**job_seeker_ro_spider** — scraper pentru job-urile ArtSoft Consult din România.

Extrage anunțurile de pe [ArtSoft Consult careers](https://www.artsoft-consult.ro/careers/job-openings) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul Peviitor.

> **🌱 Derived scraper.** Acest repo este **derivat** din [template-ul de referință](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper) — implementarea de referință pentru toate scraper-ele Node.js din ecosistemul peviitor.ro. Consultă [CONTRIBUTING.md](../CONTRIBUTING.md) pentru detalii despre derivare.

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
5. **Stochează în Peviitor** — upsert prin API-ul Peviitor (job-uri și date companie)
6. **Generează jobs.md** — fișier markdown cu informații companie + toate job-urile curente

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| ArtSoft Consult | `https://www.artsoft-consult.ro/careers/job-openings` | Public |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| CUIFirma / CUIScan | `https://www.cuifirma.ro`, `https://www.cuiscan.ro` | Public (fallback) |
| Peviitor | `https://api.peviitor.ro/v1/` | Public |

## Robots.txt

ArtSoft Consult [robots.txt](https://www.artsoft-consult.ro/robots.txt) permite scraping-ul paginii de cariere. Scraper-ul:
- Fetches `https://www.artsoft-consult.ro/careers/job-openings` (pagină HTML publică)
- Respectă bunele practici standard de crawling
- Folosește un singur User-Agent identificabil: `job_seeker_ro_spider`
- Face un număr minim de request-uri (o singură fetch per rulare)

Pentru analiza completă, vezi [ai/ROBOTS.md](../ai/ROBOTS.md).

## Testare

```bash
# Toate testele
npm test

# Doar unitare
npm run test:unit

# Doar integrare (necesită ANAF live, Peviitor API conditional)
npm run test:integration

# Doar E2E (site-ul real ArtSoft + ANAF + Peviitor)
npm run test:e2e
```

Testele Peviitor API folosesc `itIfApi` — se auto-skip dacă API-ul Peviitor nu e disponibil.
