import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { formatDateTime, USER_ROLES } from '../../../lib/utils';

const InviteManager = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState('agent_negocjacje');
  const [existingUid, setExistingUid] = useState('');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'invitations'), (snapshot) => {
      const invitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sortuj: nieużyte najpierw, potem po dacie
      invitesData.sort((a, b) => {
        if (a.used !== b.used) return a.used ? 1 : -1;
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });
      setInvites(invitesData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const token = generateToken();
      await addDoc(collection(db, 'invitations'), {
        token,
        displayName: null,
        role: newRole,
        uid: existingUid.trim() || null, // jeśli podasz uid istniejącego konta, link je przejmie
        used: false,
        usedBy: null,
        usedAt: null,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dni
      });
      setNewRole('agent_negocjacje');
      setExistingUid('');
    } catch (error) {
      console.error('Błąd tworzenia zaproszenia:', error);
      alert('Błąd podczas tworzenia zaproszenia');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Czy na pewno usunąć to zaproszenie?')) return;
    await deleteDoc(doc(db, 'invitations', id));
  };

  const copyLink = (token) => {
    const link = `${window.location.origin}/crm/rejestracja/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const getLink = (token) => {
    return `${window.location.origin}/crm/rejestracja/${token}`;
  };

  const isExpired = (invite) => {
    if (!invite.expiresAt) return false;
    return new Date(invite.expiresAt) < new Date();
  };

  if (loading) {
    return <div className="text-center py-8 text-stone-400">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-stone-900">Zaproszenia do zespołu</h3>
        <p className="text-sm text-stone-500 mt-1">
          Wygeneruj jednorazowy link rejestracyjny dla nowego pracownika
        </p>
      </div>

      {/* Formularz tworzenia */}
      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Rola w systemie
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 bg-white"
            >
              {Object.entries(USER_ROLES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Opcjonalnie: UID istniejącego konta (Firebase Auth)
            </label>
            <input
              type="text"
              value={existingUid}
              onChange={(e) => setExistingUid(e.target.value)}
              placeholder="Np. NBI7t4OsZjW9Gym660bHS1sXZ3c2"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 bg-white text-xs"
            />
            <p className="text-xs text-stone-400 mt-1">
              Jeśli podasz UID, link rejestracyjny pozwoli pracownikowi ustawić email i hasło
              na już utworzone konto (leady zostaną przypisane po tym UID).
            </p>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-stone-400">
              Link będzie ważny przez 7 dni
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-5 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {creating ? 'Generowanie...' : 'Generuj link'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista zaproszeń */}
      {invites.length === 0 ? (
        <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-xl">
          Brak wygenerowanych zaproszeń
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => {
            const expired = isExpired(invite);
            const used = invite.used;

            return (
              <div
                key={invite.id}
                className={`border rounded-xl p-4 ${
                  used 
                    ? 'bg-stone-50 border-stone-200' 
                    : expired 
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-stone-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-900">{invite.displayName || 'Nowy użytkownik'}</p>
                      {invite.role && USER_ROLES[invite.role] && (
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs font-medium rounded-full">
                          {USER_ROLES[invite.role].label}
                        </span>
                      )}
                      {used && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                          Użyty
                        </span>
                      )}
                      {!used && expired && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          Wygasły
                        </span>
                      )}
                      {!used && !expired && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Aktywny
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      Utworzony: {invite.createdAt?.seconds ? formatDateTime(new Date(invite.createdAt.seconds * 1000).toISOString()) : '—'}
                      {used && invite.usedBy && (
                        <span className="ml-2">• Zarejestrowany: {invite.usedBy}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!used && !expired && (
                      <button
                        onClick={() => copyLink(invite.token)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          copied === invite.token
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {copied === invite.token ? 'Skopiowano' : 'Kopiuj link'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(invite.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Usuń"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {!used && !expired && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-xs text-stone-400 mb-1">Link do rejestracji:</p>
                    <code className="block text-xs bg-stone-100 px-3 py-2 rounded-lg text-stone-600 break-all">
                      {getLink(invite.token)}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InviteManager;