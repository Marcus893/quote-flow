"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

interface PhotoLightboxProps {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">
        {index + 1} / {photos.length}
      </div>

      {/* Previous */}
      {photos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-3 z-10 w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative w-full h-full max-w-4xl max-h-[85vh] m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photos[index]}
          alt={`Photo ${index + 1}`}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
      </div>

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-3 z-10 w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}
