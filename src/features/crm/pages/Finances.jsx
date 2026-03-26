import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatPLN, formatDate, daysUntil, addDays, startOfMonth, endOfMonth, SERVICE_TYPES, DEPARTMENTS, NEGOCJACJE_REVENUE_SPLIT } from "../../../lib/utils";
import { Link } from 'react-router-dom';
import { useAuth } from "../../../hooks/useAuth";

const COST_CATEGORIES = [
  { id: 'reklamy', label: 'Reklamy' },
  { id: 'poczta', label: 'Wysłanie dokumentów na pocztę' },
  { id: 'biuro', label: 'Biuro / materiały' },
  { id: 'software', label: 'Oprogramowanie / subskrypcje' },
  { id: 'podatki_ubezpieczenia', label: 'Podatki / ubezpieczenia' },
  { id: 'inne', label: 'Inne' },
];

const Finances = ({ department }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [viewMode, setViewMode] = useState('all');

  const [costs, setCosts] = useState([]);
  const [showCostModal, setShowCostModal] = useState(false);
  const [costMonthFilter, setCostMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [costForm, setCostForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    category: 'reklamy',
    description: '',
  });

  const { isRestricted, userData, displayName: currentUser, currentUser: authUser, canSeeDepartment } = useAuth();

  const deptConfig = DEPARTMENTS[department];
  const isNegocjacje = department === 'negocjacje';

  // Service types belonging to this department
  const deptServiceTypes = Object.entries(SERVICE_TYPES)
    .filter(([, v]) => v.department === department)
    .map(([k]) => k);

  useEffect(() => {
    const q = collection(db, "leads");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(l => l.status === 'klient');
      setClients(clientsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isRestricted || !authUser) return;
    const unsubscribe = onSnapshot(collection(db, "costs"), (snapshot) => {
      const costsData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const da = a.date || '';
          const db_ = b.date || '';
          return db_.localeCompare(da);
        });
      setCosts(costsData);
    }, (err) => {
      console.error('Błąd odczytu kosztów:', err);
    });
    return () => unsubscribe();
  }, [isRestricted, authUser]);

  // Klienci widoczni dla aktualnego użytkownika (przefiltrowane po departamencie)
  const visibleClients = useMemo(() => {
    let filtered = clients.filter(c => deptServiceTypes.includes(c.serviceType));
    if (isRestricted) {
      const myName = userData?.displayName;
      filtered = filtered.filter(c => c.assignedTo === myName);
    }
    return filtered;
  }, [clients, isRestricted, userData?.displayName, deptServiceTypes]);

  // Wszystkie płatności
  const allPayments = useMemo(() => {
    const payments = [];
    visibleClients.forEach(client => {
      (client.payments || []).forEach(payment => {
        payments.push({
          ...payment,
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          serviceType: client.serviceType
        });
      });
    });
    return payments;
  }, [visibleClients]);

  // Filtrowanie płatności
  const filteredPayments = useMemo(() => {
    let result = [...allPayments];

    if (dateRange.from) {
      result = result.filter(p => new Date(p.dueDate) >= dateRange.from);
    }
    if (dateRange.to) {
      result = result.filter(p => new Date(p.dueDate) <= dateRange.to);
    }

    return result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [allPayments, dateRange]);

  // Grupowanie po miesiącach
  const groupedPayments = useMemo(() => {
    const groups = {};

    filteredPayments.forEach(payment => {
      const date = new Date(payment.dueDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

      if (!groups[key]) {
        groups[key] = {
          key,
          label,
          payments: [],
          totalDue: 0,
          totalPaid: 0,
          totalOverdue: 0
        };
      }

      groups[key].payments.push(payment);
      groups[key].totalDue += payment.amount;

      if (payment.status === 'opłacone') {
        groups[key].totalPaid += payment.amount;
      } else if (daysUntil(payment.dueDate) < 0) {
        groups[key].totalOverdue += payment.amount;
      }
    });

    return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredPayments]);

  // Statystyki
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = now.getMonth() === 0
      ? `${now.getFullYear() - 1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    const totalPaid = allPayments
      .filter(p => p.status === 'opłacone')
      .reduce((sum, p) => sum + p.amount, 0);

    const thisMonthPaid = allPayments
      .filter(p => p.status === 'opłacone' && p.paidAt?.startsWith(thisMonth))
      .reduce((sum, p) => sum + p.amount, 0);

    const lastMonthPaid = allPayments
      .filter(p => p.status === 'opłacone' && p.paidAt?.startsWith(lastMonth))
      .reduce((sum, p) => sum + p.amount, 0);

    // Oczekiwana kwota w tym miesiącu (raty z terminem w tym miesiącu)
    const thisMonthExpected = allPayments
      .filter(p => p.dueDate?.startsWith(thisMonth))
      .reduce((sum, p) => sum + p.amount, 0);

    // Oczekuje w tym miesiącu (nieopłacone raty z terminem w tym miesiącu)
    const thisMonthPending = allPayments
      .filter(p => p.status !== 'opłacone' && p.dueDate?.startsWith(thisMonth))
      .reduce((sum, p) => sum + p.amount, 0);

    // Zaległe w tym miesiącu (nieopłacone z terminem w tym miesiącu, po terminie)
    const thisMonthOverdue = allPayments
      .filter(p => p.status !== 'opłacone' && p.dueDate?.startsWith(thisMonth) && daysUntil(p.dueDate) < 0)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = allPayments
      .filter(p => p.status !== 'opłacone')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalOverdue = allPayments
      .filter(p => p.status !== 'opłacone' && daysUntil(p.dueDate) < 0)
      .reduce((sum, p) => sum + p.amount, 0);

    const monthChange = lastMonthPaid > 0
      ? ((thisMonthPaid - lastMonthPaid) / lastMonthPaid * 100).toFixed(0)
      : 0;

    // Podział 30/70 dla negocjacji
    const kwzdShare = isNegocjacje ? totalPaid * NEGOCJACJE_REVENUE_SPLIT.kwzd : totalPaid;
    const partnerShare = isNegocjacje ? totalPaid * NEGOCJACJE_REVENUE_SPLIT.partner : 0;
    const kwzdThisMonth = isNegocjacje ? thisMonthPaid * NEGOCJACJE_REVENUE_SPLIT.kwzd : thisMonthPaid;
    const partnerThisMonth = isNegocjacje ? thisMonthPaid * NEGOCJACJE_REVENUE_SPLIT.partner : 0;

    return {
      totalPaid, thisMonthPaid, lastMonthPaid, thisMonthExpected,
      thisMonthPending, thisMonthOverdue,
      totalPending, totalOverdue, monthChange,
      kwzdShare, partnerShare, kwzdThisMonth, partnerThisMonth
    };
  }, [allPayments, isNegocjacje]);

  // Koszty – filtrowanie po miesiącu i suma (tylko dla !isRestricted)
  const costsFilteredByMonth = useMemo(() => {
    if (isRestricted) return [];
    return costs.filter(c => (c.date || '').startsWith(costMonthFilter));
  }, [costs, costMonthFilter, isRestricted]);

  const costsTotalInMonth = useMemo(() => {
    return costsFilteredByMonth.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [costsFilteredByMonth]);

  const costsTotalAll = useMemo(() => {
    return costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [costs]);

  const handleAddCost = async (e) => {
    e.preventDefault();
    const amount = parseFloat(costForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await addDoc(collection(db, "costs"), {
      date: costForm.date,
      amount,
      category: costForm.category,
      description: (costForm.description || '').trim(),
      createdBy: currentUser,
      createdAt: serverTimestamp(),
    });
    setCostForm({ date: new Date().toISOString().slice(0, 10), amount: '', category: 'reklamy', description: '' });
    setShowCostModal(false);
  };

  const handleDeleteCost = async (costId) => {
    if (!window.confirm('Usunąć ten koszt z listy?')) return;
    await deleteDoc(doc(db, "costs", costId));
  };

  const getCostCategoryLabel = (categoryId) => {
    return COST_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId || 'Inne';
  };

  // Presety dat
  const applyPreset = (preset) => {
    const now = new Date();
    switch (preset) {
      case 'all':
        setDateRange({ from: null, to: null });
        setViewMode('all');
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        setViewMode('thisMonth');
        break;
      case 'last3Months':
        setDateRange({ from: addDays(now, -90), to: now });
        setViewMode('last3Months');
        break;
      case 'thisYear':
        setDateRange({ from: new Date(now.getFullYear(), 0, 1), to: now });
        setViewMode('thisYear');
        break;
      default:
        break;
    }
  };

  // Status płatności
  const getPaymentStatus = (payment) => {
    if (payment.status === 'opłacone') {
      return { label: 'Opłacone', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    }
    const days = daysUntil(payment.dueDate);
    if (days < 0) {
      return { label: `Zaległe`, color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
    }
    if (days === 0) {
      return { label: 'Dziś', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    }
    if (days <= 7) {
      return { label: `Za ${days} dni`, color: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-400' };
    }
    return { label: `Za ${days} dni`, color: 'bg-stone-50 text-stone-600 border-stone-200', dot: 'bg-stone-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'overdue', label: 'Zaległe', badge: allPayments.filter(p => p.status !== 'opłacone' && daysUntil(p.dueDate) < 0).length },
    { id: 'upcoming', label: 'Nadchodzące', badge: allPayments.filter(p => p.status !== 'opłacone' && daysUntil(p.dueDate) >= 0 && daysUntil(p.dueDate) <= 7).length },
    ...(!isRestricted ? [{ id: 'costs', label: 'Koszty' }] : []),
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-semibold text-stone-900">Finanse</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${deptConfig.color}`}>
            {deptConfig.icon} {deptConfig.label}
          </span>
        </div>
        <p className="text-stone-500 mt-1 text-sm">Przegląd płatności i przychodów — {deptConfig.label}</p>
      </div>

      {/* Ten miesiąc */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Ten miesiąc</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-stone-500 mb-1">Oczekiwane wpłaty</p>
            <p className="text-2xl font-semibold text-stone-900">{formatPLN(stats.thisMonthExpected)}</p>
          </div>
          <div>
            <p className="text-sm text-stone-500 mb-1">Zebrano</p>
            <p className="text-2xl font-semibold text-emerald-600">{formatPLN(stats.thisMonthPaid)}</p>
            {stats.thisMonthExpected > 0 && (
              <div className="mt-2">
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (stats.thisMonthPaid / stats.thisMonthExpected) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  {Math.round((stats.thisMonthPaid / stats.thisMonthExpected) * 100)}% celu
                </p>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-stone-500 mb-1">Do zebrania</p>
            <p className="text-2xl font-semibold text-amber-600">{formatPLN(stats.thisMonthPending)}</p>
          </div>
          <div>
            <p className="text-sm text-stone-500 mb-1">Zaległe (ten mies.)</p>
            <p className={`text-2xl font-semibold ${stats.thisMonthOverdue > 0 ? 'text-red-600' : 'text-stone-900'}`}>
              {formatPLN(stats.thisMonthOverdue)}
            </p>
          </div>
        </div>
      </div>

      {/* Podział finansowy */}
      <div className={`grid grid-cols-1 ${isNegocjacje ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 mb-6`}>
        {/* Przychód KWZD */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${isNegocjacje ? 'bg-violet-500' : 'bg-blue-500'}`}></div>
            <h3 className="text-sm font-semibold text-stone-700">
              {isNegocjacje ? `Przychód KWZD (${Math.round(NEGOCJACJE_REVENUE_SPLIT.kwzd * 100)}%)` : 'Przychód'}
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">Wpłacono</span>
              <span className="text-sm font-semibold text-stone-900">{formatPLN(stats.kwzdShare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">Ten miesiąc</span>
              <span className="text-sm font-semibold text-emerald-600">{formatPLN(stats.kwzdThisMonth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">Oczekuje</span>
              <span className="text-sm font-semibold text-stone-600">{formatPLN(stats.totalPending)}</span>
            </div>
          </div>
        </div>

        {/* Udział partnera – tylko negocjacje */}
        {isNegocjacje && (
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <h3 className="text-sm font-semibold text-stone-700">Kancelaria partnerska ({Math.round(NEGOCJACJE_REVENUE_SPLIT.partner * 100)}%)</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-stone-400">Wpłacono</span>
                <span className="text-sm font-semibold text-stone-900">{formatPLN(stats.partnerShare)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-stone-400">Ten miesiąc</span>
                <span className="text-sm font-semibold text-emerald-600">{formatPLN(stats.partnerThisMonth)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Ogółem */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-stone-400"></div>
            <h3 className="text-sm font-semibold text-stone-700">Ogółem (brutto)</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">Wpłacono łącznie</span>
              <span className="text-sm font-semibold text-stone-900">{formatPLN(stats.totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">Oczekuje łącznie</span>
              <span className="text-sm font-semibold text-stone-600">{formatPLN(stats.totalPending)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">Zaległe łącznie</span>
              <span className={`text-sm font-semibold ${stats.totalOverdue > 0 ? 'text-red-600' : 'text-stone-600'}`}>{formatPLN(stats.totalOverdue)}</span>
            </div>
            {stats.monthChange !== 0 && (
              <p className={`text-xs pt-1 border-t border-stone-100 ${stats.monthChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {stats.monthChange > 0 ? '↑' : '↓'} {Math.abs(stats.monthChange)}% vs poprzedni miesiąc
              </p>
            )}
          </div>
        </div>
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
            {tab.badge > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 md:p-6">

          {/* Filtry dat */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {[
              { id: 'all', label: 'Wszystko' },
              { id: 'thisMonth', label: 'Ten miesiąc' },
              { id: 'last3Months', label: 'Ostatnie 3 mies.' },
              { id: 'thisYear', label: 'Ten rok' },
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === preset.id
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <div className="hidden sm:flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={dateRange.from ? dateRange.from.toISOString().slice(0, 10) : ''}
                onChange={(e) => {
                  setDateRange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : null });
                  setViewMode('custom');
                }}
                className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
              />
              <span className="text-stone-400">—</span>
              <input
                type="date"
                value={dateRange.to ? dateRange.to.toISOString().slice(0, 10) : ''}
                onChange={(e) => {
                  setDateRange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : null });
                  setViewMode('custom');
                }}
                className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>

          {/* Timeline */}
          {groupedPayments.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              Brak płatności w wybranym okresie
            </div>
          ) : (
            <div className="relative">
              {/* Linia osi czasu */}
              <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-stone-200"></div>

              {groupedPayments.map((group, groupIdx) => (
                <div key={group.key} className="relative pl-12 md:pl-20 pb-8">

                  {/* Marker miesiąca */}
                  <div className="absolute left-2 md:left-6 top-0 w-5 h-5 rounded-full bg-stone-900 border-4 border-white shadow"></div>

                  {/* Header miesiąca */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <h3 className="text-lg font-semibold text-stone-900 capitalize">{group.label}</h3>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="text-stone-500">
                        Oczekiwane: <strong className="text-stone-700">{formatPLN(group.totalDue)}</strong>
                      </span>
                      <span className="text-emerald-600">
                        Wpłacono: <strong>{formatPLN(group.totalPaid)}</strong>
                      </span>
                      {group.totalOverdue > 0 && (
                        <span className="text-red-600">
                          Zaległe: <strong>{formatPLN(group.totalOverdue)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Płatności w miesiącu */}
                  <div className="space-y-3">
                    {group.payments.map((payment) => {
                      const status = getPaymentStatus(payment);
                      return (
                        <Link
                          key={payment.id}
                          to={`/crm/${department}/klienci/${payment.clientId}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Dot statusu */}
                            <div className={`w-3 h-3 rounded-full ${status.dot} flex-shrink-0`}></div>

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-stone-900">{payment.clientName}</p>
                                {payment.serviceType && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    payment.serviceType === 'negocjacje'
                                      ? 'bg-violet-100 text-violet-700'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}>
                                    {SERVICE_TYPES[payment.serviceType]?.shortLabel || payment.serviceType}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-stone-500">
                                {formatDate(payment.dueDate)}
                                {payment.notes && ` • ${payment.notes}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 ml-7 sm:ml-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                              {status.label}
                            </span>
                            <span className="text-lg font-semibold text-stone-900">
                              {formatPLN(payment.amount)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Zaległe */}
      {activeTab === 'overdue' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 md:p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Zaległe płatności</h3>

          {(() => {
            const overdue = allPayments
              .filter(p => p.status !== 'opłacone' && daysUntil(p.dueDate) < 0)
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            if (overdue.length === 0) {
              return (
                <div className="text-center py-12 text-stone-400">
                  Brak zaległych płatności
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {overdue.map((payment) => {
                  const daysOverdue = Math.abs(daysUntil(payment.dueDate));
                  return (
                    <Link
                      key={payment.id}
                      to={`/crm/${department}/klienci/${payment.clientId}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-stone-900">{payment.clientName}</p>
                          <p className="text-sm text-red-600">
                            Termin: {formatDate(payment.dueDate)} ({daysOverdue} dni temu)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-14 sm:ml-0">
                        <span className="text-lg font-semibold text-red-700">
                          {formatPLN(payment.amount)}
                        </span>
                        <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: Nadchodzące */}
      {activeTab === 'upcoming' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 md:p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Nadchodzące płatności (7 dni)</h3>

          {(() => {
            const upcoming = allPayments
              .filter(p => p.status !== 'opłacone' && daysUntil(p.dueDate) >= 0 && daysUntil(p.dueDate) <= 7)
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            if (upcoming.length === 0) {
              return (
                <div className="text-center py-12 text-stone-400">
                  Brak nadchodzących płatności w ciągu 7 dni
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {upcoming.map((payment) => {
                  const days = daysUntil(payment.dueDate);
                  const status = getPaymentStatus(payment);
                  return (
                    <Link
                      key={payment.id}
                      to={`/crm/${department}/klienci/${payment.clientId}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          days === 0 ? 'bg-amber-100' : 'bg-stone-100'
                        }`}>
                          <svg className={`w-5 h-5 ${days === 0 ? 'text-amber-600' : 'text-stone-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-stone-900">{payment.clientName}</p>
                          <p className="text-sm text-stone-500">
                            {formatDate(payment.dueDate)}
                            {payment.notes && ` • ${payment.notes}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-14 sm:ml-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-lg font-semibold text-stone-900">
                          {formatPLN(payment.amount)}
                        </span>
                        <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: Koszty – tylko dla zwykłych użytkowników */}
      {!isRestricted && activeTab === 'costs' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-stone-900">Łączne koszty</h3>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-stone-500">Miesiąc:</label>
              <input
                type="month"
                value={costMonthFilter}
                onChange={(e) => setCostMonthFilter(e.target.value)}
                className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
              />
              <button
                onClick={() => setShowCostModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-medium text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Dodaj koszt
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-sm text-amber-800 mb-1">Wydatki w wybranym miesiącu</p>
              <p className="text-2xl font-semibold text-amber-900">{formatPLN(costsTotalInMonth)}</p>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
              <p className="text-sm text-stone-500 mb-1">Łącznie wszystkie koszty</p>
              <p className="text-2xl font-semibold text-stone-900">{formatPLN(costsTotalAll)}</p>
            </div>
          </div>

          {costsFilteredByMonth.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              Brak kosztów w wybranym miesiącu. Kliknij „Dodaj koszt”, aby dodać wpis.
            </div>
          ) : (
            <div className="space-y-2">
              {costsFilteredByMonth.map((cost) => (
                <div
                  key={cost.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{getCostCategoryLabel(cost.category)}</p>
                      <p className="text-sm text-stone-500">
                        {formatDate(cost.date)}
                        {cost.description && ` • ${cost.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-14 sm:ml-0">
                    <span className="text-lg font-semibold text-stone-900">{formatPLN(cost.amount)}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCost(cost.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Usuń koszt"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Dodaj koszt */}
      {!isRestricted && showCostModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCostModal(false)} />
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div
              className="relative bg-white rounded-xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-semibold text-stone-900">Dodaj koszt</h2>
                <p className="text-sm text-stone-500 mt-1">Wpisz kwotę, datę płatności i na co</p>
              </div>
              <form onSubmit={handleAddCost}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Data płatności *</label>
                    <input
                      type="date"
                      required
                      value={costForm.date}
                      onChange={(e) => setCostForm({ ...costForm, date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Kwota (PLN) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={costForm.amount}
                      onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Kategoria *</label>
                    <select
                      value={costForm.category}
                      onChange={(e) => setCostForm({ ...costForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-stone-400"
                    >
                      {COST_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Opis (opcjonalnie)</label>
                    <input
                      type="text"
                      value={costForm.description}
                      onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                      placeholder="np. Meta Ads – luty, list polecony do sądu"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-stone-200 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCostModal(false)}
                    className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 font-medium"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-medium"
                  >
                    Dodaj
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

export default Finances;