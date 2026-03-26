import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatPLN, formatDate, formatDateTime, timeAgo, daysUntil, addDays, SERVICE_TYPES, DEPARTMENTS } from "../../../lib/utils";

// Dodawanie miesięcy kalendarzowo (ten sam dzień miesiąca: 07.02 → 07.03 → 07.04)
const addMonths = (dateStr, months) => {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};
import { deleteFile } from "../../../lib/storage";
import Timeline from "../components/Timeline";
import FileUploader from "../components/FileUploader";
import { useAuth } from "../../../hooks/useAuth";

const ClientDetails = ({ department }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('historia');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [clientStatus, setClientStatus] = useState(client?.clientStatus || 'onboarding');

  const { displayName: currentUser, userData, isRestricted } = useAuth();

  useEffect(() => {
    const fetchClient = async () => {
      const docRef = doc(db, "leads", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };
    fetchClient();
  }, [id]);

  const refreshClient = async () => {
    const docRef = doc(db, "leads", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setClient({ id: docSnap.id, ...docSnap.data() });
    }
  };

  const handleLogContact = async (data) => {
    const contactEntry = {
      date: new Date().toISOString(),
      author: currentUser,
      result: data.result,
      notes: data.notes,
      smsSent: data.smsSent,
      emailSent: data.emailSent
    };

    const nextContact = data.nextContactDays 
      ? addDays(new Date(), parseInt(data.nextContactDays)).toISOString()
      : null;

    await updateDoc(doc(db, "leads", id), {
      contactHistory: arrayUnion(contactEntry),
      lastContactDate: new Date().toISOString(),
      lastContactResult: data.result,
      nextReminderDate: nextContact,
      smsCount: (client.smsCount || 0) + (data.smsSent ? 1 : 0),
      emailCount: (client.emailCount || 0) + (data.emailSent ? 1 : 0)
    });

    setShowContactModal(false);
    refreshClient();
  };

  const handleAddPayment = async (data) => {
    const payment = {
      id: Date.now().toString(),
      amount: parseFloat(data.amount),
      dueDate: data.dueDate,
      notes: data.notes || '',
      status: 'oczekuje',
      createdAt: new Date().toISOString()
    };

    await updateDoc(doc(db, "leads", id), {
      payments: arrayUnion(payment)
    });

    setShowPaymentModal(false);
    refreshClient();
  };

  const handleGenerateInstallments = async (data) => {
    const { amount, count, startDate } = data;
    const numCount = parseInt(count, 10);
    const totalAmount = parseFloat(amount);
    const installmentAmount = Math.floor(totalAmount / numCount);
    const remainder = totalAmount - installmentAmount * numCount;
    const payments = [];

    for (let i = 0; i < numCount; i++) {
      const dueDate = addMonths(startDate, i);
      const isLast = i === numCount - 1;
      const amountThis = isLast ? installmentAmount + remainder : installmentAmount;
      payments.push({
        id: `${Date.now()}-${i}`,
        amount: amountThis,
        dueDate,
        notes: `Rata ${i + 1}/${numCount}`,
        status: 'oczekuje',
        createdAt: new Date().toISOString()
      });
    }

    await updateDoc(doc(db, "leads", id), {
      payments: [...(client.payments || []), ...payments]
    });

    setShowInstallmentModal(false);
    refreshClient();
  };

  const handleMarkPaid = async (payment) => {
    const updatedPayments = (client.payments || []).map(p => 
      p.id === payment.id 
        ? { ...p, status: 'opłacone', paidAt: new Date().toISOString() }
        : p
    );

    await updateDoc(doc(db, "leads", id), {
      payments: updatedPayments
    });

    refreshClient();
  };

  const handleDeletePayment = async (payment) => {
    if (!window.confirm('Czy na pewno usunąć tę płatność?')) return;

    const updatedPayments = (client.payments || []).filter(p => p.id !== payment.id);

    await updateDoc(doc(db, "leads", id), {
      payments: updatedPayments
    });

    refreshClient();
  };

  const handleDeleteDocument = async (file) => {
    if (!window.confirm('Czy na pewno usunąć ten plik?')) return;

    await deleteFile(file.path);
    
    const updatedDocs = (client.documents || []).filter(d => d.id !== file.id);
    await updateDoc(doc(db, "leads", id), {
      documents: updatedDocs
    });

    refreshClient();
  };

  const handleArchive = async () => {
    if (!window.confirm('Czy na pewno zarchiwizować tego klienta?')) return;

    await updateDoc(doc(db, "leads", id), {
      isArchived: true,
      archivedAt: new Date().toISOString()
    });

    navigate(`/crm/${department}/klienci`);
  };



  const closeEditor = () => {
    setShowPdfEditor(false);
    setFileToSign(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  // Ograniczony pracownik nie ma dostępu do klientów, którzy nie są do niego przypisani.
  if (client && isRestricted && client.assignedTo && client.assignedTo !== (userData?.displayName || currentUser)) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">Nie masz dostępu do tego klienta</p>
        <Link to={`/crm/${department}/klienci`} className="text-stone-900 underline mt-2 inline-block">
          Wróć do listy
        </Link>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">Nie znaleziono klienta</p>
        <Link to={`/crm/${department}/klienci`} className="text-stone-900 underline mt-2 inline-block">
          Wróć do listy
        </Link>
      </div>
    );
  }

  const payments = client.payments || [];
  const totalScheduled = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'opłacone').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'oczekuje').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status !== 'opłacone' && daysUntil(p.dueDate) < 0).reduce((sum, p) => sum + p.amount, 0);

  const getPaymentStatus = (payment) => {
    if (payment.status === 'opłacone') return { label: 'Opłacone', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    const days = daysUntil(payment.dueDate);
    if (days < 0) return { label: `Zaległe ${Math.abs(days)} dni`, color: 'bg-red-50 text-red-700 border-red-200' };
    if (days === 0) return { label: 'Dziś', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (days <= 3) return { label: `Za ${days} dni`, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: `Za ${days} dni`, color: 'bg-stone-50 text-stone-600 border-stone-200' };
  };

  const tabs = [
    { id: 'historia', label: 'Historia' },
    { id: 'platnosci', label: 'Płatności', badge: payments.filter(p => p.status !== 'opłacone' && daysUntil(p.dueDate) <= 0).length },
    { id: 'dokumenty', label: 'Dokumenty', badge: client.documents?.length || 0 },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(location.state?.from === 'calendar' ? `/crm/${department}/kalendarz` : `/crm/${department}/klienci`)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-stone-900 truncate">{client.name}</h1>
            <p className="text-stone-500 text-sm truncate">
              Klient od {formatDate(client.contractSignedDate)}
              {client.isArchived && <span className="ml-2 text-amber-600">(Zarchiwizowany)</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <button
            onClick={() => setShowContactModal(true)}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Zarejestruj kontakt
          </button>

          <button
            onClick={() => navigate(`/crm/${department}/umowy?clientId=${id}`)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            Generuj umowę
          </button>
        
          <button
            onClick={handleArchive}
            className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors font-medium text-sm"
          >
            Archiwizuj
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="space-y-6">
          
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Dane kontaktowe</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Telefon</p>
                  <a href={`tel:${client.phone}`} className="text-stone-900 font-medium">{client.phone}</a>
                </div>
              </div>
              
              {client.email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Email</p>
                    <a href={`mailto:${client.email}`} className="text-stone-900 font-medium">{client.email}</a>
                  </div>
                </div>
              )}

              {(client.address || client.city || client.postalCode) && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Adres</p>
                    <p className="text-stone-900 font-medium">
                      {[client.address, [client.postalCode, client.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Usługa</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-stone-400 mb-1">Typ usługi</p>
                <p className="text-stone-900 font-medium">
                  {SERVICE_TYPES[client.serviceType]?.label || client.serviceType || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-1">Wartość umowy</p>
                <p className="text-2xl font-semibold text-stone-900">{formatPLN(client.servicePrice || 0)}</p>
              </div>
              {client.debtAmount && (
                <div>
                  <p className="text-xs text-stone-400 mb-1">Kwota zadłużenia</p>
                  <p className="text-stone-900 font-medium">{formatPLN(client.debtAmount)}</p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Status klienta</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'onboarding', label: 'Onboarding', color: 'bg-blue-50 text-blue-700 border-blue-200', ring: 'ring-blue-400' },
                { id: 'aktywny', label: 'Aktywny', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: 'ring-emerald-400' },
                { id: 'archiwum', label: 'Archiwum', color: 'bg-stone-100 text-stone-500 border-stone-200', ring: 'ring-stone-400' },
              ].map((status) => {
                const currentStatus = client.isArchived 
                  ? 'archiwum' 
                  : (client.clientStatus || ((client.payments || []).some(p => p.status !== 'opłacone') ? 'aktywny' : 'onboarding'));
                const isActive = currentStatus === status.id;
                
                return (
                  <button
                    key={status.id}
                    onClick={async () => {
                      await updateDoc(doc(db, "leads", id), {
                        clientStatus: status.id,
                        isArchived: status.id === 'archiwum'
                      });
                      refreshClient();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      isActive
                        ? `${status.color} ring-2 ring-offset-1 ${status.ring}`
                        : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {status.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-stone-400 mt-3">
              Auto: Aktywny gdy ma nieopłacone raty
            </p>
          </div>
          
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Finanse</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-stone-500">Wpłacono</span>
                <span className="text-emerald-600 font-semibold">{formatPLN(totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Oczekuje</span>
                <span className="text-stone-900 font-medium">{formatPLN(totalPending)}</span>
              </div>
              {totalOverdue > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Zaległe</span>
                  <span className="text-red-600 font-semibold">{formatPLN(totalOverdue)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-stone-100 flex justify-between">
                <span className="text-stone-700 font-medium">Pozostało</span>
                <span className="text-stone-900 font-semibold">{formatPLN(totalScheduled - totalPaid)}</span>
              </div>
            </div>
          </div>

          {client.nextReminderDate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-amber-700 font-medium">Następny kontakt</p>
                  <p className="text-amber-900 font-semibold">{formatDate(client.nextReminderDate)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          
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
                {tab.badge > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5 md:p-6">
            
            {activeTab === 'historia' && (
              <Timeline
                items={(client.contactHistory || []).map((c, idx) => ({ ...c, id: idx }))}
                dateField="date"
                title="Historia kontaktów"
                emptyMessage="Brak zarejestrowanych kontaktów"
                renderItem={(contact) => (
                  <div className="bg-stone-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-stone-900">{contact.result}</span>
                      <span className="text-xs text-stone-400">{formatDateTime(contact.date)}</span>
                    </div>
                    {contact.notes && (
                      <p className="text-sm text-stone-600 mb-2">{contact.notes}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-stone-400">
                      <span>{contact.author}</span>
                      {contact.smsSent && <span className="text-blue-500">SMS</span>}
                      {contact.emailSent && <span className="text-blue-500">Email</span>}
                    </div>
                  </div>
                )}
              />
            )}

            {activeTab === 'platnosci' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
                  >
                    Dodaj płatność
                  </button>
                  <button
                    onClick={() => setShowInstallmentModal(true)}
                    className="px-4 py-2 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium text-sm"
                  >
                    Generuj raty
                  </button>
                </div>

                {payments.length === 0 ? (
                  <div className="text-center py-12 text-stone-400">
                    Brak zaplanowanych płatności
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments
                      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                      .map((payment) => {
                        const status = getPaymentStatus(payment);
                        return (
                          <div
                            key={payment.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-stone-50 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center">
                                {payment.status === 'opłacone' ? (
                                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-stone-900">{formatPLN(payment.amount)}</p>
                                <p className="text-sm text-stone-500">
                                  {formatDate(payment.dueDate)}
                                  {payment.notes && ` • ${payment.notes}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-14 sm:ml-0">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                                {status.label}
                              </span>
                              
                              {payment.status !== 'opłacone' && (
                                <button
                                  onClick={() => handleMarkPaid(payment)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                  Opłacone
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleDeletePayment(payment)}
                                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dokumenty' && (
              <div>
                <div className="mb-6">
                  <FileUploader
                    clientId={id}
                    currentUser={currentUser}
                    onUpload={refreshClient}
                  />
                </div>

                {!client.documents || client.documents.length === 0 ? (
                    <div className="text-center py-12 text-stone-400">Brak dokumentów</div>
                ) : (
                    <div className="space-y-2">
                        {client.documents.map((file) => {
                            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') || file.url.includes('.pdf');
                            return (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center flex-shrink-0 text-stone-400">
                                            {isPdf ? (
                                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-stone-900 truncate hover:text-blue-600 hover:underline">
                                                {file.name}
                                            </a>
                                            <p className="text-xs text-stone-500">{formatDateTime(file.createdAt)} • {file.uploadedBy}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                     
                                        
                                        <a 
                                            href={file.url} 
                                            download 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            title="Pobierz" 
                                            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-stone-200"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>

                                        <button 
                                            onClick={() => handleDeleteDocument(file)} 
                                            title="Usuń" 
                                            className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showContactModal && (
        <ContactModal
          onClose={() => setShowContactModal(false)}
          onSubmit={handleLogContact}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handleAddPayment}
        />
      )}

      {showInstallmentModal && (
        <InstallmentModal
          onClose={() => setShowInstallmentModal(false)}
          onSubmit={handleGenerateInstallments}
          contractValue={client.servicePrice || 0}
          paidAmount={totalPaid}
        />
      )}
    </div>
  );
};

const ContactModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    result: 'Rozmowa',
    notes: '',
    smsSent: false,
    emailSent: false,
    nextContactDays: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const results = ['Rozmowa', 'Nieodebrany', 'Prośba o kontakt', 'Informacja', 'Inne'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative min-h-full flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-md">
          
          <div className="md:hidden flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-stone-300 rounded-full"></div>
          </div>

          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-semibold text-stone-900">Zarejestruj kontakt</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Wynik kontaktu</label>
                <div className="grid grid-cols-2 gap-2">
                  {results.map(result => (
                    <button
                      key={result}
                      type="button"
                      onClick={() => setFormData({ ...formData, result })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.result === result
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {result}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Notatka</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors resize-none text-base"
                  placeholder="Szczegóły rozmowy..."
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.smsSent}
                    onChange={(e) => setFormData({ ...formData, smsSent: e.target.checked })}
                    className="w-4 h-4 rounded border-stone-300"
                  />
                  <span className="text-sm text-stone-700">SMS wysłany</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.emailSent}
                    onChange={(e) => setFormData({ ...formData, emailSent: e.target.checked })}
                    className="w-4 h-4 rounded border-stone-300"
                  />
                  <span className="text-sm text-stone-700">Email wysłany</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Następny kontakt za</label>
                <select
                  value={formData.nextContactDays}
                  onChange={(e) => setFormData({ ...formData, nextContactDays: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors bg-white text-base"
                >
                  <option value="">Nie ustawiaj</option>
                  <option value="1">1 dzień</option>
                  <option value="3">3 dni</option>
                  <option value="7">7 dni</option>
                  <option value="10">10 dni</option>
                  <option value="14">14 dni</option>
                  <option value="30">30 dni</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex gap-3 pb-safe">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
              >
                Zapisz
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    amount: '',
    dueDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative min-h-full flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-md">
          
          <div className="md:hidden flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-stone-300 rounded-full"></div>
          </div>

          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-semibold text-stone-900">Dodaj płatność</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Kwota (PLN) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Termin płatności *</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Notatka</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
                  placeholder="np. Rata 1/4"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex gap-3 pb-safe">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
              >
                Dodaj
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const InstallmentModal = ({ onClose, onSubmit, contractValue, paidAmount }) => {
  const remaining = contractValue - paidAmount;
  const [formData, setFormData] = useState({
    amount: remaining.toString(),
    count: '4',
    startDate: new Date().toISOString().slice(0, 10)
  });

  const installmentAmount = formData.amount && formData.count 
    ? Math.ceil(parseFloat(formData.amount) / parseInt(formData.count))
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative min-h-full flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-md">
          
          <div className="md:hidden flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-stone-300 rounded-full"></div>
          </div>

          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-semibold text-stone-900">Generuj raty</h2>
            <p className="text-sm text-stone-500 mt-1">
              Pozostało do spłaty: {formatPLN(remaining)}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Łączna kwota do rozłożenia *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Liczba rat *</label>
                <div className="grid grid-cols-4 gap-2">
                  {['2', '3', '4', '6'].map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setFormData({ ...formData, count })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.count === count
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                  className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
                  placeholder="Lub wpisz inną liczbę"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Data pierwszej raty *</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
                />
              </div>

              {installmentAmount > 0 && (
                <div className="p-4 bg-stone-50 rounded-lg">
                  <p className="text-sm text-stone-600">
                    <span className="font-medium">{formData.count} rat</span> po{' '}
                    <span className="font-semibold text-stone-900">{formatPLN(installmentAmount)}</span>
                    <br />
                    <span className="text-xs text-stone-400">Płatne co 30 dni</span>
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex gap-3 pb-safe">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
              >
                Generuj raty
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;