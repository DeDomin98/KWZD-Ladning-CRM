import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";


// Upload pliku z progress
export const uploadFile = (file, path, onProgress) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: path,
            name: file.name,
            size: file.size,
            type: file.type
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

// Usuń plik
export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error("Błąd usuwania pliku:", error);
    return false;
  }
};

// Generuj ścieżkę dla pliku klienta
export const getClientFilePath = (clientId, fileName) => {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `clients/${clientId}/documents/${timestamp}_${safeName}`;
};

// Dozwolone typy plików
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Max rozmiar (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Walidacja pliku
export const validateFile = (file) => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Niedozwolony typ pliku. Dozwolone: PDF, JPG, PNG, DOC, DOCX' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Plik jest za duży. Maksymalny rozmiar to 10MB' };
  }
  return { valid: true };
};

// Formatowanie rozmiaru pliku
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Ikona dla typu pliku
export const getFileIcon = (type) => {
  if (type === 'application/pdf') return 'PDF';
  if (type.startsWith('image/')) return 'IMG';
  if (type.includes('word')) return 'DOC';
  return 'FILE';
};