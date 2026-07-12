"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { addPhoto } from "@/lib/photos";
import { COUNTRY_LIST, getCountryByAlpha3 } from "@/lib/countries";
import { geocodeCity } from "@/lib/geocode";
import CountrySelect from "@/components/CountrySelect";

function isDuplicate(a: File, b: File) {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

export default function UploadForm() {
  const [countryCode, setCountryCode] = useState(COUNTRY_LIST[0]?.code ?? "");
  const [city, setCity] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  function addFiles(incoming: File[]) {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setFiles((prev) => [
      ...prev,
      ...images.filter((img) => !prev.some((p) => isDuplicate(p, img))),
    ]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pasted = Array.from(items)
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      if (pasted.length > 0) addFiles(pasted);
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  async function handleFindCoords() {
    const country = getCountryByAlpha3(countryCode);
    if (!city || !country) return;
    setGeocoding(true);
    try {
      const result = await geocodeCity(city, country.nameEn);
      setCoords(result);
      if (!result) setMessage("좌표를 찾지 못했어요. 직접 입력 없이 진행해도 괜찮아요.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const country = getCountryByAlpha3(countryCode);
    if (!country || files.length === 0 || !city || !takenAt) {
      setMessage("국가, 도시, 날짜, 사진을 모두 입력해주세요.");
      return;
    }

    setMessage(null);
    setProgress({ done: 0, total: files.length });

    for (const file of files) {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
      });

      const path = `photos/${country.code}/${city}/${crypto.randomUUID()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, compressed);
      const imageUrl = await getDownloadURL(storageRef);

      await addPhoto({
        imageUrl,
        storagePath: path,
        countryCode: country.code,
        countryNameKo: country.nameKo,
        countryNameEn: country.nameEn,
        city,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        caption,
        takenAt,
      });

      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setMessage(`${files.length}장의 사진을 업로드했어요.`);
    setFiles([]);
    setProgress(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">국가</label>
        <CountrySelect value={countryCode} onChange={setCountryCode} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">도시</label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setCoords(null);
            }}
            placeholder="예: 파리"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="button"
            onClick={handleFindCoords}
            disabled={geocoding || !city}
            className="whitespace-nowrap rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {geocoding ? "검색 중..." : "좌표 자동 검색"}
          </button>
        </div>
        {coords && (
          <p className="mt-1 text-xs text-neutral-400">
            좌표: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">날짜</label>
        <input
          type="date"
          required
          value={takenAt}
          onChange={(e) => setTakenAt(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">캡션 (선택)</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">사진</label>
        <div
          ref={dropZoneRef}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            addFiles(Array.from(e.dataTransfer.files));
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragActive
              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
              : "border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-sm text-neutral-500">
            사진을 이곳에 드래그하거나, 붙여넣기(Ctrl+V) 하거나, 클릭해서 선택하세요
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
            className="hidden"
          />
        </div>

        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {previews.map(({ file, url }, i) => (
              <div key={`${file.name}-${file.lastModified}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={file.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="제거"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <p className="mt-1 text-xs text-neutral-400">{files.length}개 파일 선택됨</p>
        )}
      </div>

      <button
        type="submit"
        disabled={progress !== null}
        className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {progress ? `업로드 중... (${progress.done}/${progress.total})` : "업로드"}
      </button>

      {message && <p className="text-sm text-neutral-500">{message}</p>}
    </form>
  );
}
