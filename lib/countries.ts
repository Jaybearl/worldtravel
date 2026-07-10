import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import ko from "i18n-iso-countries/langs/ko.json";

countries.registerLocale(en);
countries.registerLocale(ko);

export type CountryOption = {
  code: string; // ISO 3166-1 alpha-3, used as the canonical countryCode everywhere
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
    list.push({ code: alpha3, nameKo, nameEn, numeric });
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
