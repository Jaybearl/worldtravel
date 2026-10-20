"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import AuthGuard from "@/components/AuthGuard";
import {
  getAllPhotos,
  deletePhoto,
  updatePhoto,
  hashFile,
  type Photo,
} from "@/lib/photos";
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

type MigrateProgress = { done: number; failed: number; total: number };

function MigrateToWebpButton({
  photos,
  onPhotoMigrated,
}: {
  photos: Photo[];
  onPhotoMigrated: (id: string, data: Partial<Photo>) => void;
}) {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrateProgress | null>(null);

  const targets = photos.filter((p) => !p.storagePath.toLowerCase().endsWith(".webp"));

  async function handleMigrate() {
    if (targets.length === 0) return;
    if (
      !confirm(
        `총 ${targets.length}장을 WebP로 재압축해서 교체합니다.\n시간이 꽤 걸릴 수 있고, 이 탭을 닫으면 중단돼요.\n계속할까요?`
      )
    ) {
      return;
    }

    setMigrating(true);
    let done = 0;
    let failed = 0;
    setProgress({ done, failed, total: targets.length });

    for (const photo of targets) {
      try {
        const res = await fetch(photo.imageUrl);
        if (!res.ok) throw new Error("download failed");
        const blob = await res.blob();
        const sourceFile = new File([blob], "source", { type: blob.type || "image/jpeg" });
        const hash = await hashFile(sourceFile);

        const compressed = await imageCompression(sourceFile, {
          maxSizeMB: 3,
          maxWidthOrHeight: 2000,
          initialQuality: 0.85,
          fileType: "image/webp",
          useWebWorker: true,
        });

        const newPath = `photos/${photo.countryCode}/${photo.city}/${crypto.randomUUID()}-migrated.webp`;
        const newRef = ref(storage, newPath);
        await uploadBytes(newRef, compressed);
        const newUrl = await getDownloadURL(newRef);

        const oldPath = photo.storagePath;
        const updates = { imageUrl: newUrl, storagePath: newPath, contentHash: hash };
        await updatePhoto(photo.id, updates);
        await deleteObject(ref(storage, oldPath));

        onPhotoMigrated(photo.id, updates);
        done++;
      } catch {
        failed++;
      }
      setProgress({ done, failed, total: targets.length });
    }

    setMigrating(false);
    alert(`재압축 완료: 성공 ${done}장, 실패 ${failed}장`);
  }

  if (targets.length === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={handleMigrate}
        disabled={migrating}
        className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {migrating ? "재압축 중..." : `기존 사진 WebP로 재압축 (${targets.length}장)`}
      </button>
      {progress && (
        <span className="text-neutral-500 dark:text-neutral-400">
          {progress.done + progress.failed} / {progress.total}
          {progress.failed > 0 && ` (실패 ${progress.failed})`}
        </span>
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
    <div className="flex flex-col gap-4">
      <MigrateToWebpButton
        photos={photos}
        onPhotoMigrated={(id, data) =>
          setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)))
        }
      />
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
