"use client";

import { useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import UploadForm from "@/components/UploadForm";
import FolderUploadForm from "@/components/FolderUploadForm";

export default function UploadPage() {
  const [tab, setTab] = useState<"single" | "folder">("single");

  return (
    <AuthGuard>
      <main className="mx-auto flex w-full min-h-screen max-w-lg flex-col gap-6 px-4 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">사진 업로드</h1>
          <div className="flex gap-3">
            <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600">
              지도로 돌아가기
            </Link>
            <Link href="/admin/manage" className="text-sm text-neutral-400 hover:text-neutral-600">
              관리
            </Link>
          </div>
        </div>

        <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setTab("single")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "single"
                ? "border-b-2 border-amber-500 text-amber-600"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            낱장 업로드
          </button>
          <button
            type="button"
            onClick={() => setTab("folder")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "folder"
                ? "border-b-2 border-amber-500 text-amber-600"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            폴더 일괄 업로드
          </button>
        </div>

        {tab === "single" ? <UploadForm /> : <FolderUploadForm />}
      </main>
    </AuthGuard>
  );
}
