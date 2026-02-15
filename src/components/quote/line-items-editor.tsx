"use client";

import { Plus, Trash2, Camera, ImagePlus, X, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";

export interface LineItem {
  id: string;
  description: string;
  price: string;
  photos: File[];
  previews: string[];
  existingPhotoUrls: string[];
}

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  maxPhotosPerItem?: number;
}

export default function LineItemsEditor({
  items,
  onChange,
  maxPhotosPerItem = 6,
}: LineItemsEditorProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const checkMobile = () => {
      const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isNarrow = window.matchMedia("(max-width: 1024px)").matches;
      setIsMobile(hasTouchScreen && isNarrow);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const addItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: "",
      price: "",
      photos: [],
      previews: [],
      existingPhotoUrls: [],
    };
    onChange([...items, newItem]);
    setExpandedItemId(newItem.id);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
    if (expandedItemId === id) setExpandedItemId(null);
  };

  const updateItem = (id: string, field: "description" | "price", value: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handlePhotoAdd = (itemId: string, files: File[]) => {
    onChange(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const totalPhotos = item.existingPhotoUrls.length + item.photos.length;
        const remaining = maxPhotosPerItem - totalPhotos;
        const toAdd = files.slice(0, remaining);
        // Use synchronous URL.createObjectURL to avoid stale closure issues
        const newPreviews = toAdd.map((file) => URL.createObjectURL(file));
        return {
          ...item,
          photos: [...item.photos, ...toAdd],
          previews: [...item.previews, ...newPreviews],
        };
      })
    );
  };

  const handlePhotoRemove = (itemId: string, photoIndex: number) => {
    onChange(
      items.map((item) => {
        if (item.id !== itemId) return item;
        // Revoke the object URL to free memory
        if (item.previews[photoIndex]) {
          URL.revokeObjectURL(item.previews[photoIndex]);
        }
        return {
          ...item,
          photos: item.photos.filter((_, i) => i !== photoIndex),
          previews: item.previews.filter((_, i) => i !== photoIndex),
        };
      })
    );
  };

  const handleExistingPhotoRemove = (itemId: string, photoIndex: number) => {
    onChange(
      items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          existingPhotoUrls: item.existingPhotoUrls.filter((_, i) => i !== photoIndex),
        };
      })
    );
  };

  const handleFileInput = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handlePhotoAdd(itemId, files);
    e.target.value = "";
  };

  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    return sum + price;
  }, 0);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-3">
        Line Items
      </label>

      <div className="space-y-3">
        {items.map((item, index) => {
          const photoCount = item.existingPhotoUrls.length + item.previews.length;
          const isExpanded = expandedItemId === item.id;

          return (
            <div
              key={item.id}
              className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden"
            >
              <div className="flex gap-2 items-start p-3">
                {/* Row number */}
                <span className="mt-3 text-xs font-bold text-gray-400 w-5 shrink-0">
                  {index + 1}.
                </span>

                {/* Description + Price */}
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    placeholder="What's the work? e.g. Replace faucet"
                    className="w-full px-3 py-3 bg-white border border-gray-200 rounded-lg text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                          updateItem(item.id, "price", val);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-3 bg-white border border-gray-200 rounded-lg text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Photo toggle button */}
                  <button
                    type="button"
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      isExpanded
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : photoCount > 0
                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                        : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {photoCount > 0 ? `${photoCount} Photo${photoCount > 1 ? "s" : ""}` : "Add Photos"}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="mt-3 w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg active:scale-90 transition-all shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Expandable Photo Section */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {/* Existing photos */}
                    {item.existingPhotoUrls.map((url, i) => (
                      <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <Image src={url} alt={`Photo ${i + 1}`} fill sizes="100px" className="object-cover" />
                        <button
                          type="button"
                          onClick={() => handleExistingPhotoRemove(item.id, i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}

                    {/* New photo previews */}
                    {item.previews.map((src, i) => (
                      <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <Image src={src} alt={`New photo ${i + 1}`} fill sizes="100px" className="object-cover" />
                        <button
                          type="button"
                          onClick={() => handlePhotoRemove(item.id, i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}

                    {/* Upload buttons */}
                    {photoCount < maxPhotosPerItem && (
                      <>
                        {isMobile && (
                          <button
                            type="button"
                            onClick={() => cameraInputRefs.current[item.id]?.click()}
                            className="aspect-square rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-0.5 hover:bg-blue-100 active:scale-95 transition-all"
                          >
                            <Camera className="w-5 h-5 text-blue-600" />
                            <span className="text-[10px] font-medium text-blue-600">Snap</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[item.id]?.click()}
                          className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center gap-0.5 hover:bg-gray-100 active:scale-95 transition-all"
                        >
                          <ImagePlus className="w-5 h-5 text-gray-500" />
                          <span className="text-[10px] font-medium text-gray-500">Upload</span>
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">Up to {maxPhotosPerItem} photos per item</p>

                  {/* Hidden inputs */}
                  <input
                    ref={(el) => { cameraInputRefs.current[item.id] = el; }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileInput(item.id, e)}
                    className="hidden"
                  />
                  <input
                    ref={(el) => { fileInputRefs.current[item.id] = el; }}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileInput(item.id, e)}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add item button */}
      <button
        type="button"
        onClick={addItem}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 active:scale-[0.98] transition-all"
      >
        <Plus className="w-5 h-5" />
        Add Line Item
      </button>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between bg-gray-900 text-white rounded-xl px-5 py-4">
        <span className="text-base font-medium">Total</span>
        <span className="text-2xl font-bold">
          ${total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
