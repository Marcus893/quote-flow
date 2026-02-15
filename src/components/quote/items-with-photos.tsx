"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Camera, ImageIcon } from "lucide-react";
import ClickablePhotoGrid from "@/components/clickable-photo-grid";

interface ItemWithPhotos {
  description: string;
  price: number;
  photos?: string[];
}

interface ItemsWithPhotosProps {
  items: ItemWithPhotos[];
  allPhotos: string[]; // global photos array (fallback for legacy quotes)
}

export default function ItemsWithPhotos({ items, allPhotos }: ItemsWithPhotosProps) {
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [photosExpanded, setPhotosExpanded] = useState(false);

  // Determine which photos to show based on selected item
  const hasPerItemPhotos = items.some((item) => item.photos && item.photos.length > 0);

  // All available photos (per-item aggregated or global)
  const allAvailablePhotos = hasPerItemPhotos
    ? items.flatMap((item) => item.photos || [])
    : allPhotos;

  let displayPhotos: string[];
  let photoLabel: string;

  if (selectedItemIndex !== null && hasPerItemPhotos) {
    const item = items[selectedItemIndex];
    displayPhotos = item?.photos || [];
    photoLabel = item?.description || `Item ${selectedItemIndex + 1}`;
  } else {
    displayPhotos = allAvailablePhotos;
    photoLabel = "All Photos";
  }

  const COLLAPSED_COUNT = 3;
  const shouldFold = displayPhotos.length > COLLAPSED_COUNT;
  const visiblePhotos = photosExpanded || !shouldFold
    ? displayPhotos
    : displayPhotos.slice(0, COLLAPSED_COUNT);

  // Reset expansion when switching items
  const handleItemClick = (index: number) => {
    if (!hasPerItemPhotos && allAvailablePhotos.length === 0) return; // Nothing to filter
    if (selectedItemIndex === index) {
      setSelectedItemIndex(null);
    } else {
      setSelectedItemIndex(index);
    }
    setPhotosExpanded(false);
  };

  const handleShowAll = () => {
    setSelectedItemIndex(null);
    setPhotosExpanded(false);
  };

  return (
    <>
      {/* Line Items */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {items.map((item, i) => {
          const itemPhotoCount = item.photos?.length || 0;
          const isSelected = selectedItemIndex === i;
          const isClickable = hasPerItemPhotos || allAvailablePhotos.length > 0;

          return (
            <div
              key={i}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={() => isClickable && handleItemClick(i)}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleItemClick(i);
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-all ${
                i !== items.length - 1 ? "border-b border-gray-100" : ""
              } ${
                isSelected
                  ? "bg-blue-50"
                  : isClickable
                  ? "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-medium ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                  {item.description}
                </span>
                {hasPerItemPhotos && itemPhotoCount > 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                    isSelected ? "bg-blue-200 text-blue-800" : "bg-gray-100 text-gray-500"
                  }`}>
                    <Camera className="w-3 h-3" />
                    {itemPhotoCount}
                  </span>
                )}
              </div>
              <span className={`font-semibold whitespace-nowrap ml-4 ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                ${item.price.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Filter indicator */}
      {selectedItemIndex !== null && hasPerItemPhotos && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-blue-600 font-medium">
            Showing photos for: {photoLabel}
          </p>
          <button
            type="button"
            onClick={handleShowAll}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline"
          >
            Show All Photos
          </button>
        </div>
      )}

      {/* Photos Section (foldable) */}
      {allAvailablePhotos.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" />
            {selectedItemIndex !== null && hasPerItemPhotos ? `Photos — ${photoLabel}` : "Job Photos"}
          </h3>

          {displayPhotos.length > 0 ? (
            <>
              <ClickablePhotoGrid photos={visiblePhotos} columns={2} />

              {shouldFold && (
                <button
                  type="button"
                  onClick={() => setPhotosExpanded(!photosExpanded)}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 active:scale-[0.98] transition-all"
                >
                  {photosExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show All {displayPhotos.length} Photos
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 italic py-2">No photos for this item</p>
          )}

          {/* Show All link when filtered to an item with no photos */}
          {selectedItemIndex !== null && displayPhotos.length === 0 && (
            <button
              type="button"
              onClick={handleShowAll}
              className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              Show All Photos
            </button>
          )}
        </div>
      )}
    </>
  );
}
