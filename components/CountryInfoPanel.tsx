"use client";

import { useEffect, useState } from "react";
import { getCountryByAlpha3 } from "@/lib/countries";
import { CURRENCY_BY_COUNTRY } from "@/lib/currencyByCountry";

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
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  const country = getCountryByAlpha3(code);
  const currency = CURRENCY_BY_COUNTRY[code];

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
          setStatus("idle");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [currency]);

  if (!country) return null;

  const unit = rate !== null ? pickQuoteUnit(rate) : 1;

  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-lg border border-neutral-300 bg-white/90 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/90">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/w80/${country.alpha2.toLowerCase()}.png`}
        alt={`${country.nameKo} 국기`}
        className="h-7 w-10 rounded-sm object-cover shadow-sm"
      />
      <div className="text-xs leading-tight">
        <p className="font-medium text-neutral-700 dark:text-neutral-200">{country.nameKo}</p>
        {currency && (
          <p className="text-neutral-500 dark:text-neutral-400">
            {currency.code === "KRW"
              ? "대한민국 원(KRW)"
              : status === "loading"
                ? "환율 조회 중..."
                : status === "error" || rate === null
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
