import fetch from "node-fetch";
import fs from "fs";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import { validateAndGetCompany } from "./company.js";
import { querySOLR, upsertJobs, upsertCompany, deleteJobByUrl } from "./api.js";
import { generateJobsMarkdown } from "./markdown-generator.js";
import companyConfig from "./config/company.js";
import scraperConfig from "./config/scraper.js";

const COMPANY_CIF = companyConfig.id;
const JOB_BASE = scraperConfig.apiBase;
const CAREER_URL = scraperConfig.careerUrl;
const INTERNSHIP_URL = scraperConfig.internshipUrl;
const INTERNSHIP_APPLY_URL = scraperConfig.internshipApplyUrl;
const DEFAULT_LOCATION = scraperConfig.defaultLocation;

const TIMEOUT = 10000;

let COMPANY_NAME = null;

// Single source of truth for Romanian city detection + SOLR location whitelist.
// Lowercase matching uses word boundaries so e.g. "Roman" does not match "România".
const ROMANIAN_CITIES = [
  'Bucharest', 'București', 'Cluj-Napoca', 'Cluj Napoca',
  'Timișoara', 'Timisoara', 'Iași', 'Iasi', 'Brașov', 'Brasov',
  'Constanța', 'Constanta', 'Craiova', 'Bacău', 'Sibiu',
  'Târgu Mureș', 'Targu Mures', 'Oradea', 'Baia Mare', 'Satu Mare',
  'Ploiești', 'Ploiesti', 'Pitești', 'Pitesti', 'Arad', 'Galați', 'Galati',
  'Brăila', 'Braila', 'Drobeta-Turnu Severin', 'Râmnicu Vâlcea', 'Ramnicu Valcea',
  'Buzău', 'Buzau', 'Botoșani', 'Botosani', 'Zalău', 'Zalau', 'Hunedoara', 'Deva',
  'Suceava', 'Bistrița', 'Bistrita', 'Tulcea', 'Călărași', 'Calarasi',
  'Giurgiu', 'Alba Iulia', 'Slatina', 'Piatra Neamț', 'Piatra Neamt', 'Roman',
  'Dumbrăvița', 'Dumbravita', 'Voluntari', 'Popești-Leordeni', 'Popesti-Leordeni',
  'Chitila', 'Mogoșoaia', 'Mogosoaia', 'Otopeni'
];

const CITY_PATTERNS = ROMANIAN_CITIES.map((city) => ({
  city,
  re: new RegExp(`(^|[^a-zăâîșț])${city.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-zăâîșț])`)
}));

const CITY_SET = new Set(ROMANIAN_CITIES.map((c) => c.toLowerCase()));

function findMatchingCities(descText) {
  const found = [];
  for (const { city, re } of CITY_PATTERNS) {
    if (re.test(descText) && !found.includes(city)) found.push(city);
  }
  return found;
}

async function fetchJobsHtml() {
  const res = await fetch(CAREER_URL, {
    headers: {
      "User-Agent": "job_seeker_ro_spider",
      "Accept": "text/html"
    },
    signal: AbortSignal.timeout(TIMEOUT)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${CAREER_URL}`);
  return res.text();
}

function parseHtmlJobs(html) {
  const $ = cheerio.load(html);
  const jobs = [];

  $("div.single-job-container").each((_, el) => {
    const $container = $(el);
    const linkEl = $container.find("h3 a");
    const href = linkEl.attr("href") || "";
    const title = linkEl.text().trim();
    if (!title) return;

    const url = href.startsWith("http") ? href : `${JOB_BASE}${href}`;

    const descEl = $container.find(".job-description div");
    const descText = descEl.text().trim().toLowerCase();

    let workmode = "on-site";
    let location = [];

    if (descText.includes("remote") || descText.includes("fully remote")) {
      workmode = "remote";
    } else if (descText.includes("hybrid")) {
      workmode = "hybrid";
    }

    location = findMatchingCities(descText);

    if (location.length === 0) location.push(DEFAULT_LOCATION);

    jobs.push({ url, title, workmode, location, tags: [] });
  });

  return { jobs, total: jobs.length };
}

async function scrapeAllListings() {
  console.log(`Fetching ${CAREER_URL}`);
  const html = await fetchJobsHtml();
  const { jobs, total } = parseHtmlJobs(html);

  console.log(`Found ${total} jobs on the page`);

  const seen = new Set();
  const unique = [];
  for (const job of jobs) {
    if (!seen.has(job.url)) {
      seen.add(job.url);
      unique.push(job);
    }
  }

  console.log(`Total unique jobs collected: ${unique.length}`);
  return unique;
}

function parseInternshipPage(html) {
  if (!html) return [];

  const $ = cheerio.load(html);
  if (!$("h1:contains('Internship')").length) return [];

  return [{
    url: INTERNSHIP_APPLY_URL,
    title: "Internship",
    workmode: "on-site",
    location: [DEFAULT_LOCATION],
    tags: ["internship"]
  }];
}

async function scrapeInternship() {
  try {
    const res = await fetch(INTERNSHIP_URL, {
      headers: {
        "User-Agent": "job_seeker_ro_spider",
        "Accept": "text/html"
      },
      signal: AbortSignal.timeout(TIMEOUT)
    });

    if (!res.ok) {
      console.log(`ℹ️ Internship page not available (HTTP ${res.status})`);
      return [];
    }

    const jobs = parseInternshipPage(await res.text());
    if (jobs.length > 0) {
      console.log("✅ Internship program active - adding internship listing");
    } else {
      console.log("ℹ️ Internship page structure unexpected - skipping");
    }
    return jobs;

  } catch (err) {
    console.log(`ℹ️ Internship page unavailable (${err.message})`);
    return [];
  }
}

function mapToJobModel(rawJob, cif, companyName = COMPANY_NAME) {
  const now = new Date().toISOString();

  const job = {
    url: rawJob.url,
    title: rawJob.title,
    company: companyName,
    cif: cif,
    location: rawJob.location?.length ? rawJob.location : undefined,
    tags: rawJob.tags?.length ? rawJob.tags : undefined,
    workmode: rawJob.workmode || undefined,
    date: now,
    status: "scraped"
  };

  Object.keys(job).forEach((k) => job[k] === undefined && delete job[k]);

  return job;
}

function transformJobsForSOLR(payload) {
  const normalizeWorkmode = (wm) => {
    if (!wm) return undefined;
    const lower = wm.toLowerCase();
    if (lower.includes('remote')) return 'remote';
    if (lower.includes('hybrid')) return 'hybrid';
    if (lower.includes('office') || lower.includes('on-site') || lower.includes('site')) return 'on-site';
    return 'on-site';
  };

  const transformed = {
    ...payload,
    company: payload.company?.toUpperCase(),
    jobs: payload.jobs.map(job => {
      const validLocations = (job.location || []).filter(loc => {
        const lower = loc.toLowerCase().trim();
        if (lower === 'romania' || lower === 'românia') return true;
        return CITY_SET.has(lower);
      }).map(loc => loc.toLowerCase() === 'romania' ? 'România' : loc);

      return {
        ...job,
        location: validLocations.length > 0 ? validLocations : ['România'],
        workmode: normalizeWorkmode(job.workmode)
      };
    })
  };

  return transformed;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    fs.mkdirSync("scraper", { recursive: true });

    console.log("=== Step 1: Get existing jobs from SOLR ===");
    const existingResult = await querySOLR(COMPANY_CIF);
    const existingCount = existingResult.numFound;
    const existingUrls = new Set(existingResult.docs.map(doc => doc.url).filter(Boolean));
    console.log(`Found ${existingCount} existing jobs in SOLR`);

    console.log("=== Step 2: Validate company via ANAF ===");
    const { company, cif, address, status } = await validateAndGetCompany();
    COMPANY_NAME = company;
    if (status === 'inactive') {
      console.log("⚠️ Company is INACTIVE — jobs deleted, skipping scrape.");
      return;
    }

    try {
      await upsertCompany({
        id: cif,
        company,
        brand: companyConfig.brand || undefined,
        status: status === 'active' ? 'activ' : (status || "activ"),
        location: address ? [address] : companyConfig.location,
        website: companyConfig.website,
        career: companyConfig.career,
        lastScraped: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.log(`Note: Could not upsert company: ${err.message}`);
    }

    const rawJobs = await scrapeAllListings();
    const internshipJobs = await scrapeInternship();
    const allJobs = [...rawJobs, ...internshipJobs];
    const scrapedCount = allJobs.length;
    console.log(`Jobs scraped from ArtSoft Consult website: ${scrapedCount} (${rawJobs.length} regular + ${internshipJobs.length} internship)`);

    const jobs = allJobs.map(job => mapToJobModel(job, cif));

    const payload = {
      source: "artsoft-consult.ro",
      scrapedAt: new Date().toISOString(),
      company: COMPANY_NAME,
      cif: cif,
      jobs
    };

    console.log("Transforming jobs for SOLR...");
    const transformedPayload = transformJobsForSOLR(payload);
    const validCount = transformedPayload.jobs.filter(j => j.location).length;
    console.log(`Jobs with valid Romanian locations: ${validCount}`);

    fs.writeFileSync("scraper/jobs.json", JSON.stringify(transformedPayload, null, 2), "utf-8");
    console.log("Saved scraper/jobs.json");

    const companyData = {
      id: cif,
      company: transformedPayload.company,
      brand: companyConfig.brand || undefined,
      status: status === 'active' ? 'activ' : (status || "activ"),
      location: address ? [address] : companyConfig.location,
      website: companyConfig.website,
      career: companyConfig.career,
      lastScraped: new Date().toISOString().split('T')[0]
    };
    const markdown = generateJobsMarkdown(companyData, transformedPayload.jobs);
    fs.mkdirSync("docs", { recursive: true });
    fs.writeFileSync("docs/jobs.md", markdown, "utf-8");
    console.log("Saved docs/jobs.md");

    fs.copyFileSync("scraper/config/company.json", "docs/company.json");
    console.log("Copied scraper/config/company.json → docs/company.json");

    console.log("\n=== Step 4: Upsert jobs to SOLR ===");
    await upsertJobs(transformedPayload.jobs);

    const scrapedUrls = new Set(transformedPayload.jobs.map(job => job.url));
    const staleUrls = [...existingUrls].filter(url => !scrapedUrls.has(url));

    if (staleUrls.length > 0) {
      console.log(`\n=== Step 4.5: Delete ${staleUrls.length} stale job(s) ===`);
      let deletedCount = 0;
      for (const url of staleUrls) {
        try {
          console.log(`  Deleting: ${url}`);
          await deleteJobByUrl(url);
          deletedCount++;
        } catch (delErr) {
          console.warn(`  ⚠️ Failed to delete: ${url} — ${delErr.message}`);
        }
      }
      console.log(`✅ Deleted ${deletedCount}/${staleUrls.length} stale job(s)`);
    } else {
      console.log("\n✅ No stale jobs to delete");
    }

    console.log("\n=== Step 5: Summary ===");

    await new Promise(r => setTimeout(r, 2000));
    const finalResult = await querySOLR(COMPANY_CIF);
    console.log(`\n=== SUMMARY ===`);
    console.log(`Jobs existing in SOLR before scrape: ${existingCount}`);
    console.log(`Jobs scraped from ArtSoft website: ${scrapedCount}`);
    console.log(`Stale jobs attempted: ${staleUrls.length}`);
    console.log(`Jobs in SOLR after scrape: ${finalResult.numFound}`);
    console.log(`====================`);

    console.log("\n=== DONE ===");
    console.log("Scraper completed successfully!");

  } catch (err) {
    console.error("Scraper failed:", err);
    process.exit(1);
  }
}

export { parseHtmlJobs, parseInternshipPage, mapToJobModel, transformJobsForSOLR, scrapeInternship };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
