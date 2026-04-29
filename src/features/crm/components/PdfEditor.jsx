import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { uploadFile, getClientFilePath } from '../../../lib/storage';
import {
  loadPdf,
  addMultipleSignatures,
  savePdfAsBlob,
  downloadPdf,
  fileToArrayBuffer
} from '../../../lib/pdfEditor';

const PdfEditor = ({ clientId, clientData, onSave, onClose, initialUrl }) => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        const signaturesDoc = await getDoc(doc(db, 'settings', 'signatures'));
        if (signaturesDoc.exists()) {
          const sigs = (signaturesDoc.data().partners || []).map(s => ({ ...s, selected: true }));
          setSignatures(sigs);
        }
      } catch (error) {
        console.error('Błąd pobierania podpisów:', error);
      }
    };
    fetchSignatures();
  }, []);

  useEffect(() => {
    const loadInitialPdf = async () => {
      if (initialUrl) {
        setLoading(true);
        try {
          const response = await fetch(initialUrl);
          if (!response.ok) throw new Error("Błąd pobierania pliku");
          const blob = await response.blob();
          
          const file = new File([blob], "dokument.pdf", { type: "application/pdf" });
          
          setPdfFile(file);
          setPdfUrl(URL.createObjectURL(file));
        } catch (error) {
          console.error("Błąd wczytywania PDF:", error);
          alert("Nie udało się wczytać wybranego pliku.");
        } finally {
            setLoading(false);
        }
      }
    };

    loadInitialPdf();
  }, [initialUrl]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Wybierz plik PDF');
      return;
    }

    setPdfFile(file);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
  };

  const toggleSignature = (id) => {
    setSignatures(prev => prev.map(s =>
      s.id === id ? { ...s, selected: !s.selected } : s
    ));
  };

  const handleSign = async (download = false) => {
    if (!pdfFile) {
      alert('Najpierw wybierz plik PDF');
      return;
    }

    const selectedSignatures = signatures.filter(s => s.selected);
    if (selectedSignatures.length === 0) {
      alert('Wybierz przynajmniej jeden podpis');
      return;
    }

    setLoading(true);
    try {
      const pdfBytes = await fileToArrayBuffer(pdfFile);
      let pdfDoc = await loadPdf(pdfBytes);

      const signaturesData = selectedSignatures.map(s => ({
        imageUrl: `${s.signatureUrl}${s.signatureUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`,
        page: s.position?.page || 0,
        x: s.position?.x || 100,
        y: s.position?.y || 100,
        width: s.position?.width || 150,
        height: s.position?.height || 50
      }));

      pdfDoc = await addMultipleSignatures(pdfDoc, signaturesData);

      const filename = `podpisany_${pdfFile.name}`;

      if (download) {
        await downloadPdf(pdfDoc, filename);
      } else {
        setSaving(true);
        const blob = await savePdfAsBlob(pdfDoc);
        const file = new File([blob], filename, { type: 'application/pdf' });
        const path = getClientFilePath(clientId, filename);

        const downloadUrl = await uploadFile(file, path, () => {});
        
        // 2. Zwracamy komplet danych do rodzica (ClientDetails)
        onSave?.({
          name: filename,
          url: downloadUrl,
          path: path
        });
      }
    } catch (error) {
      console.error('Błąd podpisywania PDF:', error);
      alert('Wystąpił błąd podczas podpisywania PDF: ' + error.message);
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>

      <div className="relative min-h-full flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Podpisz dokument PDF</h2>
              <p className="text-sm text-stone-500">Dodaj podpisy wspólników do dokumentu</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6">

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                1. Wybierz dokument PDF
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  pdfFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50'
                }`}
              >
                {pdfFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-left">
                      <p className="font-medium text-stone-900">{pdfFile.name}</p>
                      <p className="text-sm text-stone-500">Kliknij aby zmienić</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 text-stone-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-stone-600 font-medium">Kliknij aby wybrać plik PDF</p>
                    <p className="text-sm text-stone-400">lub przeciągnij i upuść</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {pdfUrl && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Podgląd dokumentu
                </label>
                <iframe
                  src={pdfUrl}
                  className="w-full h-64 border border-stone-200 rounded-lg"
                  title="Podgląd PDF"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                2. Wybierz podpisy do dodania
              </label>

              {signatures.length === 0 ? (
                <div className="text-center py-6 bg-stone-50 rounded-xl text-stone-400">
                  <p>Brak zapisanych podpisów</p>
                  <p className="text-sm mt-1">Dodaj podpisy w Ustawieniach → Podpisy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {signatures.map((sig) => (
                    <div
                      key={sig.id}
                      onClick={() => toggleSignature(sig.id)}
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        sig.selected
                          ? 'border-stone-900 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        sig.selected ? 'border-stone-900 bg-stone-900' : 'border-stone-300'
                      }`}>
                        {sig.selected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {sig.signatureUrl && (
                        <img
                          src={sig.signatureUrl}
                          alt={sig.name}
                          className="h-10 object-contain"
                        />
                      )}

                      <div className="flex-1">
                        <p className="font-medium text-stone-900">{sig.name}</p>
                        <p className="text-xs text-stone-400">
                          Strona {(sig.position?.page || 0) + 1}, pozycja: {sig.position?.x || 0}, {sig.position?.y || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-stone-200 flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium order-2 sm:order-1"
            >
              Anuluj
            </button>

            <div className="flex gap-3 flex-1 order-1 sm:order-2 sm:justify-end">
              <button
                onClick={() => handleSign(true)}
                disabled={loading || !pdfFile || signatures.filter(s => s.selected).length === 0}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && !saving ? 'Podpisywanie...' : 'Pobierz podpisany'}
              </button>
              <button
                onClick={() => handleSign(false)}
                disabled={loading || saving || !pdfFile || signatures.filter(s => s.selected).length === 0}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Zapisywanie...' : 'Podpisz i zapisz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfEditor;