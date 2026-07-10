"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AuthGuard from "@/components/AuthGuard";
import { getAllPhotos, deletePhoto, type Photo } from "@/lib/photos";

function ManageList() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getAllPhotos()
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(photo: Photo) {
    if (!confirm(`${photo.countryNameKo} · ${photo.city} 사진을 삭제할까요?`)) return;
    setDeletingId(photo.id);
    try {
      await deletePhoto(photo);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="text-sm text-neutral-400">불러오는 중...</p>;
  if (photos.length === 0) return <p className="text-sm text-neutral-400">등록된 사진이 없어요.</p>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo) => (
        <div key={photo.id} className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
            <Image src={photo.imageUrl} alt={photo.city} fill className="object-cover" unoptimized />
          </div>
          <div className="p-2">
            <p className="truncate text-xs font-medium">
              {photo.countryNameKo} · {photo.city}
            </p>
            <p className="text-xs text-neutral-400">{photo.takenAt}</p>
            <button
              onClick={() => handleDelete(photo)}
              disabled={deletingId === photo.id}
              className="mt-1 text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              {deletingId === photo.id ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ManagePage() {
  return (
    <AuthGuard>
      <main className="mx-auto flex w-full min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">사진 관리</h1>
          <a href="/admin/upload" className="text-sm text-neutral-400 hover:text-neutral-600">
            업로드
          </a>
        </div>
        <ManageList />
      </main>
    </AuthGuard>
  );
}
