"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_LIST, NON_SOVEREIGN_CODES, getCountryByAlpha3 } from "@/lib/countries";

export type CityIndexEntry = { city: string; countryCode: string };

type ResultItem = {
  key: string;
  code: string;
  label: string;
};

type Props = {
  value: string;
  cityIndex: CityIndexEntry[];
  onSelect: (code: string, nameEn: string) => void;
};

export default function MapSearch({ value, cityIndex, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = getCountryByAlpha3(value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const qLower = q.toLowerCase();
    const items: ResultItem[] = [];

    for (const c of COUNTRY_LIST) {
      if (NON_SOVEREIGN_CODES.has(c.code)) continue;
      if (c.nameKo.includes(q) || c.nameEn.toLowerCase().includes(qLower)) {
        items.push({ key: `country-${c.code}`, code: c.code, label: `${c.nameKo} (${c.nameEn})` });
      }
    }

    const seenCities = new Set<string>();
    for (const entry of cityIndex) {
      if (NON_SOVEREIGN_CODES.has(entry.countryCode)) continue;
      if (!entry.city.toLowerCase().includes(qLower) && !entry.city.includes(q)) continue;
      const dedupeKey = `${entry.city}-${entry.countryCode}`;
      if (seenCities.has(dedupeKey)) continue;
      seenCities.add(dedupeKey);
      const country = getCountryByAlpha3(entry.countryCode);
      items.push({
        key: `city-${dedupeKey}`,
        code: entry.countryCode,
        label: `${entry.city} · ${country?.nameKo ?? entry.countryCode}`,
      });
    }

    return items;
  }, [query, cityIndex]);

  function handlePick(code: string) {
    const country = getCountryByAlpha3(code);
    onSelect(code, country?.nameEn ?? code);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={open ? query : selected ? `${selected.nameKo} (${selected.nameEn})` : ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder="국가·도시 검색"
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      {open && query && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-400">검색 결과 없음</li>
          )}
          {results.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => handlePick(r.code)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
