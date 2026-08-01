import { jest } from '@jest/globals';

describe('index.js Component Tests', () => {
  let index;

  beforeAll(async () => {
    index = await import('../../scraper/index.js');
  });

  describe('transformJobsForSOLR', () => {
    it('should filter locations to only Romanian cities', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['România'] },
          { url: 'https://test.com/2', title: 'Job 2', location: ['Bucharest'] },
          { url: 'https://test.com/3', title: 'Job 3', location: ['Bulgaria'] },
          { url: 'https://test.com/4', title: 'Job 4', location: ['Cluj-Napoca'] },
          { url: 'https://test.com/5', title: 'Job 5', location: [] }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].location).toEqual(['România']);
      expect(result.jobs[1].location).toEqual(['Bucharest']);
      expect(result.jobs[2].location).toEqual(['România']);
      expect(result.jobs[3].location).toEqual(['Cluj-Napoca']);
      expect(result.jobs[4].location).toEqual(['România']);
    });

    it('should keep company uppercase', () => {
      const payload = {
        source: 'artsoft-consult.ro',
        company: 'artsoft consult srl',
        cif: '15997630',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', company: 'artsoft consult', cif: '15997630' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.company).toBe('ARTSOFT CONSULT SRL');
    });

    it('should normalize workmode values', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', workmode: 'Remote' },
          { url: 'https://test.com/2', title: 'Job 2', workmode: 'ON-SITE' },
          { url: 'https://test.com/3', title: 'Job 3', workmode: 'Hybrid' },
          { url: 'https://test.com/4', title: 'Job 4', workmode: 'hybrid' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].workmode).toBe('remote');
      expect(result.jobs[1].workmode).toBe('on-site');
      expect(result.jobs[2].workmode).toBe('hybrid');
      expect(result.jobs[3].workmode).toBe('hybrid');
    });

    it('should handle empty jobs array', () => {
      const result = index.transformJobsForSOLR({ jobs: [] });
      expect(result.jobs).toEqual([]);
    });
  });

  describe('mapToJobModel', () => {
    it('should map raw job to job model format', () => {
      const rawJob = {
        url: 'https://www.artsoft-consult.ro/careers/job-openings/test-job',
        title: 'Senior Developer',
        location: ['Cluj-Napoca'],
        tags: ['Java', 'Spring'],
        workmode: 'hybrid'
      };

      const COMPANY_NAME = 'ARTSOFT CONSULT SRL';
      const COMPANY_CIF = '15997630';

      const result = index.mapToJobModel(rawJob, COMPANY_CIF, COMPANY_NAME);

      expect(result.url).toBe(rawJob.url);
      expect(result.title).toBe(rawJob.title);
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(COMPANY_CIF);
      expect(result.location).toEqual(rawJob.location);
      expect(result.tags).toEqual(rawJob.tags);
      expect(result.workmode).toBe(rawJob.workmode);
      expect(result.status).toBe('scraped');
      expect(result.date).toBeDefined();
    });

    it('should remove undefined fields', () => {
      const rawJob = {
        url: 'https://test.com/1',
        title: 'Job 1'
      };

      const result = index.mapToJobModel(rawJob, '15997630');

      expect(result.location).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.workmode).toBeUndefined();
    });

    it('should handle missing title', () => {
      const rawJob = { url: 'https://test.com/1' };

      const result = index.mapToJobModel(rawJob, '15997630');

      expect(result.title).toBeUndefined();
      expect(result.url).toBe('https://test.com/1');
    });
  });

  describe('parseHtmlJobs', () => {
    it('should parse Artsoft HTML job listing format', () => {
      const html = `
        <div class="single-job-container">
          <a href="/careers/job-openings/test-job-1"><img class="job-tab" src="/img/test.jpg" alt="Senior Developer"/></a>
          <div class="white-background">
            <h3><a href="/careers/job-openings/test-job-1">Senior Developer</a></h3>
            <span class="jobs-singer-title">Code:</span><span class="jobs-singer-title"> SR-DEV</span>
            <div class="job-description"><h4>Description:</h4><div>We are hiring a senior developer for our office located in Cluj-Napoca.</div></div>
          </div>
        </div>
      `;

      const result = index.parseHtmlJobs(html);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe('Senior Developer');
      expect(result.jobs[0].workmode).toBe('on-site');
      expect(result.jobs[0].location).toContain('Cluj-Napoca');
    });

    it('should handle empty job list', () => {
      const result = index.parseHtmlJobs('<html><body></body></html>');
      expect(result.jobs).toEqual([]);
    });

    it('should handle multiple jobs', () => {
      const html = `
        <div class="single-job-container">
          <div class="white-background">
            <h3><a href="/careers/job-openings/job1">Job 1</a></h3>
            <div class="job-description"><div>Based in Cluj-Napoca</div></div>
          </div>
        </div>
        <div class="single-job-container">
          <div class="white-background">
            <h3><a href="/careers/job-openings/job2">Job 2</a></h3>
            <div class="job-description"><div>Based in Bucharest, fully remote</div></div>
          </div>
        </div>
      `;

      const result = index.parseHtmlJobs(html);
      expect(result.jobs).toHaveLength(2);
      expect(result.jobs[1].workmode).toBe('remote');
    });
  });

  describe('parseInternshipPage', () => {
    it('should return internship entry when page has Internship h1', () => {
      const html = '<html><body><h1>Internship</h1><p>Program description</p></body></html>';
      const result = index.parseInternshipPage(html);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Internship');
      expect(result[0].url).toContain('internship-cv');
      expect(result[0].workmode).toBe('on-site');
      expect(result[0].location).toContain('Cluj-Napoca');
      expect(result[0].tags).toContain('internship');
    });

    it('should return empty array when html is null', () => {
      expect(index.parseInternshipPage(null)).toEqual([]);
    });

    it('should return empty array when no Internship h1 found', () => {
      const html = '<html><body><h1>Job Openings</h1></body></html>';
      expect(index.parseInternshipPage(html)).toEqual([]);
    });

    it('should return empty array for empty html', () => {
      expect(index.parseInternshipPage('')).toEqual([]);
    });
  });

  describe('URL Generation', () => {
    it('should use full URL when href is absolute', () => {
      const html = `
        <div class="single-job-container">
          <div class="white-background">
            <h3><a href="https://www.artsoft-consult.ro/careers/job-openings/test-job">Test Job</a></h3>
            <div class="job-description"><div>Job description</div></div>
          </div>
        </div>
      `;

      const result = index.parseHtmlJobs(html);
      expect(result.jobs[0].url).toBe('https://www.artsoft-consult.ro/careers/job-openings/test-job');
    });

    it('should prepend base URL when href is relative', () => {
      const html = `
        <div class="single-job-container">
          <div class="white-background">
            <h3><a href="/careers/job-openings/test-job">Test Job</a></h3>
            <div class="job-description"><div>Job description</div></div>
          </div>
        </div>
      `;

      const result = index.parseHtmlJobs(html);
      expect(result.jobs[0].url).toBe('https://www.artsoft-consult.ro/careers/job-openings/test-job');
    });
  });
});
