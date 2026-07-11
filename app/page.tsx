"use client";

import { useEffect, useMemo, useState } from "react";
import WorldMap from "@/components/WorldMap";
import CountryPanel from "@/components/CountryPanel";
import { getAllPhotos, type Photo } from "@/lib/photos";
import { getCountryByAlpha3 } from "@/lib/countries";

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    getAllPhotos()
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, []);

  const photosByCountry = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of photos) {
      const urls = map.get(p.countryCode) ?? [];
      urls.push(p.imageUrl);
      map.set(p.countryCode, urls);
    }
    return map;
  }, [photos]);

  const selectedPhotos = useMemo(
    () => (selectedCode ? photos.filter((p) => p.countryCode === selectedCode) : []),
    [photos, selectedCode]
  );

  const selectedCountryNameKo = selectedCode
    ? getCountryByAlpha3(selectedCode)?.nameKo ?? selectedCode
    : "";

  return (
    <main className="mx-auto flex w-full min-h-screen max-w-7xl flex-col gap-6 px-4 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">세계여행자</h1>
        <a href="/admin/login" className="text-sm text-neutral-400 hover:text-neutral-600">
          관리자
        </a>
      </header>

      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <WorldMap
          photosByCountry={photosByCountry}
          selectedCode={selectedCode}
          onSelectCountry={(code) => setSelectedCode(code)}
        />
        {!loading && (
          <p className="mt-2 text-center text-xs text-neutral-400">
            사진으로 채워진 {photosByCountry.size}개국을 여행했어요. 클릭해서 사진을 확인해보세요.
          </p>
        )}
      </section>

      {selectedCode && (
        <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <CountryPanel
            countryNameKo={selectedCountryNameKo}
            photos={selectedPhotos}
            loading={loading}
          />
        </section>
      )}
    </main>
  );
}
