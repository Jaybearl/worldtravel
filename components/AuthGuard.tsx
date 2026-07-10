"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) router.replace("/admin/login");
    });
    return unsubscribe;
  }, [router]);

  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-neutral-400">
        Firebase가 아직 설정되지 않았어요. .env.local을 채운 뒤 다시 시도해주세요.
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        확인 중...
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
