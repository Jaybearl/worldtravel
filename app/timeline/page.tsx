"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllPhotos, type Photo } from "@/lib/photos";
import PhotoGrid from "@/components/PhotoGrid";

export default function TimelinePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPhotos()
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, []);

  const countryCount = useMemo(
    () => new Set(photos.map((p) => p.countryCode)).size,
    [photos]
  );

  // getAllPhotos already orders by takenAt desc, so photos within each
  // year group stay in descending date order without a separate sort.
  const byYear = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const p of photos) {
      const year = p.takenAt ? p.takenAt.slice(0, 4) : "날짜 없음";
      const arr = map.get(year) ?? [];
      arr.push(p);
      map.set(year, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [photos]);

  return (
    <main className="mx-auto flex w-full min-h-screen max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="flex items-baseline justify-between">
        <Link href="/" className="text-2xl font-bold hover:opacity-80">
          한지리의 세계여행
        </Link>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600">
          지도로 돌아가기
        </Link>
      </header>

      <div>
        <h1 className="text-xl font-bold">여행 연표</h1>
        {!loading && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            총 {photos.length}장의 사진 · {countryCount}개국
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">불러오는 중...</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-neutral-400">아직 등록된 사진이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {byYear.map(([year, yearPhotos]) => (
            <section key={year}>
              <h2 className="mb-3 text-lg font-semibold">
                {year === "날짜 없음" ? year : `${year}년`}{" "}
                <span className="text-sm font-normal text-neutral-400">
                  ({yearPhotos.length}장)
                </span>
              </h2>
              <PhotoGrid photos={yearPhotos} />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
