"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { addPhoto, getAllPhotos, hashFile } from "@/lib/photos";
import AuthGuard from "@/components/AuthGuard";

type Meta = {
  countryCode: string;
  countryNameKo: string;
  countryNameEn: string;
  city: string;
  takenAt: string;
  lat: number;
  lng: number;
};

const JPN = { countryCode: "JPN", countryNameKo: "일본", countryNameEn: "Japan" };
const VNM = { countryCode: "VNM", countryNameKo: "베트남", countryNameEn: "Vietnam" };
const USA = { countryCode: "USA", countryNameKo: "미국", countryNameEn: "United States of America" };
const ESP = { countryCode: "ESP", countryNameKo: "스페인", countryNameEn: "Spain" };
const IDN = { countryCode: "IDN", countryNameKo: "인도네시아", countryNameEn: "Indonesia" };
const CAN = { countryCode: "CAN", countryNameKo: "캐나다", countryNameEn: "Canada" };
const THA = { countryCode: "THA", countryNameKo: "태국", countryNameEn: "Thailand" };
const CZE = { countryCode: "CZE", countryNameKo: "체코공화국", countryNameEn: "Czech Republic" };
const DEU = { countryCode: "DEU", countryNameKo: "독일", countryNameEn: "Germany" };

type CityInfo = { country: typeof JPN; city: string; lat: number; lng: number };

const CITIES: Record<string, CityInfo> = {
  교토: { country: JPN, city: "교토", lat: 35.0115754, lng: 135.7681441 },
  나트랑: { country: VNM, city: "나트랑", lat: 12.2084991, lng: 109.2871204 },
  뉴욕: { country: USA, city: "뉴욕", lat: 40.7127281, lng: -74.0060152 },
  다낭: { country: VNM, city: "다낭", lat: 16.068501, lng: 108.2240242 },
  달랏: { country: VNM, city: "달랏", lat: 11.9402416, lng: 108.4375758 },
  댈러스: { country: USA, city: "댈러스", lat: 32.7762719, lng: -96.7968559 },
  도쿄: { country: JPN, city: "도쿄", lat: 35.6768601, lng: 139.7638947 },
  라스베이거스: { country: USA, city: "라스베이거스", lat: 36.1674263, lng: -115.1484131 },
  마드리드: { country: ESP, city: "마드리드", lat: 40.416782, lng: -3.703507 },
  발리: { country: IDN, city: "발리", lat: -8.2271303, lng: 115.1919203 },
  밴쿠버: { country: CAN, city: "밴쿠버", lat: 49.2608724, lng: -123.113952 },
  // 폴더명은 "삿포르"지만 기존 데이터와 맞춰 "삿포로"로 표기
  삿포르: { country: JPN, city: "삿포로", lat: 43.061936, lng: 141.3542924 },
  세고비아: { country: ESP, city: "세고비아", lat: 40.9481192, lng: -4.1172101 },
  오사카: { country: JPN, city: "오사카", lat: 34.6937569, lng: 135.5014539 },
  치앙마이: { country: THA, city: "치앙마이", lat: 18.7882778, lng: 98.9858802 },
  프라하: { country: CZE, city: "프라하", lat: 50.0874654, lng: 14.4212535 },
  하와이: { country: USA, city: "하와이", lat: 19.5938015, lng: -155.4283701 },
  하이델베르크: { country: DEU, city: "하이델베르크", lat: 49.4093582, lng: 8.694724 },
  후쿠오카: { country: JPN, city: "후쿠오카", lat: 33.6251241, lng: 130.6180016 },
};

// 파일명 -> 촬영일 (EXIF 기준, 3장은 EXIF 날짜가 없어 같은 폴더의 다른 사진 날짜로 대체)
const DATES: Record<string, string> = {
  "IMG_4948.JPEG": "2024-07-22",
  "IMG_5033.JPEG": "2024-07-22",
  "IMG_5047.JPEG": "2024-07-22",
  "IMG_5065 (1).JPEG": "2024-07-22",
  "IMG_6549.JPEG": "2023-07-18",
  "IMG_6589.JPEG": "2023-07-19",
  "IMG_8410.JPEG": "2023-07-18",
  "IMG_0048.JPEG": "2024-02-08",
  "IMG_0057.JPEG": "2024-02-08",
  "IMG_0063.JPEG": "2024-02-08",
  "IMG_9314.JPEG": "2024-02-08",
  "IMG_9405.JPEG": "2024-02-08",
  "IMG_9724.JPEG": "2024-02-08",
  "IMG_9881.JPEG": "2024-02-08",
  "IMG_7420.JPEG": "2025-01-14",
  "IMG_7461.JPEG": "2025-01-14",
  "IMG_7539.JPEG": "2024-01-14",
  "IMG_7754.JPEG": "2024-01-16",
  "IMG_7786.JPEG": "2024-01-16",
  "IMG_7822 (1).JPEG": "2024-01-16",
  "IMG_7962.JPEG": "2024-01-16",
  "IMG_7989.JPEG": "2024-01-16",
  "IMG_8005.JPEG": "2024-01-16",
  "IMG_3393.JPEG": "2023-09-30",
  "IMG_3398.JPEG": "2023-09-30",
  "IMG_3414.JPEG": "2023-09-30",
  "IMG_3425.JPEG": "2023-09-30",
  "IMG_3493.JPEG": "2023-10-01",
  "IMG_3538.JPEG": "2023-10-01",
  "IMG_8244.JPEG": "2024-01-12",
  "IMG_8224.JPEG": "2024-01-20",
  "IMG_8448.JPEG": "2024-01-20",
  "IMG_8455.JPEG": "2024-01-20",
  "IMG_8474.JPEG": "2024-01-21",
  "IMG_1605.JPEG": "2023-07-31",
  "IMG_1620.JPEG": "2023-07-31",
  "IMG_0022.JPEG": "2024-02-20",
  "IMG_0861.JPEG": "2024-02-18",
  "IMG_1126.JPEG": "2024-02-18",
  "IMG_1295.JPEG": "2024-02-19",
  "IMG_1923.JPEG": "2024-02-19",
  "IMG_2013.JPEG": "2024-02-19",
  "IMG_9703.JPEG": "2024-02-19",
  "IMG_2360.JPEG": "2025-02-21",
  "IMG_0647.JPEG": "2025-02-04",
  "IMG_0672.JPEG": "2025-02-05",
  "IMG_0682.JPEG": "2025-02-05",
  "IMG_1410.JPEG": "2025-02-04",
  "IMG_7572.JPEG": "2025-02-04",
  "IMG_7661.JPEG": "2025-02-05",
  "IMG_8912.JPEG": "2025-02-02",
  "IMG_1093.JPEG": "2023-07-31",
  "IMG_1214.JPEG": "2023-07-31",
  "IMG_1220.JPEG": "2023-07-31",
  "IMG_1513.JPEG": "2023-07-31",
  "IMG_9315.JPEG": "2023-07-31",
  "IMG_9504.JPEG": "2023-07-31",
  "IMG_9941.JPEG": "2023-07-31",
  "IMG_4904.JPEG": "2024-07-21",
  "IMG_5447.JPEG": "2024-07-23",
  "IMG_5896.JPEG": "2024-07-23",
  "IMG_0799.JPEG": "2025-02-06",
  "IMG_1480.JPEG": "2025-02-08",
  "IMG_1501.JPEG": "2025-02-08",
  "IMG_1555.JPEG": "2025-02-08",
  "IMG_1593.JPEG": "2025-02-08",
  "IMG_1979.JPEG": "2025-02-09",
  "IMG_8054.JPEG": "2025-02-08",
  "IMG_5243.JPEG": "2025-08-15",
  "IMG_5065.JPEG": "2025-01-23",
  "IMG_8272.JPEG": "2025-01-23",
  "IMG_8727.JPEG": "2024-01-28",
  "IMG_8814.JPEG": "2024-01-28",
  "IMG_8844.JPEG": "2024-01-28",
  "IMG_8848.JPEG": "2024-01-28",
  "IMG_8928.JPEG": "2024-01-28",
  "IMG_8950.JPEG": "2024-01-28",
  "IMG_6200.JPEG": "2024-09-27",
  "IMG_6205.JPEG": "2024-09-27",
};

function metaFor(file: File): Meta | null {
  // 폴더를 통째로 선택하면 webkitRelativePath가 "사진모음/교토/IMG_xxx.JPEG" 형태로 들어온다.
  const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const folder = relPath ? relPath.split("/").slice(-2, -1)[0] : null;
  const cityInfo = (folder && CITIES[folder]) || null;
  const takenAt = DATES[file.name];
  if (!cityInfo || !takenAt) return null;
  return {
    countryCode: cityInfo.country.countryCode,
    countryNameKo: cityInfo.country.countryNameKo,
    countryNameEn: cityInfo.country.countryNameEn,
    city: cityInfo.city,
    takenAt,
    lat: cityInfo.lat,
    lng: cityInfo.lng,
  };
}

type Progress = { done: number; skipped: number; failed: number; total: number };

function BulkImportTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  function handlePick(incoming: File[]) {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    const matched: File[] = [];
    const missed: string[] = [];
    for (const f of images) {
      if (metaFor(f)) matched.push(f);
      else missed.push(f.name);
    }
    setFiles(matched);
    setUnmatched(missed);
    setMessage(null);
  }

  async function handleImport() {
    if (files.length === 0) return;
    if (
      !confirm(
        `총 ${files.length}장을 국가/도시/날짜 정보와 함께 업로드합니다.\n시간이 꽤 걸릴 수 있고, 이 탭을 닫으면 중단돼요.\n계속할까요?`
      )
    ) {
      return;
    }

    setImporting(true);
    const existing = await getAllPhotos();
    const existingHashes = new Set(existing.map((p) => p.contentHash).filter(Boolean));

    let done = 0;
    let skipped = 0;
    let failed = 0;
    let firstError: string | null = null;
    setProgress({ done, skipped, failed, total: files.length });

    for (const file of files) {
      const meta = metaFor(file);
      if (!meta) continue;
      try {
        const hash = await hashFile(file);
        if (existingHashes.has(hash)) {
          skipped++;
          setProgress({ done, skipped, failed, total: files.length });
          continue;
        }

        const compressed = await imageCompression(file, {
          maxSizeMB: 3,
          maxWidthOrHeight: 2000,
          initialQuality: 0.85,
          fileType: "image/webp",
          useWebWorker: true,
        });

        const baseName = file.name.replace(/\.[^./]+$/, "");
        const path = `photos/${meta.countryCode}/${meta.city}/${crypto.randomUUID()}-${baseName}.webp`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, compressed);
        const imageUrl = await getDownloadURL(storageRef);

        await addPhoto({
          imageUrl,
          storagePath: path,
          countryCode: meta.countryCode,
          countryNameKo: meta.countryNameKo,
          countryNameEn: meta.countryNameEn,
          city: meta.city,
          lat: meta.lat,
          lng: meta.lng,
          caption: "",
          takenAt: meta.takenAt,
          contentHash: hash,
        });

        existingHashes.add(hash);
        done++;
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        console.error("일괄 업로드 실패:", file.name, e);
        if (!firstError) firstError = msg;
      }
      setProgress({ done, skipped, failed, total: files.length });
    }

    setImporting(false);
    setFiles([]);
    setMessage(
      `완료: 업로드 ${done}장, 중복으로 건너뜀 ${skipped}장, 실패 ${failed}장` +
        (firstError ? `\n첫 번째 오류: ${firstError}` : "")
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-2 text-neutral-600 dark:text-neutral-300">
          사진모음 폴더(19개 도시 하위폴더 포함)를 통째로 선택하세요.
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
        {files.length > 0 && (
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {files.length}장 매칭됨
            {unmatched.length > 0 && ` · ${unmatched.length}장 매칭 안 됨`}
          </p>
        )}
        {unmatched.length > 0 && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            매칭 안 된 파일: {unmatched.join(", ")}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleImport}
        disabled={files.length === 0 || importing}
        className="self-start rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {importing
          ? `업로드 중... (${(progress?.done ?? 0) + (progress?.skipped ?? 0) + (progress?.failed ?? 0)}/${progress?.total ?? 0})`
          : `업로드 시작 (${files.length}장)`}
      </button>

      {message && <p className="whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-300">{message}</p>}
    </div>
  );
}

export default function BulkImportPage() {
  return (
    <AuthGuard>
      <main className="mx-auto flex w-full min-h-screen max-w-3xl flex-col gap-6 px-4 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">사진 일괄 업로드 (1회용)</h1>
          <Link href="/admin/manage" className="text-sm text-neutral-400 hover:text-neutral-600">
            사진 관리로
          </Link>
        </div>
        <BulkImportTool />
      </main>
    </AuthGuard>
  );
}
