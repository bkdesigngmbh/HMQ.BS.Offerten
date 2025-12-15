// FileSystem API Type Definitions for drag & drop folder handling

interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
}

interface FileSystemFileEntry extends FileSystemEntry {
  isFile: true;
  isDirectory: false;
  file(successCallback: (file: File) => void, errorCallback?: (error: DOMException) => void): void;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
  isFile: false;
  isDirectory: true;
  createReader(): FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
  readEntries(
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: DOMException) => void
  ): void;
}

interface DataTransferItem {
  webkitGetAsEntry(): FileSystemEntry | null;
}
