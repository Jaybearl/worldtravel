"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRY_LIST, getCountryByAlpha3 } from "@/lib/countries";

type Props = {
  value: string;
  onChange: (code: string) => void;
};

export default function CountrySelect({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = getCountryByAlpha3(value);
  const filtered = query
    ? COUNTRY_LIST.filter(
        (c) =>
          c.nameKo.includes(query) || c.nameEn.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRY_LIST;

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
        placeholder="국가 검색 (한글/영문)"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-400">검색 결과 없음</li>
          )}
          {filtered.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                  setQuery("");
                }}
                className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  c.code === value ? "font-medium text-amber-600" : ""
                }`}
              >
                {c.nameKo} ({c.nameEn})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
