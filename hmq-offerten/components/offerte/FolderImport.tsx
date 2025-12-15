'use client';

import { useState, useCallback, DragEvent } from 'react';
import { Offerte } from '@/lib/types';
import { parseFolderName, parseEmailContent, parseStandort } from '@/lib/mail-parser';

interface FolderImportProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
}

interface FileEntry {
  name: string;
  content: string;
}

export default function FolderImport({ offerte, onChange }: FolderImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const processEntry = async (entry: FileSystemEntry): Promise<FileEntry[]> => {
    const files: FileEntry[] = [];

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });

      // Nur .eml Dateien lesen
      if (file.name.toLowerCase().endsWith('.eml')) {
        const content = await readFileAsText(file);
        files.push({ name: file.name, content });
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();

      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });

      for (const subEntry of entries) {
        const subFiles = await processEntry(subEntry);
        files.push(...subFiles);
      }
    }

    return files;
  };

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setStatus('processing');
    setMessage('Verarbeite Ordner...');

    try {
      const items = e.dataTransfer.items;
      if (!items || items.length === 0) {
        throw new Error('Keine Dateien gefunden');
      }

      let folderName = '';
      const allFiles: FileEntry[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry?.();

        if (entry) {
          if (entry.isDirectory && !folderName) {
            folderName = entry.name;
          }
          const files = await processEntry(entry);
          allFiles.push(...files);
        }
      }

      if (!folderName) {
        // Fallback: Dateinamen verwenden
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const path = (files[0] as any).webkitRelativePath || files[0].name;
          folderName = path.split('/')[0];
        }
      }

      // Ordnername parsen
      const folderData = parseFolderName(folderName);

      // E-Mail parsen falls vorhanden
      let emailData = null;
      const emlFile = allFiles.find(f => f.name.toLowerCase().endsWith('.eml'));
      if (emlFile) {
        emailData = parseEmailContent(emlFile.content);
      }

      // Standort bestimmen
      const standortId = parseStandort(emailData?.plz || '');

      // Offerte aktualisieren
      const newOfferte = { ...offerte };

      // Aus Ordnername
      if (folderData.offertnummer) {
        newOfferte.offertnummer = folderData.offertnummer;
      }
      if (folderData.projektOrt) {
        newOfferte.projekt = { ...newOfferte.projekt, ort: folderData.projektOrt };
      }
      if (folderData.projektBezeichnung) {
        newOfferte.projekt = { ...newOfferte.projekt, bezeichnung: folderData.projektBezeichnung };
      }

      // Aus E-Mail
      if (emailData) {
        if (emailData.firma) {
          newOfferte.empfaenger = { ...newOfferte.empfaenger, firma: emailData.firma };
        }
        if (emailData.vorname || emailData.nachname) {
          newOfferte.empfaenger = {
            ...newOfferte.empfaenger,
            anrede: 'Herr', // Default, kann manuell geändert werden
            vorname: emailData.vorname,
            nachname: emailData.nachname,
          };
        }
        if (emailData.funktion) {
          newOfferte.empfaenger = { ...newOfferte.empfaenger, funktion: emailData.funktion };
        }
        if (emailData.strasse) {
          newOfferte.empfaenger = { ...newOfferte.empfaenger, strasse: emailData.strasse };
        }
        if (emailData.plz) {
          newOfferte.empfaenger = { ...newOfferte.empfaenger, plz: emailData.plz };
        }
        if (emailData.ort) {
          newOfferte.empfaenger = { ...newOfferte.empfaenger, ort: emailData.ort };
        }
      }

      // Standort setzen
      newOfferte.standortId = standortId;

      onChange(newOfferte);

      // Erfolgsmeldung
      const imported: string[] = [];
      if (folderData.offertnummer) imported.push('Offertnummer');
      if (folderData.projektOrt) imported.push('Projektort');
      if (folderData.projektBezeichnung) imported.push('Projektbezeichnung');
      if (emailData?.firma) imported.push('Firma');
      if (emailData?.vorname || emailData?.nachname) imported.push('Kontaktperson');
      if (emailData?.strasse) imported.push('Strasse');
      if (emailData?.plz || emailData?.ort) imported.push('PLZ/Ort');

      if (imported.length > 0) {
        setStatus('success');
        setMessage(`Importiert: ${imported.join(', ')}`);
      } else {
        setStatus('idle');
        setMessage('Keine Daten gefunden');
      }

      // Nach 5 Sekunden ausblenden
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);

    } catch (error) {
      console.error('Import-Fehler:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unbekannter Fehler');

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    }
  }, [offerte, onChange]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
        ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : status === 'success'
            ? 'border-green-400 bg-green-50'
            : status === 'error'
              ? 'border-red-400 bg-red-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }
      `}
    >
      {status === 'processing' ? (
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{message}</span>
        </div>
      ) : status === 'success' ? (
        <div className="flex items-center justify-center gap-2 text-green-700">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{message}</span>
        </div>
      ) : status === 'error' ? (
        <div className="flex items-center justify-center gap-2 text-red-700">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{message}</span>
        </div>
      ) : (
        <div className="text-gray-500">
          <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm font-medium">Projektordner hierher ziehen</p>
          <p className="text-xs text-gray-400 mt-1">
            Format: &quot;51.25.405 Zürich, Projektbezeichnung&quot;
          </p>
        </div>
      )}
    </div>
  );
}
