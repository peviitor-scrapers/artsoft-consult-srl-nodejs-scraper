# VERIFY.md — Pași de verificare înainte de push

1. Rulează testele unitare locale:
   ```bash
   npm run test:unit
   ```
   Toate testele trebuie să treacă.

2. Verifică GitHub Actions:
   - `job-seeker-ro-spider.yml` trebuie să ruleze cu succes
   - `automation-testing.yml` trebuie să ruleze cu succes

3. Verifică job-urile în SOLR după un scrape reușit.

4. Verifică `docs/jobs.md` a fost generat și este accesibil pe GitHub Pages:
   - https://sebiboga.github.io/artsoft-consult-srl-nodejs-scraper/jobs.md
