"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { getAllPhotos, deletePhoto, updatePhoto, type Photo } from "@/lib/photos";
import { getCountryByAlpha3 } from "@/lib/countries";
import CountrySelect from "@/components/CountrySelect";

type EditState = {
  countryCode: string;
  city: string;
  takenAt: string;
  caption: string;
};

function PhotoCard({
  photo,
  onDeleted,
  onUpdated,
}: {
  photo: Photo;
  onDeleted: () => void;
  onUpdated: (data: Partial<Photo>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<EditState>({
    countryCode: photo.countryCode,
    city: photo.city,
    takenAt: photo.takenAt,
    caption: photo.caption,
  });

  async function handleDelete() {
    if (!confirm(`${photo.countryNameKo} · ${photo.city} 사진을 삭제할까요?`)) return;
    setDeleting(true);
    try {
      await deletePhoto(photo);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    const country = getCountryByAlpha3(form.countryCode);
    if (!country || !form.city || !form.takenAt) return;
    setSaving(true);
    try {
      const data = {
        countryCode: country.code,
        countryNameKo: country.nameKo,
        countryNameEn: country.nameEn,
        city: form.city,
        takenAt: form.takenAt,
        caption: form.caption,
      };
      await updatePhoto(photo.id, data);
      onUpdated(data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
        <Image src={photo.imageUrl} alt={photo.city} fill className="object-cover" unoptimized />
      </div>

      {editing ? (
        <div className="flex flex-col gap-1.5 p-2">
          <CountrySelect
            value={form.countryCode}
            onChange={(code) => setForm((f) => ({ ...f, countryCode: code }))}
          />
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="도시"
            className="rounded border border-neutral-300 px-1.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            type="date"
            value={form.takenAt}
            onChange={(e) => setForm((f) => ({ ...f, takenAt: e.target.value }))}
            className="rounded border border-neutral-300 px-1.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
          <textarea
            value={form.caption}
            onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
            placeholder="캡션"
            rows={2}
            className="rounded border border-neutral-300 px-1.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
          <div className="mt-1 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-medium text-amber-600 hover:underline disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={() => {
                setForm({
                  countryCode: photo.countryCode,
                  city: photo.city,
                  takenAt: photo.takenAt,
                  caption: photo.caption,
                });
                setEditing(false);
              }}
              disabled={saving}
              className="text-xs text-neutral-400 hover:underline"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2">
          <p className="truncate text-xs font-medium">
            {photo.countryNameKo} · {photo.city}
          </p>
          <p className="text-xs text-neutral-400">{photo.takenAt}</p>
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-neutral-500 hover:underline"
            >
              수정
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ManageList() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPhotos()
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-neutral-400">불러오는 중...</p>;
  if (photos.length === 0) return <p className="text-sm text-neutral-400">등록된 사진이 없어요.</p>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          onDeleted={() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id))}
          onUpdated={(data) =>
            setPhotos((prev) =>
              prev.map((p) => (p.id === photo.id ? { ...p, ...data } : p))
            )
          }
        />
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
          <div className="flex gap-3">
            <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600">
              지도로 돌아가기
            </Link>
            <Link href="/admin/upload" className="text-sm text-neutral-400 hover:text-neutral-600">
              업로드
            </Link>
          </div>
        </div>
        <ManageList />
      </main>
    </AuthGuard>
  );
}
