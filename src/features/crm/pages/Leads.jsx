import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatPLN, timeSinceLead, LEAD_STATUSES, SERVICE_TYPES, DEPARTMENTS } from "../../../lib/utils";
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from "../../../hooks/useAuth";

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const department = location.pathname.split('/')[2]; // 'upadlosci' or 'negocjacje'

  const { displayName: currentUser, isRestricted, isNegocjacjeOnly, canSeeAllLeads, userData } = useAuth();


  // Filtry z URL
  const [filters, setFilters] = useState({
    status: searchParams.get('status')?.split(',').filter(Boolean) || [],
    source: searchParams.get('source')?.split(',').filter(Boolean) || [],
    assignedTo: searchParams.get('assignedTo')?.split(',').filter(Boolean) || [],
    onlyMine: searchParams.get('onlyMine') === 'true',
    search: searchParams.get('search') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || ''
  });

  // Formularz nowego leada
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Meta Ads',
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeads(leadsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync filtrów do URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status.length) params.set('status', filters.status.join(','));
    if (filters.source.length) params.set('source', filters.source.join(','));
    if (filters.assignedTo.length) params.set('assignedTo', filters.assignedTo.join(','));
    if (filters.onlyMine) params.set('onlyMine', 'true');
    if (filters.search) params.set('search', filters.search);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Unikalne wartości do filtrów
  const filterOptions = useMemo(() => {
    const sources = [...new Set(leads.map(l => l.source).filter(Boolean))];
    const agents = [...new Set(leads.map(l => l.assignedTo).filter(Boolean))];
    return { sources, agents };
  }, [leads]);

  // Filtrowanie leadów
  const filteredLeads = useMemo(() => {
    let result = leads;

    // Ograniczony pracownik widzi tylko leady przypisane do siebie.
    if (isRestricted) {
      const myName = userData?.displayName || currentUser;
      result = result.filter(l => l.assignedTo === myName);
    }

    // Agent negocjacji widzi TYLKO leady skwalifikowane na negocjacje (qualifiedFor === 'negocjacje')
    // Nie widzi niekwalifikowanych leadów ani leadów upadłościowych
    if (isNegocjacjeOnly && !isRestricted) {
      result = result.filter(l => l.qualifiedFor === 'negocjacje');
    }

    // Tylko moje
    if (filters.onlyMine) {
      result = result.filter(l => l.assignedTo === currentUser);
    }

    // Status (multi)
    if (filters.status.length > 0) {
      result = result.filter(l => filters.status.includes(l.status));
    }

    // Źródło (multi)
    if (filters.source.length > 0) {
      result = result.filter(l => filters.source.includes(l.source));
    }

    // Opiekun (multi)
    if (filters.assignedTo.length > 0) {
      result = result.filter(l => filters.assignedTo.includes(l.assignedTo));
    }

    // Szukajka
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.email?.toLowerCase().includes(q)
      );
    }

    // Data wpłynięcia (createdAt)
    if (filters.dateFrom || filters.dateTo) {
      result = result.filter(l => {
        const createdAt = l.createdAt;
        if (!createdAt) return false;
        const leadDate = createdAt?.seconds
          ? new Date(createdAt.seconds * 1000)
          : new Date(createdAt);
        const leadDayStart = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
        if (filters.dateFrom) {
          const from = new Date(filters.dateFrom);
          if (leadDayStart < from) return false;
        }
        if (filters.dateTo) {
          const toEnd = new Date(filters.dateTo);
          toEnd.setDate(toEnd.getDate() + 1);
          if (leadDayStart >= toEnd) return false;
        }
        return true;
      });
    }

    return result;
  }, [leads, filters, currentUser]);

  // Liczba aktywnych filtrów
  const activeFiltersCount = filters.status.length + filters.source.length + filters.assignedTo.length + (filters.onlyMine ? 1 : 0) + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  // Reset filtrów
  const resetFilters = () => {
    setFilters({
      status: [],
      source: [],
      assignedTo: [],
      onlyMine: false,
      search: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // Toggle dla multi-select
  const toggleFilter = (key, value) => {
    setFilters(prev => {
      const current = prev[key];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  // Przypisz leada do siebie
  const handleAssign = async (leadId, e) => {
    e.stopPropagation();
    // Ograniczony pracownik nie może sam brać nowych leadów.
    if (isRestricted) return;
    await updateDoc(doc(db, "leads", leadId), {
      assignedTo: currentUser,
      status: 'do_kontaktu',
      assignedAt: new Date().toISOString()
    });
  };

  // Dodaj nowego leada
  const handleAddLead = async (e) => {
    e.preventDefault();

    await addDoc(collection(db, "leads"), {
      ...formData,
      status: 'nowy',
      assignedTo: null,
      createdAt: serverTimestamp(),
      contactAttempts: 0,
      contactHistory: [],
      serviceType: null,
      servicePrice: null
    });

    setShowAddModal(false);
    setFormData({ name: '', phone: '', email: '', source: 'Meta Ads', notes: '' });
  };

  // Komponent wskaźnika czasu
  const TimeIndicator = ({ createdAt }) => {
    const time = timeSinceLead(createdAt);
    const colorClasses = {
      emerald: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      orange: 'bg-orange-50 text-orange-700',
      red: 'bg-red-50 text-red-700',
      stone: 'bg-stone-100 text-stone-600'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClasses[time.color]}`}>
        {time.full}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-stone-900">Leady</h1>
          <p className="text-stone-500 mt-1 text-sm">
            {isRestricted
              ? `${filteredLeads.length} leadów (Twoje)`
              : `${filteredLeads.length} z ${leads.length} leadów`}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Dodaj leada</span>
        </button>
      </div>

      {/* Szukajka i filtry */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">

        {/* Szukajka */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Szukaj po nazwie, telefonie, email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 transition-colors text-base"
          />
        </div>

        {/* Przycisk filtrów */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${
            activeFiltersCount > 0
              ? 'bg-stone-900 text-white border-stone-900'
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filtry</span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Toggle "Tylko moje" */}
        <button
          onClick={() => setFilters({ ...filters, onlyMine: !filters.onlyMine })}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${
            filters.onlyMine
              ? 'bg-stone-900 text-white border-stone-900'
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="hidden sm:inline">Tylko moje</span>
        </button>
      </div>

      {/* Panel filtrów */}
      {showFilters && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 space-y-4">

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LEAD_STATUSES).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => toggleFilter('status', key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.status.includes(key)
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {value.label}
                </button>
              ))}
            </div>
          </div>

          {/* Źródło */}
          {filterOptions.sources.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Źródło
              </label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.sources.map(source => (
                  <button
                    key={source}
                    onClick={() => toggleFilter('source', source)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filters.source.includes(source)
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opiekun */}
          {filterOptions.agents.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Opiekun
              </label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.agents.map(agent => (
                  <button
                    key={agent}
                    onClick={() => toggleFilter('assignedTo', agent)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filters.assignedTo.includes(agent)
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {agent}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Data wpłynięcia */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Data wpłynięcia
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-stone-500">Od</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-stone-500">Do</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
          </div>

          {/* Reset */}
          {activeFiltersCount > 0 && (
            <div className="pt-2 border-t border-stone-100">
              <button
                onClick={resetFilters}
                className="text-sm text-stone-500 hover:text-stone-700 font-medium"
              >
                Wyczyść wszystkie filtry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Aktywne filtry - tagi */}
      {activeFiltersCount > 0 && !showFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-stone-500">Filtry:</span>

          {filters.status.map(s => (
            <span
              key={`status-${s}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-700 rounded text-sm"
            >
              {LEAD_STATUSES[s]?.label}
              <button onClick={() => toggleFilter('status', s)} className="hover:text-stone-900">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}

          {filters.source.map(s => (
            <span
              key={`source-${s}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-700 rounded text-sm"
            >
              {s}
              <button onClick={() => toggleFilter('source', s)} className="hover:text-stone-900">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}

          {filters.assignedTo.map(a => (
            <span
              key={`agent-${a}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-700 rounded text-sm"
            >
              {a}
              <button onClick={() => toggleFilter('assignedTo', a)} className="hover:text-stone-900">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}

          {(filters.dateFrom || filters.dateTo) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-700 rounded text-sm">
              {filters.dateFrom && filters.dateTo
                ? `${filters.dateFrom} – ${filters.dateTo}`
                : filters.dateFrom
                  ? `od ${filters.dateFrom}`
                  : `do ${filters.dateTo}`}
              <button
                onClick={() => setFilters({ ...filters, dateFrom: '', dateTo: '' })}
                className="hover:text-stone-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}

          <button
            onClick={resetFilters}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            Wyczyść
          </button>
        </div>
      )}

      {/* DESKTOP: Tabela */}
      <div className="hidden md:block bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-0">
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Lead</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Kontakt</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Źródło</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Opiekun</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Czas</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-stone-400">
                    {activeFiltersCount > 0 ? 'Brak leadów pasujących do filtrów' : 'Brak leadów do wyświetlenia'}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/crm/${department}/leady/${lead.id}`)}
                    className="hover:bg-stone-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 overflow-hidden">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-stone-600 font-medium">
                            {lead.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 truncate">{lead.name || 'Brak nazwy'}</p>
                          {lead.serviceType && (
                            <p className="text-xs text-stone-500 truncate">
                              {SERVICE_TYPES[lead.serviceType]?.shortLabel}
                              {lead.servicePrice && ` • ${formatPLN(lead.servicePrice)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 overflow-hidden">
                      <p className="text-stone-900 truncate" title={lead.phone || undefined}>{lead.phone || '—'}</p>
                      {lead.email && (
                        <p className="text-sm text-stone-500 truncate" title={lead.email}>{lead.email}</p>
                      )}
                    </td>

                    <td className="px-6 py-4 overflow-hidden">
                      <span className="text-stone-600 block truncate" title={lead.source || undefined}>{lead.source || '—'}</span>
                    </td>

                    <td className="px-6 py-4 overflow-hidden">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border truncate max-w-full ${LEAD_STATUSES[lead.status]?.color || 'bg-stone-100 text-stone-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${LEAD_STATUSES[lead.status]?.dot || 'bg-stone-400'}`}></span>
                        <span className="truncate">{LEAD_STATUSES[lead.status]?.label || lead.status}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 overflow-hidden">
                      {lead.assignedTo ? (
                        <span className="text-stone-900 block truncate" title={lead.assignedTo}>{lead.assignedTo}</span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <TimeIndicator createdAt={lead.createdAt} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      {!lead.assignedTo ? (
                        <button
                          onClick={(e) => handleAssign(lead.id, e)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
                        >
                          Biorę
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/crm/${department}/leady/${lead.id}`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-200 transition-colors"
                        >
                          Otwórz
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE: Karty */}
      <div className="md:hidden space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-400">
            {activeFiltersCount > 0 ? 'Brak leadów pasujących do filtrów' : 'Brak leadów do wyświetlenia'}
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => navigate(`/crm/${department}/leady/${lead.id}`)}
              className="bg-white rounded-xl border border-stone-200 p-4 active:bg-stone-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-stone-600 font-semibold">
                      {lead.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">{lead.name || 'Brak nazwy'}</p>
                    <p className="text-sm text-stone-500">{lead.phone}</p>
                  </div>
                </div>
                <TimeIndicator createdAt={lead.createdAt} />
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${LEAD_STATUSES[lead.status]?.color || 'bg-stone-100 text-stone-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${LEAD_STATUSES[lead.status]?.dot || 'bg-stone-400'}`}></span>
                  {LEAD_STATUSES[lead.status]?.label || lead.status}
                </span>

                {lead.source && (
                  <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded max-w-[140px] truncate inline-block" title={lead.source}>
                    {lead.source}
                  </span>
                )}

                {lead.serviceType && (
                  <span className="text-xs text-stone-600 bg-stone-100 px-2 py-1 rounded font-medium">
                    {SERVICE_TYPES[lead.serviceType]?.shortLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <div className="text-sm text-stone-500">
                  {lead.assignedTo ? (
                    <span>Opiekun: <span className="text-stone-700 font-medium">{lead.assignedTo}</span></span>
                  ) : (
                    <span className="text-stone-400">Brak opiekuna</span>
                  )}
                </div>

                {!lead.assignedTo ? (
                  <button
                    onClick={(e) => handleAssign(lead.id, e)}
                    className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg"
                  >
                    Biorę
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-stone-400">
                    <span className="text-sm">Otwórz</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal dodawania leada */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddModal(false)}></div>

          <div className="relative min-h-full flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-md">

              <div className="md:hidden flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-stone-300 rounded-full"></div>
              </div>

              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-semibold text-stone-900">Dodaj nowego leada</h2>
                <p className="text-sm text-stone-500 mt-1">Wprowadź dane kontaktowe</p>
              </div>

              <form onSubmit={handleAddLead}>
                <div className="p-6 space-y-4">

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Imię i nazwisko *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
                      placeholder="Jan Kowalski"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Numer telefonu *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
                      placeholder="500 000 000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
                      placeholder="jan@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Źródło
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors bg-white text-base"
                    >
                      <option value="Meta Ads">Meta Ads</option>
                      <option value="Google Ads">Google Ads</option>
                      <option value="Polecenie">Polecenie</option>
                      <option value="Strona WWW">Strona WWW</option>
                      <option value="Telefon">Telefon przychodzący</option>
                      <option value="Inne">Inne</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Notatka
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors resize-none text-base"
                      placeholder="Opcjonalna notatka..."
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-stone-200 flex gap-3 pb-safe">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
                  >
                    Dodaj leada
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;