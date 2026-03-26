import React, { useState, useRef } from 'react';
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { uploadFile, getClientFilePath, validateFile, formatFileSize, getFileIcon } from "../../../lib/storage";

const FileUploader = ({ clientId, onUpload, currentUser }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const user = currentUser || "Jan Kowalski";

  const handleFileSelect = async (file) => {
    if (!file) return;

    setError(null);

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const path = getClientFilePath(clientId, file.name);
      const result = await uploadFile(file, path, setProgress);

      const fileDoc = {
        id: Date.now().toString(),
        name: file.name,
        url: result.url,
        path: result.path,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user
      };

      await updateDoc(doc(db, "leads", clientId), {
        documents: arrayUnion(fileDoc)
      });

      onUpload?.(fileDoc);
    } catch (err) {
      console.error("Upload error:", err);
      setError('Błąd podczas przesyłania pliku. Spróbuj ponownie.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${dragOver
            ? 'border-stone-900 bg-stone-100'
            : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleInputChange}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          className="hidden"
        />

        {uploading ? (
          <div>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-stone-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-sm text-stone-600 mb-2">Przesyłanie...</p>
            <div className="w-full max-w-xs mx-auto h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-900 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-stone-500 mt-2">{Math.round(progress)}%</p>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-sm text-stone-600 mb-1">
              <span className="font-medium text-stone-900">Kliknij</span> lub przeciągnij plik
            </p>
            <p className="text-xs text-stone-400">
              PDF, JPG, PNG, DOC, DOCX • max 10MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

// Komponent listy plików z podglądem
export const FileList = ({ files = [], onDelete, canDelete = true }) => {
  const [preview, setPreview] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (file) => {
    if (!window.confirm(`Czy na pewno usunąć plik "${file.name}"?`)) return;

    setDeleting(file.id);
    await onDelete?.(file);
    setDeleting(null);
  };

  const openPreview = (file) => {
    setPreview(file);
  };

  const closePreview = () => {
    setPreview(null);
  };

  const isImage = (type) => type?.startsWith('image/');
  const isPdf = (type) => type === 'application/pdf';
  const canPreview = (type) => isImage(type) || isPdf(type);

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400">
        Brak dokumentów
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 transition-colors"
          >
            {/* Podgląd miniaturki */}
            <div
              onClick={() => canPreview(file.type) && openPreview(file)}
              className={`relative h-32 bg-stone-100 flex items-center justify-center ${
                canPreview(file.type) ? 'cursor-pointer hover:bg-stone-200' : ''
              }`}
            >
              {isImage(file.type) ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : isPdf(file.type) ? (
                <div className="text-center">
                  <svg className="w-12 h-12 text-red-500 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h2v5h-2v-5zm-3 2h2v3H7v-3zm6 0h2v3h-2v-3z"/>
                  </svg>
                  <p className="text-xs text-stone-500 mt-1">Kliknij aby podejrzeć</p>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-4xl">{getFileIcon(file.type)}</span>
                </div>
              )}

              {/* Overlay z ikoną podglądu */}
              {canPreview(file.type) && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="bg-white rounded-full p-2 shadow-lg">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Info o pliku */}
            <div className="p-3">
              <p className="text-sm font-medium text-stone-900 truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString('pl-PL')}
              </p>

              {/* Akcje */}
              <div className="flex items-center gap-2 mt-3">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-medium rounded-lg hover:bg-stone-200 transition-colors"
                >
                  Pobierz
                </a>

                {canDelete && (
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deleting === file.id}
                    className="px-3 py-1.5 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deleting === file.id ? '...' : 'Usuń'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal podglądu */}
      {preview && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/80" onClick={closePreview}></div>

          <div className="relative h-full flex items-center justify-center p-4">
            {/* Przycisk zamknięcia */}
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Nazwa pliku */}
            <div className="absolute top-4 left-4 z-10">
              <p className="text-white font-medium">{preview.name}</p>
              <p className="text-white/60 text-sm">{formatFileSize(preview.size)}</p>
            </div>

            {/* Przycisk pobierania */}
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 z-10 px-4 py-2 bg-white text-stone-900 rounded-lg font-medium hover:bg-stone-100 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Pobierz
            </a>

            {/* Zawartość podglądu */}
            <div className="w-full max-w-5xl max-h-[85vh]">
              {isImage(preview.type) ? (
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="max-w-full max-h-[85vh] mx-auto object-contain rounded-lg"
                />
              ) : isPdf(preview.type) ? (
                <iframe
                  src={preview.url}
                  className="w-full h-[85vh] bg-white rounded-lg"
                  title={preview.name}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileUploader;