import React, { useState, useRef } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { uploadFile } from '../../../lib/storage';

const SignatureManager = ({ signatures = [], onUpdate }) => {
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  const [newSignature, setNewSignature] = useState({
    name: '',
    signatureUrl: '',
    position: { page: 0, x: 100, y: 100, width: 150, height: 50 }
  });

  // Upload obrazka podpisu
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Wybierz plik obrazka (PNG, JPG)');
      return;
    }

    setUploading(true);
    try {
      const path = `signatures/${Date.now()}_${file.name}`;
      const result = await uploadFile(file, path, () => {});
      setNewSignature(prev => ({ ...prev, signatureUrl: result.url }));
    } catch (error) {
      console.error('Błąd uploadu:', error);
      alert('Błąd podczas przesyłania pliku');
    } finally {
      setUploading(false);
    }
  };

  // Dodaj nowy podpis
  const handleAdd = async () => {
    if (!newSignature.name || !newSignature.signatureUrl) {
      alert('Wypełnij nazwę i dodaj obrazek podpisu');
      return;
    }

    const updatedSignatures = [
      ...signatures,
      {
        id: Date.now().toString(),
        ...newSignature
      }
    ];

    await saveSignatures(updatedSignatures);
    setNewSignature({
      name: '',
      signatureUrl: '',
      position: { page: 0, x: 100, y: 100, width: 150, height: 50 }
    });
    setAdding(false);
  };

  // Usuń podpis
  const handleDelete = async (id) => {
    if (!window.confirm('Czy na pewno usunąć ten podpis?')) return;

    const updatedSignatures = signatures.filter(s => s.id !== id);
    await saveSignatures(updatedSignatures);
  };

  // Aktualizuj pozycję podpisu
  const handleUpdatePosition = async (id, position) => {
    const updatedSignatures = signatures.map(s =>
      s.id === id ? { ...s, position: { ...s.position, ...position } } : s
    );
    await saveSignatures(updatedSignatures);
    setEditingId(null);
  };

  // Zapisz do Firestore
  const saveSignatures = async (updatedSignatures) => {
    try {
      await setDoc(doc(db, 'settings', 'signatures'), {
        partners: updatedSignatures
      }, { merge: true });
      onUpdate?.(updatedSignatures);
    } catch (error) {
      console.error('Błąd zapisu:', error);
      alert('Błąd podczas zapisywania');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-900">Podpisy wspólników</h3>
          <p className="text-sm text-stone-500 mt-1">
            Dodaj podpisy do automatycznego wstawiania w dokumenty PDF
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Dodaj podpis
          </button>
        )}
      </div>

      {/* Formularz dodawania */}
      {adding && (
        <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
          <h4 className="font-medium text-stone-900 mb-4">Nowy podpis</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Imię i nazwisko *
              </label>
              <input
                type="text"
                value={newSignature.name}
                onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                placeholder="Jan Kowalski"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Obrazek podpisu *
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2.5 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {uploading ? 'Przesyłanie...' : 'Wybierz plik'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {newSignature.signatureUrl && (
                  <img
                    src={newSignature.signatureUrl}
                    alt="Podgląd"
                    className="h-12 object-contain border border-stone-200 rounded"
                  />
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Zalecany format: PNG z przezroczystym tłem, wymiary ~300x100px
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Strona
                </label>
                <input
                  type="number"
                  min="0"
                  value={newSignature.position.page}
                  onChange={(e) => setNewSignature({
                    ...newSignature,
                    position: { ...newSignature.position, page: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Pozycja X
                </label>
                <input
                  type="number"
                  min="0"
                  value={newSignature.position.x}
                  onChange={(e) => setNewSignature({
                    ...newSignature,
                    position: { ...newSignature.position, x: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Pozycja Y
                </label>
                <input
                  type="number"
                  min="0"
                  value={newSignature.position.y}
                  onChange={(e) => setNewSignature({
                    ...newSignature,
                    position: { ...newSignature.position, y: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Szerokość
                </label>
                <input
                  type="number"
                  min="50"
                  value={newSignature.position.width}
                  onChange={(e) => setNewSignature({
                    ...newSignature,
                    position: { ...newSignature.position, width: parseInt(e.target.value) || 150 }
                  })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setAdding(false);
                  setNewSignature({
                    name: '',
                    signatureUrl: '',
                    position: { page: 0, x: 100, y: 100, width: 150, height: 50 }
                  });
                }}
                className="px-4 py-2 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-100 transition-colors font-medium text-sm"
              >
                Anuluj
              </button>
              <button
                onClick={handleAdd}
                disabled={!newSignature.name || !newSignature.signatureUrl}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Dodaj podpis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista podpisów */}
      {signatures.length === 0 && !adding ? (
        <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-xl">
          Brak zapisanych podpisów
        </div>
      ) : (
        <div className="space-y-3">
          {signatures.map((sig) => (
            <div
              key={sig.id}
              className="bg-white border border-stone-200 rounded-xl p-4"
            >
              {editingId === sig.id ? (
                // Tryb edycji
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {sig.signatureUrl && (
                      <img
                        src={sig.signatureUrl}
                        alt={sig.name}
                        className="h-12 object-contain"
                      />
                    )}
                    <span className="font-medium text-stone-900">{sig.name}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Strona</label>
                      <input
                        type="number"
                        min="0"
                        defaultValue={sig.position?.page || 0}
                        id={`page-${sig.id}`}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">X</label>
                      <input
                        type="number"
                        min="0"
                        defaultValue={sig.position?.x || 100}
                        id={`x-${sig.id}`}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Y</label>
                      <input
                        type="number"
                        min="0"
                        defaultValue={sig.position?.y || 100}
                        id={`y-${sig.id}`}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Szerokość</label>
                      <input
                        type="number"
                        min="50"
                        defaultValue={sig.position?.width || 150}
                        id={`width-${sig.id}`}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors text-sm"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={() => {
                        handleUpdatePosition(sig.id, {
                          page: parseInt(document.getElementById(`page-${sig.id}`).value) || 0,
                          x: parseInt(document.getElementById(`x-${sig.id}`).value) || 100,
                          y: parseInt(document.getElementById(`y-${sig.id}`).value) || 100,
                          width: parseInt(document.getElementById(`width-${sig.id}`).value) || 150
                        });
                      }}
                      className="px-3 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm"
                    >
                      Zapisz
                    </button>
                  </div>
                </div>
              ) : (
                // Tryb podglądu
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {sig.signatureUrl && (
                      <img
                        src={sig.signatureUrl}
                        alt={sig.name}
                        className="h-12 object-contain"
                      />
                    )}
                    <div>
                      <p className="font-medium text-stone-900">{sig.name}</p>
                      <p className="text-xs text-stone-400">
                        Strona {(sig.position?.page || 0) + 1} • X: {sig.position?.x || 0} • Y: {sig.position?.y || 0} • Szer: {sig.position?.width || 150}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(sig.id)}
                      className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Edytuj pozycję"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(sig.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Usuń"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Wskazówka */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Jak ustawić pozycję podpisu?</p>
            <ul className="text-blue-700 space-y-1">
              <li>• <strong>X</strong> - odległość od lewej krawędzi (w punktach, ~72 pkt = 1 cal)</li>
              <li>• <strong>Y</strong> - odległość od dolnej krawędzi strony</li>
              <li>• Typowa strona A4: szerokość ~595, wysokość ~842 punktów</li>
              <li>• Testuj pozycję generując próbny PDF</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureManager;