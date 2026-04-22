import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatPLN, formatDate, daysSince, daysUntil, LEAD_STATUSES, SERVICE_TYPES, DEPARTMENTS, NEGOCJACJE_REVENUE_SPLIT } from "../../../lib/utils";
import { Link } from 'react-router-dom';
import { useAuth } from "../../../hooks/useAuth";

const Clients = ({ department }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wszyscy');
  const [searchQuery, setSearchQuery] = useState('');

  const { isRestricted, userData, canSeeDepartment } = useAuth();

  // Sprawdź dostęp do działu
  if (department && !canSeeDepartment(department)) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">Nie masz dostępu do tego działu</p>
      </div>
    );
  }

  const normalizeServiceType = (type) => {
    if (!type) return '';
    if (type === 'upadlosc_konsumencka') return 'upadlosc';
    return type;
  };

  // Mapowanie departamentu na typ usługi
  const getDepartmentServiceTypes = (dept) => {
    if (dept === 'upadlosci') return ['upadlosc', 'upadlosc_konsumencka'];
    if (dept === 'negocjacje') return ['negocjacje'];
    return null; // all
  };

  useEffect(() => {
    const q = query(collection(db, "leads"), where("status", "==", "klient"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

 const getClientStatus = (client) => {
  if (client.isArchived) return 'archiwum';
  if (client.clientStatus) return client.clientStatus;
  
  // Auto: jeśli ma nieopłacone raty = aktywny
  const hasUnpaidPayments = (client.payments || []).some(p => p.status !== 'opłacone');
  if (hasUnpaidPayments) return 'aktywny';
  
  return 'onboarding';
};

// Kategorie klientów
const categorizeClients = (list) => {
  return {
    wszyscy: list,
    onboarding: list.filter(c => getClientStatus(c) === 'onboarding'),
    aktywni: list.filter(c => getClientStatus(c) === 'aktywny'),
    archiwum: list.filter(c => getClientStatus(c) === 'archiwum')
  };
};

  // Ograniczony pracownik widzi tylko "swoich" klientów (po assignedTo).
  // Filtrowanie wg działu
  const visibleClients = useMemo(() => {
    let result = clients;
    
    // Filtruj wg działu
    const deptTypes = getDepartmentServiceTypes(department);
    if (deptTypes) {
      result = result.filter(c => {
        const type = normalizeServiceType(c.serviceType);
        return deptTypes.includes(type) || deptTypes.includes(c.serviceType);
      });
    }
    
    if (isRestricted) {
      const myName = userData?.displayName;
      result = result.filter(c => c.assignedTo === myName);
    }
    
    return result;
  }, [clients, isRestricted, userData?.displayName, department]);

  const categories = categorizeClients(visibleClients);

  // Filtrowanie (search)
  const getFilteredClients = () => {
    let filtered = categories[activeTab] || [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // Status płatności
  const getPaymentStatus = (client) => {
    if (!client.nextPaymentDate) return null;
    
    const days = daysUntil(client.nextPaymentDate);
    
    if (days === null) return null;
    if (days < 0) return { label: `Zaległe ${Math.abs(days)} dni`, color: 'bg-red-100 text-red-700 border-red-200' };
    if (days === 0) return { label: 'Dziś', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (days <= 3) return { label: `Za ${days} dni`, color: 'bg-amber-50 text-amber-600 border-amber-200' };
    return { label: `Za ${days} dni`, color: 'bg-stone-100 text-stone-600 border-stone-200' };
  };

  const tabs = [
    { id: 'wszyscy', label: 'Wszyscy', count: categories.wszyscy.length },
    { id: 'onboarding', label: 'Onboarding', count: categories.onboarding.length, desc: 'do 30 dni' },
    { id: 'aktywni', label: 'Aktywni', count: categories.aktywni.length, desc: 'w obsłudze' },
    { id: 'archiwum', label: 'Archiwum', count: categories.archiwum.length, desc: 'zakończone' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  const filteredClients = getFilteredClients();

  // Statystyki
  const totalRevenue = visibleClients.reduce((sum, c) => sum + (c.servicePrice || 0), 0);
  const overduePayments = visibleClients.filter(c => {
    const days = daysUntil(c.nextPaymentDate);
    return days !== null && days < 0;
  }).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          {department && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${department === 'upadlosci' ? 'bg-blue-100 text-blue-800' : 'bg-violet-100 text-violet-800'}`}>
              {DEPARTMENTS[department]?.label}
            </span>
          )}
          <h1 className="text-2xl font-semibold text-stone-900">Klienci</h1>
        </div>
        <p className="text-stone-500 mt-1">
          {department === 'negocjacje' 
            ? 'Klienci z umowami negocjacyjnymi' 
            : department === 'upadlosci'
            ? 'Klienci z umowami upadłościowymi'
            : 'Teczki klientów z podpisanymi umowami'}
        </p>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500 mb-1">Wszystkich klientów</p>
          <p className="text-2xl font-semibold text-stone-900">{visibleClients.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500 mb-1">Wartość umów</p>
          <p className="text-2xl font-semibold text-stone-900">{formatPLN(totalRevenue)}</p>
        </div>
        {department === 'negocjacje' && (
          <>
            <div className="bg-white rounded-xl border border-violet-200 p-5">
              <p className="text-sm text-violet-600 mb-1">Nasz przychód (30%)</p>
              <p className="text-2xl font-semibold text-violet-700">{formatPLN(totalRevenue * NEGOCJACJE_REVENUE_SPLIT.kwzd)}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <p className="text-sm text-stone-500 mb-1">Kancelaria partnerska (70%)</p>
              <p className="text-2xl font-semibold text-stone-900">{formatPLN(totalRevenue * NEGOCJACJE_REVENUE_SPLIT.partner)}</p>
            </div>
          </>
        )}
        {department !== 'negocjacje' && (
          <>
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <p className="text-sm text-stone-500 mb-1">W onboardingu</p>
              <p className="text-2xl font-semibold text-stone-900">{categories.onboarding.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <p className="text-sm text-stone-500 mb-1">Zaległe płatności</p>
              <p className={`text-2xl font-semibold ${overduePayments > 0 ? 'text-red-600' : 'text-stone-900'}`}>
                {overduePayments}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Szukajka */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Szukaj klienta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
          />
        </div>
      </div>

      {/* Taby */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-stone-100 text-stone-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista klientów */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone-400">
            Brak klientów do wyświetlenia
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredClients.map((client) => {
              const paymentStatus = getPaymentStatus(client);
              
              return (
                <Link
                  key={client.id}
                  to={`/crm/${department || 'upadlosci'}/klienci/${client.id}`}
                  className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-5 hover:bg-stone-50 transition-colors gap-4 group"
                >
                  {/* Info klienta */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 font-semibold">
                        {client.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900 text-lg">{client.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-stone-500">{client.phone}</span>
                        {client.serviceType && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span className="text-sm text-stone-500">
                              {SERVICE_TYPES[client.serviceType]?.shortLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Środkowe info */}
                  <div className="flex items-center gap-6 lg:gap-8 pl-16 lg:pl-0">
                    <div className="text-left lg:text-center">
                      <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Wartość</p>
                      <p className="font-semibold text-stone-900">{formatPLN(client.servicePrice)}</p>
                    </div>
                    <div className="text-left lg:text-center">
                      <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Umowa</p>
                      <p className="text-stone-700">{formatDate(client.contractSignedDate)}</p>
                    </div>
                    <div className="text-left lg:text-center">
                      <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Czas obsługi</p>
                      <p className="text-stone-700">{daysSince(client.contractSignedDate)} dni</p>
                    </div>
                  </div>

                  {/* Status i akcja */}
                  <div className="flex items-center gap-4 pl-16 lg:pl-0">
                    {paymentStatus && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${paymentStatus.color}`}>
                        {paymentStatus.label}
                      </span>
                    )}
                    <Link
                      to={`/crm/${department || 'upadlosci'}/klienci/${client.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors opacity-0 group-hover:opacity-100"
                      title="Otwórz w nowej karcie"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                    <div className="flex items-center gap-2 text-stone-400">
                      <span className="text-sm font-medium">Otwórz teczkę</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;