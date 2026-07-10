"use client";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import type { Photo } from "@/lib/photos";

type Props = {
  photos: Photo[];
  index: number;
  open: boolean;
  onClose: () => void;
};

export default function PhotoLightbox({ photos, index, open, onClose }: Props) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={photos.map((p) => ({
        src: p.imageUrl,
        title: `${p.city} · ${p.takenAt}`,
        description: p.caption || undefined,
      }))}
    />
  );
}
