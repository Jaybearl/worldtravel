"use client";

import { useEffect, useState } from "react";
import { getCountryByAlpha3 } from "@/lib/countries";
import { CURRENCY_BY_COUNTRY } from "@/lib/currencyByCountry";
import { GEO_INFO } from "@/lib/geoInfo";
import { getPopulation } from "@/lib/population";

const QUOTE_UNITS = [1, 10, 100, 1000, 10000, 100000];

function pickQuoteUnit(rate: number): number {
  for (const unit of QUOTE_UNITS) {
    if (rate * unit >= 10) return unit;
  }
  return QUOTE_UNITS[QUOTE_UNITS.length - 1];
}

type Props = { code: string };

export default function CountryInfoPanel({ code }: Props) {
  const [rate, setRate] = useState<number | null>(null);
  const [rateStatus, setRateStatus] = useState<"loading" | "idle" | "error">("loading");
  const [population, setPopulation] = useState<number | null>(null);
  const [populationStatus, setPopulationStatus] = useState<"loading" | "idle" | "error">(
    "loading"
  );

  const country = getCountryByAlpha3(code);
  const currency = CURRENCY_BY_COUNTRY[code];
  const geo = GEO_INFO[code];

  useEffect(() => {
    if (!currency || currency.code === "KRW") return;

    let cancelled = false;
    fetch(`https://open.er-api.com/v6/latest/${currency.code}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        const krw = data?.rates?.KRW;
        if (typeof krw === "number") {
          setRate(krw);
          setRateStatus("idle");
        } else {
          setRateStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setRateStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [currency]);

  useEffect(() => {
    let cancelled = false;
    getPopulation(code).then((value) => {
      if (cancelled) return;
      if (value !== null) {
        setPopulation(value);
        setPopulationStatus("idle");
      } else {
        setPopulationStatus("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!country) return null;

  const unit = rate !== null ? pickQuoteUnit(rate) : 1;

  return (
    <div className="absolute bottom-2 left-2 flex max-w-[15rem] items-start gap-2 rounded-lg border border-neutral-300 bg-white/95 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/95">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/w80/${country.alpha2.toLowerCase()}.png`}
        alt={`${country.nameKo} 국기`}
        className="mt-0.5 h-7 w-10 shrink-0 rounded-sm object-cover shadow-sm"
      />
      <div className="space-y-0.5 text-xs leading-tight">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {country.nameKo}
        </p>

        {geo && (
          <>
            <p className="text-neutral-500 dark:text-neutral-400">수도 {geo.capitalKo}</p>
            <p className="text-neutral-500 dark:text-neutral-400">언어 {geo.langKo}</p>
            {geo.area !== null && (
              <p className="text-neutral-500 dark:text-neutral-400">
                면적 {geo.area.toLocaleString()} km²
              </p>
            )}
          </>
        )}

        <p className="text-neutral-500 dark:text-neutral-400">
          인구{" "}
          {populationStatus === "loading"
            ? "조회 중..."
            : populationStatus === "error" || population === null
              ? "정보 없음"
              : `약 ${Math.round(population).toLocaleString()}명`}
        </p>

        {currency && (
          <p className="text-neutral-500 dark:text-neutral-400">
            {currency.code === "KRW"
              ? "대한민국 원(KRW)"
              : rateStatus === "loading"
                ? "환율 조회 중..."
                : rateStatus === "error" || rate === null
                  ? "환율 정보 없음"
                  : `${unit.toLocaleString()} ${currency.code} ≈ ${Math.round(
                      rate * unit
                    ).toLocaleString()}원`}
          </p>
        )}
      </div>
    </div>
  );
}
