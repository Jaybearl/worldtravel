"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { addPhoto, getAllPhotos, hashFile } from "@/lib/photos";
import { COUNTRY_LIST, getCountryByAlpha3 } from "@/lib/countries";
import { geocodeCity } from "@/lib/geocode";
import { readExifDate } from "@/lib/exif";
import CountrySelect from "@/components/CountrySelect";

type FileWithPath = File & { webkitRelativePath: string };

type Group = {
  folder: string;
  files: File[];
  city: string;
  countryCode: string;
  lat: number | null;
  lng: number | null;
  geocoding: boolean;
  fallbackDate: string;
};

function groupByFolder(files: File[]): Map<string, File[]> {
  const map = new Map<string, File[]>();
  for (const file of files) {
    const relPath = (file as FileWithPath).webkitRelativePath;
    const folder = relPath ? relPath.split("/").slice(-2, -1)[0] : "기타";
    const arr = map.get(folder) ?? [];
    arr.push(file);
    map.set(folder, arr);
  }
  return map;
}

type Progress = { done: number; skipped: number; failed: number; total: number };

export default function FolderUploadForm() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  function handlePick(incoming: File[]) {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    const byFolder = groupByFolder(images);
    const defaultCode = COUNTRY_LIST[0]?.code ?? "";
    setGroups(
      Array.from(byFolder.entries()).map(([folder, files]) => ({
        folder,
        files,
        city: folder,
        countryCode: defaultCode,
        lat: null,
        lng: null,
        geocoding: false,
        fallbackDate: "",
      }))
    );
    setMessage(null);
  }

  function updateGroup(folder: string, patch: Partial<Group>) {
    setGroups((prev) => prev.map((g) => (g.folder === folder ? { ...g, ...patch } : g)));
  }

  async function handleGeocode(group: Group) {
    const country = getCountryByAlpha3(group.countryCode);
    if (!country || !group.city) return;
    updateGroup(group.folder, { geocoding: true });
    const result = await geocodeCity(group.city, country.nameEn);
    updateGroup(group.folder, {
      geocoding: false,
      lat: result?.lat ?? null,
      lng: result?.lng ?? null,
    });
  }

  const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0);
  const readyToUpload =
    groups.length > 0 && groups.every((g) => g.city && g.countryCode);

  async function handleUpload() {
    if (!readyToUpload) return;
    if (
      !confirm(
        `총 ${totalFiles}장을 ${groups.length}개 폴더 기준으로 업로드합니다.\n` +
          `사진의 EXIF 촬영일을 우선 사용하고, 없으면 폴더별 대체 날짜를 사용해요.\n` +
          `시간이 꽤 걸릴 수 있고, 이 탭을 닫으면 중단돼요. 계속할까요?`
      )
    ) {
      return;
    }

    setUploading(true);
    const existing = await getAllPhotos();
    const existingHashes = new Set(existing.map((p) => p.contentHash).filter(Boolean));

    let done = 0;
    let skipped = 0;
    let failed = 0;
    let firstError: string | null = null;
    setProgress({ done, skipped, failed, total: totalFiles });

    for (const group of groups) {
      const country = getCountryByAlpha3(group.countryCode);
      if (!country) continue;

      for (const file of group.files) {
        try {
          const hash = await hashFile(file);
          if (existingHashes.has(hash)) {
            skipped++;
            setProgress({ done, skipped, failed, total: totalFiles });
            continue;
          }

          const exifDate = await readExifDate(file);
          const takenAt = exifDate || group.fallbackDate;
          if (!takenAt) {
            throw new Error("촬영일을 알 수 없고 대체 날짜도 입력되지 않았어요");
          }

          const compressed = await imageCompression(file, {
            maxSizeMB: 3,
            maxWidthOrHeight: 2000,
            initialQuality: 0.85,
            fileType: "image/webp",
            useWebWorker: true,
          });

          const baseName = file.name.replace(/\.[^./]+$/, "");
          const path = `photos/${country.code}/${group.city}/${crypto.randomUUID()}-${baseName}.webp`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, compressed);
          const imageUrl = await getDownloadURL(storageRef);

          await addPhoto({
            imageUrl,
            storagePath: path,
            countryCode: country.code,
            countryNameKo: country.nameKo,
            countryNameEn: country.nameEn,
            city: group.city,
            lat: group.lat,
            lng: group.lng,
            caption: "",
            takenAt,
            contentHash: hash,
          });

          existingHashes.add(hash);
          done++;
        } catch (e) {
          failed++;
          const msg = e instanceof Error ? e.message : String(e);
          console.error("폴더 업로드 실패:", file.name, e);
          if (!firstError) firstError = msg;
        }
        setProgress({ done, skipped, failed, total: totalFiles });
      }
    }

    setUploading(false);
    setGroups([]);
    if (folderInputRef.current) folderInputRef.current.value = "";
    setMessage(
      `완료: 업로드 ${done}장, 중복으로 건너뜀 ${skipped}장, 실패 ${failed}장` +
        (firstError ? `\n첫 번째 오류: ${firstError}` : "")
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-2 text-neutral-600 dark:text-neutral-300">
          도시별로 하위 폴더를 나눠둔 폴더를 통째로 선택하세요. 하위 폴더 하나당 도시 하나로
          인식해요.
        </p>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error -- webkitdirectory는 타입 정의에 없지만 Chrome/Edge에서 폴더 선택을 지원한다
          webkitdirectory=""
          onChange={(e) => handlePick(Array.from(e.target.files ?? []))}
          className="text-sm"
        />
      </div>

      {groups.length > 0 && (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div
              key={group.folder}
              className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{group.folder}</p>
                <p className="text-xs text-neutral-400">{group.files.length}장</p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">국가</label>
                  <CountrySelect
                    value={group.countryCode}
                    onChange={(code) => updateGroup(group.folder, { countryCode: code })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">도시</label>
                  <input
                    type="text"
                    value={group.city}
                    onChange={(e) => updateGroup(group.folder, { city: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGeocode(group)}
                  disabled={group.geocoding || !group.city}
                  className="whitespace-nowrap rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  {group.geocoding ? "검색 중..." : "좌표 자동 검색"}
                </button>
                {group.lat !== null && group.lng !== null && (
                  <span className="text-xs text-neutral-400">
                    좌표: {group.lat.toFixed(4)}, {group.lng.toFixed(4)}
                  </span>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  대체 날짜 (사진에 촬영일 정보가 없을 때 사용)
                </label>
                <input
                  type="date"
                  value={group.fallbackDate}
                  onChange={(e) => updateGroup(group.folder, { fallbackDate: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-48"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!readyToUpload || uploading}
        className="self-start rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {uploading
          ? `업로드 중... (${(progress?.done ?? 0) + (progress?.skipped ?? 0) + (progress?.failed ?? 0)}/${progress?.total ?? 0})`
          : `업로드 시작 (${totalFiles}장)`}
      </button>

      {message && (
        <p className="whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-300">
          {message}
        </p>
      )}
    </div>
  );
}
