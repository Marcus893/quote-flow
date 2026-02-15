"use client";

import { Camera, X, ImagePlus } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";

interface PhotoUploadProps {
  photos: File[];
  previews: string[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  existingUrls?: string[];
  onRemoveExisting?: (index: number) => void;
}

export default function PhotoUpload({
  photos,
  previews,
  onAdd,
  onRemove,
  existingUrls = [],
  onRemoveExisting,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect touch-capable devices (phones/tablets)
    const checkMobile = () => {
      const hasTouchScreen =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0;
      const isNarrow = window.matchMedia("(max-width: 1024px)").matches;
      setIsMobile(hasTouchScreen && isNarrow);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAdd(files);
    }
    // Reset so same file can be selected again
    e.target.value = "";
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-3">
        Job Photos
      </label>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Existing photo URLs (from DB) */}
        {existingUrls.map((url, i) => (
          <div
            key={`existing-${i}`}
            className="relative aspect-square rounded-xl overflow-hidden border border-gray-200"
          >
            <Image
              src={url}
              alt={`Existing photo ${i + 1}`}
              fill
              className="object-cover"
            />
            {onRemoveExisting && (
              <button
                type="button"
                onClick={() => onRemoveExisting(i)}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        ))}

        {/* New file previews */}
        {previews.map((src, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-xl overflow-hidden border border-gray-200"
          >
            <Image
              src={src}
              alt={`Job photo ${i + 1}`}
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ))}

        {/* Add buttons */}
        {existingUrls.length + previews.length < 6 && (
          <>
            {/* Camera capture — only on mobile/tablet */}
            {isMobile && (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1 hover:bg-blue-100 active:scale-95 transition-all"
              >
                <Camera className="w-7 h-7 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">Snap</span>
              </button>
            )}

            {/* Gallery upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1 hover:bg-gray-100 active:scale-95 transition-all"
            >
              <ImagePlus className="w-7 h-7 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">Upload</span>
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400">Up to 6 photos • Tap to remove</p>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
