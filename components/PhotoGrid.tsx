"use client";

import { useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/photos";
import PhotoLightbox from "@/components/PhotoLightbox";

type Props = {
  photos: Photo[];
};

export default function PhotoGrid({ photos }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-neutral-400">
        아직 등록된 사진이 없어요.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800"
          >
            <Image
              src={photo.imageUrl}
              alt={photo.caption || `${photo.city} 사진`}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-left opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-xs text-white">{photo.city}</p>
            </div>
          </button>
        ))}
      </div>

      <PhotoLightbox
        photos={photos}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}
