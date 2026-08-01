import fetch from "node-fetch";

const API_BASE = "https://api.peviitor.ro/v1";
const DEFAULT_CIF = "15997630";

export async function checkApiAvailability(cif = DEFAULT_CIF) {
  try {
    const res = await fetch(`${API_BASE}/scraper/jobs/?cif=${cif}&rows=1`, {
      signal: AbortSignal.timeout(5000)
    });
    return res.ok || res.status === 400;
  } catch {
    return false;
  }
}

export async function checkAnafAvailability() {
  try {
    const res = await fetch("https://demoanaf.ro/api/search?q=test", {
      method: "HEAD",
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const HAS_API = await checkApiAvailability();
export const HAS_ANAF = await checkAnafAvailability();

export function itIfApi(name, fn, timeout) {
  if (HAS_API) return it(name, fn, timeout);
  return it.skip(`${name} (skipped: API unavailable)`, fn, timeout);
}

export function itIfAnaf(name, fn, timeout) {
  if (HAS_ANAF) return it(name, fn, timeout);
  return it.skip(`${name} (skipped: ANAF API unavailable)`, fn, timeout);
}
