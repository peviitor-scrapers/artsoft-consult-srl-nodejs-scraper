import { jest } from '@jest/globals';
import fs from 'fs';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

const COMPANY_JSON_PATH = 'tmp/company.json';

function backupFile(path) {
  if (fs.existsSync(path)) {
    fs.renameSync(path, `${path}.bak`);
  }
}

function restoreFile(path) {
  if (fs.existsSync(`${path}.bak`)) {
    fs.renameSync(`${path}.bak`, path);
  }
}

function clearAllCaches() {
  if (fs.existsSync(COMPANY_JSON_PATH)) fs.unlinkSync(COMPANY_JSON_PATH);
}

function anafCompanyResponse(data) {
  return {
    ok: true,
    json: async () => ({ data, success: true })
  };
}

function peviitorResponse(companies) {
  return {
    ok: true,
    json: async () => ({ companies })
  };
}

function solrResponse(total, data) {
  return {
    ok: true,
    json: async () => ({ total, data })
  };
}

const ARTSOFT_ANAF_RECORD = {
  cui: 15997630,
  name: 'ARTSOFT CONSULT SRL',
  address: 'Str. Eugen Ionesco, 1A, Cluj-Napoca, Cluj',
  caenCode: '6201',
  inactive: false,
  vatRegistered: true,
  eFacturaRegistered: false,
  headquartersAddress: { locality: 'Cluj-Napoca' }
};

describe('company.js', () => {
  let company;

  beforeAll(async () => {
    fs.mkdirSync("tmp", { recursive: true });
    backupFile(COMPANY_JSON_PATH);
    company = await import('../../scraper/company.js');
  });

  afterAll(() => {
    restoreFile(COMPANY_JSON_PATH);
  });

  beforeEach(() => {
    mockFetch.mockReset();
    clearAllCaches();
  });

  describe('getCompanyData (no cache)', () => {
    it('should fetch ArtSoft via direct CIF lookup and return company data', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse(ARTSOFT_ANAF_RECORD));

      const result = await company.getCompanyData();

      expect(result).toHaveProperty('company', 'ARTSOFT CONSULT SRL');
      expect(result).toHaveProperty('cif', '15997630');
      expect(result).toHaveProperty('active', true);
      expect(result).toHaveProperty('anafData');
      expect(result.anafData.name).toBe('ARTSOFT CONSULT SRL');
    });

    it('should throw when ANAF returns no data', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse(null));

      await expect(company.getCompanyData()).rejects.toThrow('No data from ANAF');
    });

    it('should throw when ANAF returns no company name', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse({ cui: 15997630, name: null }));

      await expect(company.getCompanyData()).rejects.toThrow('ANAF returned no company name');
    });
  });

  describe('getCompanyData (with cache)', () => {
    const cachedData = {
      validatedAt: new Date().toISOString(),
      anaf: ARTSOFT_ANAF_RECORD,
      summary: {
        company: 'ARTSOFT CONSULT SRL',
        cif: '15997630',
        active: true
      }
    };

    beforeEach(() => {
      fs.writeFileSync(COMPANY_JSON_PATH, JSON.stringify(cachedData), 'utf-8');
    });

    it('should use cached company data when available', async () => {
      const result = await company.getCompanyData();

      expect(result.company).toBe('ARTSOFT CONSULT SRL');
      expect(result.cif).toBe('15997630');
      expect(result.active).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('validateAndGetCompany', () => {
    afterEach(() => {
      clearAllCaches();
    });

    it('should return company data with status active', async () => {
      mockFetch
        .mockResolvedValueOnce(anafCompanyResponse(ARTSOFT_ANAF_RECORD))
        .mockResolvedValueOnce(solrResponse(5, [
          { url: 'https://test.com/1', title: 'Job 1' },
          { url: 'https://test.com/2', title: 'Job 2' }
        ]))
        .mockResolvedValueOnce(peviitorResponse([{ company: 'ARTSOFT CONSULT SRL' }]));

      const result = await company.validateAndGetCompany();

      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('company', 'ARTSOFT CONSULT SRL');
      expect(result).toHaveProperty('cif', '15997630');
      expect(result).toHaveProperty('existingJobsCount');
      expect(typeof result.existingJobsCount).toBe('number');
    });

    it('should return inactive status when company is inactive', async () => {
      const inactiveRecord = { ...ARTSOFT_ANAF_RECORD, inactive: true };

      mockFetch
        .mockResolvedValueOnce(anafCompanyResponse(inactiveRecord))
        .mockResolvedValueOnce(solrResponse(2, [
          { url: 'https://test.com/1', title: 'Job 1' },
          { url: 'https://test.com/2', title: 'Job 2' }
        ]))
        .mockResolvedValueOnce(peviitorResponse([]))
        .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 2 }) });

      const result = await company.validateAndGetCompany();

      expect(result).toHaveProperty('status', 'inactive');
      expect(result).toHaveProperty('company', 'ARTSOFT CONSULT SRL');
      expect(result).toHaveProperty('existingJobsCount', 2);
    });
  });
});
