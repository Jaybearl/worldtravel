import AuthGuard from "@/components/AuthGuard";
import UploadForm from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <AuthGuard>
      <main className="mx-auto flex w-full min-h-screen max-w-lg flex-col gap-6 px-4 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">사진 업로드</h1>
          <a href="/admin/manage" className="text-sm text-neutral-400 hover:text-neutral-600">
            관리
          </a>
        </div>
        <UploadForm />
      </main>
    </AuthGuard>
  );
}
