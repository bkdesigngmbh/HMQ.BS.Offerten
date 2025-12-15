'use client';

import { useCallback, useState } from 'react';
import { Offerte } from '@/lib/types';
import { parseFolderName, parseEmailContent, parseMsgFile } from '@/lib/mail-parser';

interface FolderImportProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
}

export default function FolderImport({ offerte, onChange }: FolderImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<string>('');

  const processFiles = useCallback(async (items: DataTransferItemList | FileList) => {
    setStatus('Verarbeite...');

    let folderName = '';
    let mailContent = '';

    // Verarbeite die Dateien
    const fileList = items instanceof FileList ? items : null;

    if (fileList) {
      // FileList von input[type=file]
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        // Ordnername aus dem Pfad extrahieren
        const pathParts = file.webkitRelativePath?.split('/') || [];
        if (pathParts.length > 0 && !folderName) {
          folderName = pathParts[0];
        }

        // EML-Datei suchen
        if (file.name.endsWith('.eml')) {
          mailContent = await file.text();
        }

        // MSG-Datei suchen
        if (file.name.endsWith('.msg')) {
          const arrayBuffer = await file.arrayBuffer();
          mailContent = await parseMsgFile(arrayBuffer);
        }
      }
    } else {
      // DataTransferItemList von Drag & Drop
      const entries: FileSystemEntry[] = [];
      const itemList = items as DataTransferItemList;

      for (let i = 0; i < itemList.length; i++) {
        const item = itemList[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            entries.push(entry);

            // Ordnername
            if (entry.isDirectory && !folderName) {
              folderName = entry.name;
            }
          }
        }
      }

      // Rekursiv nach EML oder MSG suchen
      for (const entry of entries) {
        if (entry.isDirectory) {
          mailContent = await findMailInDirectory(entry as FileSystemDirectoryEntry);
          if (mailContent) break;
        } else if (entry.name.endsWith('.eml')) {
          mailContent = await readFileEntry(entry as FileSystemFileEntry);
        } else if (entry.name.endsWith('.msg')) {
          const arrayBuffer = await readFileEntryAsArrayBuffer(entry as FileSystemFileEntry);
          mailContent = await parseMsgFile(arrayBuffer);
        }
      }
    }

    // Daten extrahieren
    let updatedOfferte = { ...offerte };
    let changes: string[] = [];

    // 1. Ordnername parsen
    if (folderName) {
      const folderData = parseFolderName(folderName);

      if (folderData.offertnummer) {
        updatedOfferte.offertnummer = folderData.offertnummer;
        changes.push('Offertnummer');
      }
      if (folderData.projektOrt) {
        updatedOfferte.projekt = {
          ...updatedOfferte.projekt,
          ort: folderData.projektOrt,
        };
        changes.push('Projektort');
      }
      if (folderData.projektBezeichnung) {
        updatedOfferte.projekt = {
          ...updatedOfferte.projekt,
          bezeichnung: folderData.projektBezeichnung,
        };
        changes.push('Projektbezeichnung');
      }
    }

    // 2. Mail parsen (NUR für Empfänger-Daten, NICHT für Projekt!)
    if (mailContent) {
      const mailData = parseEmailContent(mailContent);

      // Empfänger aus Mail
      if (mailData.nachname) {
        updatedOfferte.empfaenger = {
          ...updatedOfferte.empfaenger,
          firma: '', // Muss manuell ergänzt werden
          anrede: mailData.anrede,
          vorname: mailData.vorname,
          nachname: mailData.nachname,
          strasse: mailData.strasse,
          plz: mailData.plz,
          ort: mailData.ort,
        };
        changes.push('Empfänger');
      }

      // WICHTIG: Projekt IMMER aus Ordnername, NIEMALS aus Mail!
      // Die Mail enthält nur die ursprüngliche Anfrage,
      // der Ordnername enthält die finale/angepasste Version.
    }

    if (changes.length > 0) {
      onChange(updatedOfferte);
      setStatus(`✓ Importiert: ${changes.join(', ')}`);
    } else {
      setStatus('Keine Daten gefunden');
    }

    setTimeout(() => setStatus(''), 5000);
  }, [offerte, onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.items) {
      processFiles(e.dataTransfer.items);
    }
  }, [processFiles]);

  return (
    <div className="mb-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Projektordner hierhin ziehen</span>
            <br />
            <span className="text-xs text-gray-500">
              Ordnername + Mail (.eml/.msg) werden automatisch ausgelesen
            </span>
          </p>
        </div>
      </div>

      {status && (
        <p className={`mt-2 text-sm ${status.startsWith('✓') ? 'text-green-600' : 'text-gray-500'}`}>
          {status}
        </p>
      )}
    </div>
  );
}

// Hilfsfunktionen für FileSystem API

async function findMailInDirectory(dirEntry: FileSystemDirectoryEntry): Promise<string> {
  return new Promise((resolve) => {
    const reader = dirEntry.createReader();

    reader.readEntries(async (entries) => {
      for (const entry of entries) {
        // EML-Datei
        if (entry.isFile && entry.name.endsWith('.eml')) {
          const content = await readFileEntry(entry as FileSystemFileEntry);
          resolve(content);
          return;
        }

        // MSG-Datei
        if (entry.isFile && entry.name.endsWith('.msg')) {
          const arrayBuffer = await readFileEntryAsArrayBuffer(entry as FileSystemFileEntry);
          const content = await parseMsgFile(arrayBuffer);
          resolve(content);
          return;
        }

        if (entry.isDirectory) {
          // Rekursiv suchen (auch in "99 Offerte Unterlagen")
          const content = await findMailInDirectory(entry as FileSystemDirectoryEntry);
          if (content) {
            resolve(content);
            return;
          }
        }
      }
      resolve('');
    });
  });
}

async function readFileEntry(fileEntry: FileSystemFileEntry): Promise<string> {
  return new Promise((resolve, reject) => {
    fileEntry.file(
      (file) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      },
      (error) => reject(error)
    );
  });
}

async function readFileEntryAsArrayBuffer(fileEntry: FileSystemFileEntry): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    fileEntry.file(
      (file) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      },
      (error) => reject(error)
    );
  });
}
