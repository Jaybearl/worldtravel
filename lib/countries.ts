import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import ko from "i18n-iso-countries/langs/ko.json";

countries.registerLocale(en);
countries.registerLocale(ko);

export type CountryOption = {
  code: string; // ISO 3166-1 alpha-3, used as the canonical countryCode everywhere
  alpha2: string; // ISO 3166-1 alpha-2, used for flag images
  nameKo: string;
  nameEn: string;
  numeric: string; // ISO 3166-1 numeric, matches world-atlas topojson `id`
};

function buildCountryList(): CountryOption[] {
  const numericMap = countries.getNumericCodes();
  const list: CountryOption[] = [];

  for (const [numeric, alpha2] of Object.entries(numericMap)) {
    const alpha3 = countries.alpha2ToAlpha3(alpha2);
    const nameEn = countries.getName(alpha2, "en");
    if (!alpha3 || !nameEn) continue;
    const nameKo = countries.getName(alpha2, "ko") ?? nameEn;
    list.push({ code: alpha3, alpha2, nameKo, nameEn, numeric });
  }

  return list.sort((a, b) => a.nameKo.localeCompare(b.nameKo, "ko"));
}

export const COUNTRY_LIST: CountryOption[] = buildCountryList();

const byAlpha3 = new Map(COUNTRY_LIST.map((c) => [c.code, c]));
const byNumeric = new Map(COUNTRY_LIST.map((c) => [c.numeric, c]));

export function getCountryByAlpha3(code: string): CountryOption | undefined {
  return byAlpha3.get(code);
}

export function getCountryByNumericId(id: string | number): CountryOption | undefined {
  return byNumeric.get(String(id).padStart(3, "0"));
}

// ISO 3166-1 alpha-3 codes for dependent territories/collectivities rather
// than sovereign states (French Guiana, Puerto Rico, Hong Kong, etc). Their
// Korean/English names often contain their parent country's name (e.g.
// "프랑스령 폴리네시아" contains "프랑스"), which makes them show up as noise
// when searching for the parent country on the map. Still kept in
// COUNTRY_LIST itself so photos can be tagged to them specifically.
export const NON_SOVEREIGN_CODES: ReadonlySet<string> = new Set([
  "ASM", "AIA", "ABW", "BMU", "BES", "VGB", "CYM", "CXR", "CCK", "COK",
  "CUW", "FLK", "FRO", "GUF", "PYF", "ATF", "GIB", "GRL", "GLP", "GUM",
  "GGY", "HKG", "IMN", "JEY", "MAC", "MTQ", "MYT", "MSR", "NCL", "NIU",
  "NFK", "MNP", "PCN", "PRI", "REU", "BLM", "MAF", "SPM", "SXM", "SGS",
  "SJM", "TKL", "TCA", "VIR", "WLF",
]);
