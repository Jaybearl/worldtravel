"use client";

import { useMemo, useState } from "react";
import type { Photo } from "@/lib/photos";
import PhotoGrid from "@/components/PhotoGrid";

type Props = {
  countryNameKo: string;
  photos: Photo[];
  loading: boolean;
};

export default function CountryPanel({ countryNameKo, photos, loading }: Props) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const cities = useMemo(() => {
    const set = new Set(photos.map((p) => p.city).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    if (!selectedCity) return photos;
    return photos.filter((p) => p.city === selectedCity);
  }, [photos, selectedCity]);

  return (
    <div>
      <h2 className="text-lg font-semibold">{countryNameKo}</h2>

      {loading ? (
        <p className="mt-4 text-sm text-neutral-400">불러오는 중...</p>
      ) : (
        <>
          {cities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCity(null)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedCity === null
                    ? "bg-amber-500 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                전체
              </button>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    selectedCity === city
                      ? "bg-amber-500 text-white"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4">
            <PhotoGrid photos={filteredPhotos} />
          </div>
        </>
      )}
    </div>
  );
}
