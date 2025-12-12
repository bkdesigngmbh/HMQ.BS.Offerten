'use client';

import { useCallback, useState } from 'react';
import { Planbeilage } from '@/lib/types';

interface PlanUploadProps {
  value: Planbeilage | null;
  onChange: (planbeilage: Planbeilage | null) => void;
}

export default function PlanUpload({ value, onChange }: PlanUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      alert('Bitte nur PNG oder JPG Dateien hochladen.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onChange({
        dateiname: file.name,
        base64: base64.split(',')[1],
        mimeType: file.type as 'image/png' | 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Planbeilage (Situationsplan)
      </label>

      {value ? (
        <div className="relative border rounded-lg p-4 bg-gray-50">
          <img
            src={`data:${value.mimeType};base64,${value.base64}`}
            alt="Situationsplan Vorschau"
            className="max-h-64 mx-auto rounded"
          />
          <p className="text-sm text-gray-500 text-center mt-2">{value.dateiname}</p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleChange}
            className="hidden"
            id="plan-upload"
          />
          <label htmlFor="plan-upload" className="cursor-pointer">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">
                <span className="text-blue-600 hover:text-blue-700">Datei auswählen</span>
                {' '}oder hierher ziehen
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG oder JPG</p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
