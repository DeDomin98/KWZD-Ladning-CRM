import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase.js";
import { formatPLN, formatDate, formatDateTime, timeAgo, daysSince, addDays, LEAD_STATUSES, SERVICE_TYPES, CONTACT_RESULTS } from "../../../lib/utils";
import { useAuth } from "../../../hooks/useAuth";

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const department = location.pathname.split('/')[2];
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const { displayName: currentUser, userData, isRestricted } = useAuth();
  const [agents, setAgents] = useState([]);
  
  // Pobierz listę agentów
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const agentsData = snapshot.docs.map(doc => doc.data().displayName).filter(Boolean);
      setAgents(agentsData);
    });
    return () => unsubscribe();
  }, []);

  // Formularz kontaktu
  const [contactForm, setContactForm] = useState({
    result: 'nie_odebral',
    notes: '',
    nextContactDays: 1,
    smsSent: false,
    emailSent: false
  });

  // Formularz usługi
  const [serviceForm, setServiceForm] = useState({
    type: 'upadlosc',
    price: 4000,
    debtAmount: '',
    creditorCount: 1
  });

  const fetchLead = async () => {
    const docSnap = await getDoc(doc(db, "leads", id));
    if (docSnap.exists()) {
      setLead({ id: docSnap.id, ...docSnap.data() });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  // Zmiana statusu
  const handleStatusChange = async (newStatus) => {
    await updateDoc(doc(db, "leads", id), { status: newStatus });
    fetchLead();
  };

  // Rejestracja kontaktu
  const handleLogContact = async (e) => {
    e.preventDefault();

    const contactEntry = {
      date: new Date().toISOString(),
      author: currentUser,
      result: contactForm.result,
      notes: contactForm.notes,
      smsSent: contactForm.smsSent,
      emailSent: contactForm.emailSent,
      minutesFromCreation: lead.createdAt 
        ? Math.round((Date.now() - lead.createdAt.seconds * 1000) / 60000)
        : null
    };

    const nextContactDate = addDays(new Date(), parseInt(contactForm.nextContactDays));
    const newAttempts = (lead.contactAttempts || 0) + 1;

    // Wyłączone automatyczne spalanie leada po X próbach
    const shouldBurn = false;

    await updateDoc(doc(db, "leads", id), {
      contactHistory: arrayUnion(contactEntry),
      contactAttempts: newAttempts,
      lastContactDate: new Date().toISOString(),
      lastContactResult: contactForm.result,
      nextContactDate: shouldBurn ? null : nextContactDate.toISOString(),
      status: shouldBurn ? 'spalony' : (lead.status === 'nowy' ? 'do_kontaktu' : lead.status),
      ...(contactForm.smsSent && { smsCount: (lead.smsCount || 0) + 1 }),
      ...(contactForm.emailSent && { emailCount: (lead.emailCount || 0) + 1 })
    });

    setShowContactModal(false);
    setContactForm({ result: 'nie_odebral', notes: '', nextContactDays: 1, smsSent: false, emailSent: false });
    fetchLead();
  };

  // Wybór usługi
 const handleSelectService = async (e) => {
  e.preventDefault();

  const updateData = {
    serviceType: serviceForm.type,
    servicePrice: serviceForm.price,
    qualifiedFor: serviceForm.type === 'negocjacje' ? 'negocjacje' : 'upadlosci',
    status: 'do_umowy'
  };

  // Dla negocjacji zapisz liczbę wierzycieli
  if (serviceForm.type === 'negocjacje') {
    updateData.creditorCount = parseInt(serviceForm.creditorCount) || 1;
  }

  await updateDoc(doc(db, "leads", id), updateData);

  setShowServiceModal(false);
  fetchLead();
};

  // Przekazanie leada
  const handleTransfer = async (newAgent) => {
    await updateDoc(doc(db, "leads", id), {
      assignedTo: newAgent,
      transferHistory: arrayUnion({
        from: lead.assignedTo,
        to: newAgent,
        date: new Date().toISOString(),
        by: currentUser
      })
    });
    setShowTransferModal(false);
    fetchLead();
  };

  // Podpisanie umowy
  const handleSignContract = async () => {
    if (!window.confirm('Czy na pewno oznaczyć jako podpisana umowa?')) return;
    
    const reminderCycleDays = 10; // Cykl 10-dniowy
    const nextReminderDate = addDays(new Date(), reminderCycleDays);
    
    // Aktualizuj lead
    await updateDoc(doc(db, "leads", id), {
      status: 'klient',
      contractSignedDate: new Date().toISOString(),
      contractSignedBy: currentUser,
      nextReminderDate: nextReminderDate.toISOString(),
      reminderCycleDays: reminderCycleDays
    });
  
    // Utwórz pierwsze automatyczne przypomnienie
    await addDoc(collection(db, "reminders"), {
      leadId: id,
      type: 'kontakt_kontrolny',
      title: `Kontakt kontrolny: ${lead.name}`,
      date: nextReminderDate.toISOString(),
      isAutomatic: true,
      repeatDays: reminderCycleDays,
      isCompleted: false,
      createdBy: currentUser,
      createdAt: serverTimestamp()
    });
    
    // Nawiguj do właściwego działu
    const dept = lead.qualifiedFor === 'negocjacje' ? 'negocjacje' : 'upadlosci';
    navigate(`/crm/${dept}/klienci/${id}`);
  };

  // Spalenie leada
  const handleBurn = async () => {
    if (!window.confirm('Czy na pewno oznaczyć jako spalony?')) return;
    
    await updateDoc(doc(db, "leads", id), {
      status: 'spalony',
      burnedDate: new Date().toISOString(),
      burnedBy: currentUser
    });
    fetchLead();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  // Ograniczony pracownik nie ma dostępu do leadów nieprzypisanych do niego.
  if (lead && isRestricted && lead.assignedTo && lead.assignedTo !== (userData?.displayName || currentUser)) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">Nie masz dostępu do tego leada</p>
        <button onClick={() => navigate(`/crm/${department}/leady`)} className="mt-4 text-stone-900 underline">
          Wróć do listy
        </button>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">Lead nie został znaleziony</p>
        <button onClick={() => navigate(`/crm/${department}/leady`)} className="mt-4 text-stone-900 underline">
          Wróć do listy
        </button>
      </div>
    );
  }

  const contactHistory = lead.contactHistory || [];

  return (
    <div className="min-h-full bg-stone-50">
      
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-8 py-6">
          
          {/* Breadcrumb */}
          <button 
            onClick={() => navigate(location.state?.from === 'calendar' ? `/crm/${department}/kalendarz` : `/crm/${department}/leady`)}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">{location.state?.from === 'calendar' ? 'Powrót do kalendarza' : 'Powrót do leadów'}</span>
          </button>

          {/* Główne info */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-600 font-semibold text-lg lg:text-xl">
                  {lead.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl lg:text-2xl font-semibold text-stone-900 truncate">{lead.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-medium border whitespace-nowrap ${LEAD_STATUSES[lead.status]?.color}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${LEAD_STATUSES[lead.status]?.dot}`}></span>
                    {LEAD_STATUSES[lead.status]?.label}
                  </span>
                  {lead.serviceType && (
                    <span className="text-stone-500 text-sm whitespace-nowrap">
                      {SERVICE_TYPES[lead.serviceType]?.shortLabel} • {formatPLN(lead.servicePrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Akcje */}
            <div className="flex flex-wrap gap-2 lg:gap-3 lg:flex-shrink-0">
              {lead.status !== 'klient' && lead.status !== 'spalony' && (
                <>
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
                  >
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Zarejestruj kontakt
                  </button>

                  {!lead.serviceType && (
                    <button
                      onClick={() => setShowServiceModal(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
                    >
                      <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Wybierz usługę
                    </button>
                  )}

                  {lead.serviceType && lead.status === 'do_umowy' && (
                    <>
                      <button
                        onClick={() => {
                          const dept = lead.qualifiedFor === 'negocjacje' ? 'negocjacje' : 'upadlosci';
                          navigate(`/crm/${dept}/umowy?clientId=${id}`);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generuj umowę
                      </button>
                      <button
                        onClick={handleSignContract}
                        className="inline-flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
                      >
                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Podpisz umowę
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleBurn}
                    className="inline-flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors font-medium text-sm"
                  >
                    Odrzuć
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Lewa kolumna - Info */}
          <div className="space-y-6">
            
            {/* Dane kontaktowe */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="font-semibold text-stone-900 mb-4">Dane kontaktowe</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">Telefon</label>
                  <p className="text-lg font-medium text-stone-900 mt-1">{lead.phone || '—'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">Email</label>
                  <p className="text-stone-700 mt-1">{lead.email || '—'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">Źródło</label>
                  <p className="text-stone-700 mt-1">{lead.source || '—'}</p>
                </div>
              </div>
            </div>

            {/* Statystyki kontaktu */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="font-semibold text-stone-900 mb-4">Statystyki</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-semibold text-stone-900">{lead.contactAttempts || 0}</p>
                  <p className="text-xs text-stone-500 mt-1">Prób kontaktu</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-semibold text-stone-900">{lead.smsCount || 0}</p>
                  <p className="text-xs text-stone-500 mt-1">SMS wysłane</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-semibold text-stone-900">{lead.emailCount || 0}</p>
                  <p className="text-xs text-stone-500 mt-1">Email wysłane</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-semibold text-stone-900">
                    {lead.createdAt ? daysSince(lead.createdAt) : 0}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">Dni od wpadu</p>
                </div>
              </div>
            </div>

            {/* Opiekun */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-stone-900">Opiekun</h2>
                <button 
                  onClick={() => setShowTransferModal(true)}
                  className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
                >
                  Zmień
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {lead.assignedTo?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-stone-900">{lead.assignedTo || 'Nie przypisano'}</p>
                  {lead.assignedAt && (
                    <p className="text-sm text-stone-500">od {formatDate(lead.assignedAt)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Następny kontakt */}
            {lead.nextContactDate && lead.status !== 'klient' && lead.status !== 'spalony' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h2 className="font-semibold text-amber-800 mb-2">Następny kontakt</h2>
                <p className="text-2xl font-semibold text-amber-900">
                  {formatDate(lead.nextContactDate)}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {timeAgo(lead.nextContactDate)}
                </p>
              </div>
            )}
          </div>

          {/* Prawa kolumna - Historia */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-stone-200">
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="font-semibold text-stone-900">Historia kontaktu</h2>
              </div>
              
              <div className="p-6">
                {contactHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-stone-500">Brak historii kontaktu</p>
                    <p className="text-sm text-stone-400 mt-1">Zarejestruj pierwszą próbę kontaktu</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {[...contactHistory].reverse().map((entry, idx) => (
                      <div key={idx} className="relative pl-8 pb-6 border-l-2 border-stone-200 last:pb-0">
                        <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-white border-2 border-stone-300"></div>
                        
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-medium text-stone-900">{entry.author}</span>
                            <span className="text-stone-400 mx-2">•</span>
                            <span className="text-stone-500">{formatDateTime(entry.date)}</span>
                          </div>
                          {entry.minutesFromCreation !== undefined && (
                            <span className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded">
                              +{(() => {
                                // Funkcja do ładnego formatowania upływu czasu (minuty od "wpadu")
                                const mins = entry.minutesFromCreation;
                                if (mins < 60) {
                                  return `${mins} min od wpadu`;
                                } else if (mins < 360) {
                                  // do 6h: "4h 32min"
                                  const h = Math.floor(mins / 60);
                                  const m = mins % 60;
                                  return `${h}h${m ? ` ${m}min` : ''} od wpadu`;
                                } else if (mins < 60 * 24) {
                                  // powyżej 6h do 24h: "7 godzin od wpadu"
                                  const h = Math.round(mins / 60);
                                  return `${h} godzin${h > 1 ? '' : 'a'} od wpadu`;
                                } else {
                                  // powyżej 24h: "1d od wpadu", zaokrąglij do pełnych dni
                                  const d = Math.floor(mins / (60 * 24));
                                  return `${d}d od pozyskania`;
                                }
                              })()}
                            </span>
                          )}
                        </div>

                        <div className="bg-stone-50 rounded-lg p-4">
                          <p className="font-medium text-stone-900 mb-1">
                            {CONTACT_RESULTS[entry.result] || entry.result}
                          </p>
                          {entry.notes && (
                            <p className="text-stone-600 text-sm">{entry.notes}</p>
                          )}
                          <div className="flex gap-3 mt-2">
                            {entry.smsSent && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                SMS wysłany
                              </span>
                            )}
                            {entry.emailSent && (
                              <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                                Email wysłany
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal rejestracji kontaktu */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowContactModal(false)}></div>
          
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
              
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-semibold text-stone-900">Zarejestruj kontakt</h2>
              </div>

              <form onSubmit={handleLogContact}>
                <div className="p-6 space-y-4">
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Rezultat rozmowy
                    </label>
                    <select
                      value={contactForm.result}
                      onChange={(e) => setContactForm({ ...contactForm, result: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors bg-white"
                    >
                      {Object.entries(CONTACT_RESULTS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Notatka
                    </label>
                    <textarea
                      value={contactForm.notes}
                      onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors resize-none"
                      placeholder="Szczegóły rozmowy..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Następny kontakt za
                    </label>
                    <select
                      value={contactForm.nextContactDays}
                      onChange={(e) => setContactForm({ ...contactForm, nextContactDays: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors bg-white"
                    >
                      <option value="0">Dziś</option>
                      <option value="1">Jutro</option>
                      <option value="2">Za 2 dni</option>
                      <option value="3">Za 3 dni</option>
                      <option value="7">Za tydzień</option>
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contactForm.smsSent}
                        onChange={(e) => setContactForm({ ...contactForm, smsSent: e.target.checked })}
                        className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                      />
                      <span className="text-sm text-stone-700">Wysłano SMS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contactForm.emailSent}
                        onChange={(e) => setContactForm({ ...contactForm, emailSent: e.target.checked })}
                        className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                      />
                      <span className="text-sm text-stone-700">Wysłano email</span>
                    </label>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-stone-200 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
                  >
                    Zapisz
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal wyboru usługi */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowServiceModal(false)}></div>
          
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
              
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-semibold text-stone-900">Wybierz usługę</h2>
              </div>

              <form onSubmit={handleSelectService}>
                <div className="p-6 space-y-4">
                  
                  <div className="space-y-3">
                    {Object.entries(SERVICE_TYPES).map(([key, service]) => (
                      <label 
                        key={key}
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          serviceForm.type === key 
                            ? 'border-stone-900 bg-stone-50' 
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="serviceType"
                          value={key}
                          checked={serviceForm.type === key}
                          onChange={(e) => {
                            const newType = e.target.value;
                            const svc = SERVICE_TYPES[newType];
                            setServiceForm({ 
                              ...serviceForm, 
                              type: newType,
                              price: svc.perCreditor 
                                ? (svc.minPerCreditor * (serviceForm.creditorCount || 1))
                                : (svc.defaultPrice || 0)
                            });
                          }}
                          className="w-4 h-4 text-stone-900 focus:ring-stone-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-stone-900">{service.label}</p>
                          {service.perCreditor ? (
                            <p className="text-sm text-stone-500">Min. {formatPLN(service.minPerCreditor)} za wierzyciela</p>
                          ) : service.defaultPrice ? (
                            <p className="text-sm text-stone-500">Bazowa cena: {formatPLN(service.defaultPrice)}</p>
                          ) : null}
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Liczba wierzycieli - tylko dla negocjacji */}
                  {serviceForm.type === 'negocjacje' && (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">
                        Liczba wierzycieli
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={serviceForm.creditorCount}
                        onChange={(e) => {
                          const count = parseInt(e.target.value) || 1;
                          setServiceForm({ 
                            ...serviceForm, 
                            creditorCount: count,
                            price: Math.max(count * SERVICE_TYPES.negocjacje.minPerCreditor, serviceForm.price)
                          });
                        }}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors"
                        placeholder="1"
                      />
                      <p className="text-sm text-violet-600 mt-2">
                        Min. kwota: {formatPLN(serviceForm.creditorCount * SERVICE_TYPES.negocjacje.minPerCreditor)}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Cena usługi (PLN)
                    </label>
                    <input
                      type="number"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-stone-200 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    Zatwierdź
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal przekazania leada */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowTransferModal(false)}></div>
          
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm">
              
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-semibold text-stone-900">Przekaż leada</h2>
              </div>

              <div className="p-6 space-y-2">
                {agents.filter(a => a !== lead.assignedTo).map((agent) => (
                  <button
                    key={agent}
                    onClick={() => handleTransfer(agent)}
                    className="w-full flex items-center gap-3 p-4 border border-stone-200 rounded-lg hover:border-stone-300 hover:bg-stone-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                      <span className="text-stone-600 font-medium">{agent.charAt(0)}</span>
                    </div>
                    <span className="font-medium text-stone-900">{agent}</span>
                  </button>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-stone-200">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="w-full px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetails;