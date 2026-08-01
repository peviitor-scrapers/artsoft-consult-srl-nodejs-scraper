# Robots.txt Analysis — ArtSoft Consult Careers

Sursa: https://www.artsoft-consult.ro/robots.txt

## Analysis

ArtSoft Consult website allows scraping of their careers page. The scraper:
- Fetches `https://www.artsoft-consult.ro/careers/job-openings` (public HTML page)
- Respects standard crawling best practices
- Uses a single identifiable User-Agent: `job_seeker_ro_spider`
- Makes minimal requests (only one page fetch per scrape run)
- Does NOT overload the server
