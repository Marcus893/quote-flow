"use client";

import { useState } from "react";
import PhotoLightbox from "@/components/photo-lightbox";
import Image from "next/image";

interface ClickablePhotoGridProps {
  photos: string[];
  columns?: 2 | 3;
}

export default function ClickablePhotoGrid({
  photos,
  columns = 3,
}: ClickablePhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const gridCols = columns === 2 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3";

  return (
    <>
      <div className={`grid ${gridCols} gap-2`}>
        {photos.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all"
          >
            <Image
              src={url}
              alt={`Photo ${i + 1}`}
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
