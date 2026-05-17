"use client";

import { useRef, useState } from "react";

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  accept?: string;
}

export default function FileUpload({ onFilesChange, accept }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const updated = [...files, ...arr];
    setFiles(updated);
    onFilesChange(updated);
  };

  const removeFile = (idx: number) => {
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    onFilesChange(updated);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-[var(--radius-lg)] p-6 text-center cursor-pointer transition-all ${
          dragOver ? "border-accent bg-accent-bg" : "border-border-strong hover:border-accent/50 hover:bg-surface"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept || ".pdf,.docx,.txt,.html,.csv,.png,.jpg,.jpeg,.gif,.webp,.pptx,.xlsx"}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <i className="ti ti-upload text-xl text-text-3 mb-2" />
        <p className="text-[13px] text-text-3">참고할 문서를 업로드하세요 (여러 개 가능)</p>
        <p className="text-[11px] text-text-3 mt-1">PDF, DOCX, TXT, HTML, 이미지, PPTX, XLSX (최대 10MB)</p>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-surface rounded-[var(--radius)] px-3 py-2">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <i className="ti ti-file text-accent shrink-0" />
                <span className="text-text font-medium truncate">{f.name}</span>
                <span className="text-text-3 text-xs shrink-0">({(f.size / 1024).toFixed(0)}KB)</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-text-3 hover:text-danger cursor-pointer shrink-0 ml-2"
              >
                <i className="ti ti-x text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
