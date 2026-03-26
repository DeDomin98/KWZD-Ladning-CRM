import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import InviteManager from '../components/InviteManager';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
const Settings = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState({
    maxContactAttempts: 5,
    maxContactDays: 7,
    defaultNextContactDays: 3,
    agents: [],
    sources: ['Meta Ads', 'Google Ads', 'Polecenie', 'Strona WWW', 'Telefon', 'Inne'],
    notifications: {
      overduePayments: true,
      upcomingPayments: true,
      newLeads: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [signatures, setSignatures] = useState([]);

  // Nowe wartości do dodania
  const [newAgent, setNewAgent] = useState('');
  const [newSource, setNewSource] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Pobierz ustawienia główne
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      if (settingsDoc.exists()) {
        setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
      }

   
    } catch (error) {
      console.error('Błąd pobierania ustawień:', error);
    } finally {
      const signaturesDoc = await getDoc(doc(db, 'settings', 'signatures'));
      if (signaturesDoc.exists()) {
        setSignatures(signaturesDoc.data().list || []);
      }
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Błąd zapisu:', error);
      alert('Błąd podczas zapisywania ustawień');
    } finally {
      setSaving(false);
    }
  };

  const addAgent = () => {
    if (!newAgent.trim()) return;
    if (settings.agents.includes(newAgent.trim())) {
      alert('Ten agent już istnieje');
      return;
    }
    setSettings(prev => ({
      ...prev,
      agents: [...prev.agents, newAgent.trim()]
    }));
    setNewAgent('');
  };

  const removeAgent = (agent) => {
    setSettings(prev => ({
      ...prev,
      agents: prev.agents.filter(a => a !== agent)
    }));
  };

  const addSource = () => {
    if (!newSource.trim()) return;
    if (settings.sources.includes(newSource.trim())) {
      alert('To źródło już istnieje');
      return;
    }
    setSettings(prev => ({
      ...prev,
      sources: [...prev.sources, newSource.trim()]
    }));
    setNewSource('');
  };

  const removeSource = (source) => {
    setSettings(prev => ({
      ...prev,
      sources: prev.sources.filter(s => s !== source)
    }));
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">Ta sekcja jest dostępna tylko dla administratora.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Ogólne' },
    { id: 'team', label: 'Zespół' },
    { id: 'invites', label: 'Zaproszenia' },
    { id: 'sources', label: 'Źródła' },
    { id: 'signatures', label: 'Podpisy' },
    { id: 'notifications', label: 'Powiadomienia' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-stone-900">Ustawienia</h1>
        <p className="text-stone-500 mt-1 text-sm">Konfiguracja systemu CRM</p>
      </div>

      {/* Taby */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 md:p-6">

        {/* Tab: Ogólne */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-stone-900 mb-4">Reguły spalania leadów</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Maksymalna liczba prób kontaktu
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.maxContactAttempts}
                    onChange={(e) => setSettings({ ...settings, maxContactAttempts: parseInt(e.target.value) || 5 })}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    Po tylu nieudanych próbach lead zostanie spalony
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Maksymalna liczba dni
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.maxContactDays}
                    onChange={(e) => setSettings({ ...settings, maxContactDays: parseInt(e.target.value) || 7 })}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    W ciągu tylu dni muszą być wykonane próby
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-stone-200 pt-6">
              <h3 className="font-semibold text-stone-900 mb-4">Domyślne ustawienia</h3>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Domyślny czas do następnego kontaktu (dni)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={settings.defaultNextContactDays}
                  onChange={(e) => setSettings({ ...settings, defaultNextContactDays: parseInt(e.target.value) || 3 })}
                  className="w-full max-w-xs px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Zespół */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-stone-900 mb-4">Agenci / Pracownicy</h3>
              <p className="text-sm text-stone-500 mb-4">
                Lista osób, które mogą być przypisane do leadów. Nowi użytkownicy są dodawani automatycznie po pierwszym logowaniu.
              </p>

              {/* Dodaj agenta */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newAgent}
                  onChange={(e) => setNewAgent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAgent()}
                  className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                  placeholder="Imię i nazwisko"
                />
                <button
                  onClick={addAgent}
                  className="px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
                >
                  Dodaj
                </button>
              </div>

              {/* Lista agentów */}
              {settings.agents.length === 0 ? (
                <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-lg">
                  Brak agentów. Dodaj pierwszego powyżej.
                </div>
              ) : (
                <div className="space-y-2">
                  {settings.agents.map((agent, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-3 bg-stone-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 text-sm font-medium">
                          {agent.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-stone-900">{agent}</span>
                      </div>
                      <button
                        onClick={() => removeAgent(agent)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Źródła */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-stone-900 mb-4">Źródła leadów</h3>
              <p className="text-sm text-stone-500 mb-4">
                Skąd pochodzą leady (do wyboru przy dodawaniu)
              </p>

              {/* Dodaj źródło */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSource()}
                  className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                  placeholder="Nazwa źródła"
                />
                <button
                  onClick={addSource}
                  className="px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
                >
                  Dodaj
                </button>
              </div>

              {/* Lista źródeł */}
              <div className="flex flex-wrap gap-2">
                {settings.sources.map((source, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-lg"
                  >
                    <span className="text-stone-700 text-sm">{source}</span>
                    <button
                      onClick={() => removeSource(source)}
                      className="p-0.5 text-stone-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

{activeTab === 'signatures' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-stone-900 mb-1">Podpisy na umowach</h3>
              <p className="text-sm text-stone-500">
                Wgraj podpisy osób reprezentujących firmę. Będą automatycznie wstawiane do generowanych umów.
              </p>
            </div>

            {/* Lista podpisów */}
            <div className="space-y-4">
              {signatures.map((sig, index) => (
                <div key={sig.id} className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-stone-900">{sig.name}</p>
                      <p className="text-sm text-stone-500">{sig.role}</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Czy na pewno usunąć ten podpis?')) return;
                        try {
                          // Usuń z Storage
                          if (sig.path) {
                            const fileRef = ref(storage, sig.path);
                            await deleteObject(fileRef).catch(() => {});
                          }
                          // Usuń z listy
                          const newSignatures = signatures.filter(s => s.id !== sig.id);
                          await setDoc(doc(db, 'settings', 'signatures'), { list: newSignatures });
                          setSignatures(newSignatures);
                        } catch (error) {
                          console.error('Błąd usuwania podpisu:', error);
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {sig.url && (
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <img src={sig.url} alt={sig.name} className="max-h-20 object-contain" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Dodaj nowy podpis */}
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h4 className="font-medium text-stone-900 mb-4">Dodaj nowy podpis</h4>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target;
                  const name = form.sigName.value.trim();
                  const role = form.sigRole.value.trim();
                  const file = form.sigFile.files[0];

                  if (!name || !file) {
                    alert('Podaj imię i nazwisko oraz wybierz plik');
                    return;
                  }

                  try {
                    // Upload do Storage
                    const path = `signatures/${Date.now()}_${file.name}`;
                    const fileRef = ref(storage, path);
                    await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(fileRef);

                    // Zapisz w Firestore
                    const newSignature = {
                      id: Date.now().toString(),
                      name,
                      role,
                      url,
                      path,
                      createdAt: new Date().toISOString()
                    };
                    const newSignatures = [...signatures, newSignature];
                    await setDoc(doc(db, 'settings', 'signatures'), { list: newSignatures });
                    setSignatures(newSignatures);

                    // Reset formularza
                    form.reset();
                  } catch (error) {
                    console.error('Błąd dodawania podpisu:', error);
                    alert('Wystąpił błąd podczas dodawania podpisu');
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Imię i nazwisko *
                    </label>
                    <input
                      type="text"
                      name="sigName"
                      required
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                      placeholder="Jan Nowak"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Stanowisko
                    </label>
                    <input
                      type="text"
                      name="sigRole"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                      placeholder="Prezes Zarządu"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Plik podpisu (PNG z przezroczystym tłem) *
                  </label>
                  <input
                    type="file"
                    name="sigFile"
                    accept="image/png,image/jpeg"
                    required
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white"
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    Zalecany format: PNG z przezroczystym tłem, rozmiar ok. 300x100px
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
                >
                  Dodaj podpis
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Powiadomienia */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-stone-900 mb-4">Powiadomienia</h3>
              <p className="text-sm text-stone-500 mb-4">
                Włącz lub wyłącz powiadomienia systemowe
              </p>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-stone-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-stone-900">Zaległe płatności</p>
                    <p className="text-sm text-stone-500">Powiadomienia o przeterminowanych płatnościach</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.overduePayments}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, overduePayments: e.target.checked }
                    })}
                    className="w-5 h-5 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-stone-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-stone-900">Nadchodzące płatności</p>
                    <p className="text-sm text-stone-500">Przypomnienia o zbliżających się terminach</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.upcomingPayments}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, upcomingPayments: e.target.checked }
                    })}
                    className="w-5 h-5 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-stone-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-stone-900">Nowe leady</p>
                    <p className="text-sm text-stone-500">Powiadomienia o nowych leadach w systemie</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.newLeads}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, newLeads: e.target.checked }
                    })}
                    className="w-5 h-5 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Przycisk zapisu */}
      {activeTab !== 'signatures' && (
        <div className="mt-6 flex items-center justify-between">
          <div>
            {saved && (
              <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Zapisano
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
          </button>
        </div>
      )}

      {activeTab === 'invites' && (
        <InviteManager />
      )}
    </div>
  );
};

export default Settings;