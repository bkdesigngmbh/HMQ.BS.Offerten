"use client";

import { useRef, ChangeEvent } from "react";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { Planbeilage } from "@/lib/types";

interface PlanUploadProps {
  planbeilage: Planbeilage | null;
  onUpload: (planbeilage: Planbeilage) => void;
  onRemove: () => void;
}

export default function PlanUpload({ planbeilage, onUpload, onRemove }: PlanUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validierung: Nur PNG und JPEG
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      alert("Bitte nur PNG oder JPEG Dateien hochladen.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Die Datei ist zu gross (max. 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpload({
        dateiname: file.name,
        base64,
        mimeType: file.type as "image/png" | "image/jpeg",
      });
    };
    reader.readAsDataURL(file);

    // Input zurücksetzen
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileChange}
        className="hidden"
        id="plan-upload"
      />

      {planbeilage ? (
        <div className="space-y-4">
          <div className="relative inline-block">
            <Image
              src={planbeilage.base64}
              alt={planbeilage.dateiname}
              width={400}
              height={300}
              className="max-w-md rounded border shadow-sm"
            />
            <p className="text-sm text-gray-500 mt-1">{planbeilage.dateiname}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Bild ändern
            </Button>
            <Button variant="danger" size="sm" onClick={onRemove}>
              Entfernen
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <div className="text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm">Klicken Sie hier, um einen Plan hochzuladen</p>
            <p className="mt-1 text-xs text-gray-400">PNG, JPG bis 5MB</p>
          </div>
        </div>
      )}
    </div>
  );
}
