import React, { useState, useEffect } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatPLN, timeAgo, LEAD_STATUSES, DEPARTMENTS, SERVICE_TYPES, NEGOCJACJE_REVENUE_SPLIT } from "../../../lib/utils";
import { Link } from 'react-router-dom';
import { useAuth } from "../../../hooks/useAuth";

const DEPT_SERVICE_TYPES = {
  upadlosci: Object.entries(SERVICE_TYPES).filter(([, v]) => v.department === 'upadlosci').map(([k]) => k),
  negocjacje: Object.entries(SERVICE_TYPES).filter(([, v]) => v.department === 'negocjacje').map(([k]) => k),
};

const Dashboard = ({ department }) => {
  const { isRestricted, userData, isNegocjacjeOnly, departments } = useAuth();
  const [stats, setStats] = useState({
    todayLeads: 0,
    weekLeads: 0,
    monthLeads: 0,
    totalClients: 0,
    conversionRate: 0,
    expectedRevenue: 0,
    overduePayments: 0,
    monthRevenue: 0, 
    monthTarget: 0,  
    revenuePercentage: 0,
    // Per-department client counts
    upadlosciClients: 0,
    negocjacjeClients: 0,
    // Per-department revenue
    upadlosciRevenue: 0,
    negocjacjeRevenueBrutto: 0,
    negocjacjeRevenueKWZD: 0
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [department]);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(todayStart);
      monthStart.setDate(monthStart.getDate() - 30);
      
      // Do obliczania celu finansowego na TEN miesiąc kalendarzowy (np. Czerwiec 1-30)
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Pobierz wszystkie leady
      const leadsSnapshot = await getDocs(collection(db, "leads"));
      const allLeadsRaw = leadsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ograniczony pracownik widzi statystyki tylko dla swoich leadów.
      const allLeads = isRestricted
        ? allLeadsRaw.filter(l => l.assignedTo === (userData?.displayName || ''))
        : allLeadsRaw;

      // --- 1. TWOJA ORYGINALNA LOGIKA STATYSTYK ---
      // Filter by department
      const filteredLeads = allLeads.filter(l => {
        if (l.status === 'klient') {
          return DEPT_SERVICE_TYPES[department]?.includes(l.serviceType);
        }
        // Non-client leads: filter by qualifiedFor if set
        if (l.qualifiedFor) return l.qualifiedFor === department;
        return true; // unqualified leads visible in all views
      });

      const todayLeads = filteredLeads.filter(l => {
        const created = l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000) : null;
        return created && created >= todayStart;
      }).length;

      const weekLeads = filteredLeads.filter(l => {
        const created = l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000) : null;
        return created && created >= weekStart;
      }).length;

      const monthLeads = filteredLeads.filter(l => {
        const created = l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000) : null;
        return created && created >= monthStart;
      }).length;

      const clients = filteredLeads.filter(l => l.status === 'klient');
      const totalClients = clients.length;

      const closedLeads = filteredLeads.filter(l => l.status === 'klient' || l.status === 'spalony');
      const conversionRate = closedLeads.length > 0 
        ? Math.round((clients.length / closedLeads.length) * 100) 
        : 0;

      const expectedRevenue = clients.reduce((sum, c) => {
        return sum + (c.servicePrice || 0);
      }, 0);

      // --- 2. NOWA LOGIKA: CEL FINANSOWY (Płatności w tym miesiącu) ---
      let currentMonthTarget = 0;
      let currentMonthCollected = 0;

      clients.forEach(client => {
         if (client.payments && Array.isArray(client.payments)) {
            client.payments.forEach(payment => {
               if (payment.dueDate) {
                  const due = new Date(payment.dueDate);
                  // Sprawdź czy płatność wpada w obecny miesiąc kalendarzowy
                  if (due >= startOfCurrentMonth && due <= endOfCurrentMonth) {
                     const amount = parseFloat(payment.amount) || 0;
                     currentMonthTarget += amount;
                     
                     if (payment.status === 'opłacone') {
                        currentMonthCollected += amount;
                     }
                  }
               }
            });
         }
      });

      const revenuePercentage = currentMonthTarget > 0 
        ? Math.round((currentMonthCollected / currentMonthTarget) * 100) 
        : 0;

      // Ostatnie leady (Twoje sortowanie)
      const recent = filteredLeads
        .sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        })
        .slice(0, 5);

      // Per-department client counts (always from allLeads for admin summary)
      const allClients = allLeads.filter(l => l.status === 'klient');
      const upadlosciClients = allClients.filter(c => DEPT_SERVICE_TYPES.upadlosci.includes(c.serviceType)).length;
      const negocjacjeClients = allClients.filter(c => DEPT_SERVICE_TYPES.negocjacje.includes(c.serviceType)).length;

      // Per-department this-month revenue
      let upadlosciRevenue = 0;
      let negocjacjeRevenueBrutto = 0;
      allClients.forEach(client => {
        (client.payments || []).forEach(payment => {
          if (payment.dueDate && payment.status === 'opłacone') {
            const due = new Date(payment.dueDate);
            if (due >= startOfCurrentMonth && due <= endOfCurrentMonth) {
              const amt = parseFloat(payment.amount) || 0;
              if (DEPT_SERVICE_TYPES.negocjacje.includes(client.serviceType)) {
                negocjacjeRevenueBrutto += amt;
              } else {
                upadlosciRevenue += amt;
              }
            }
          }
        });
      });

      setStats({
        todayLeads,
        weekLeads,
        monthLeads,
        totalClients,
        conversionRate,
        expectedRevenue,
        overduePayments: 0,
        monthRevenue: currentMonthCollected,
        monthTarget: currentMonthTarget,
        revenuePercentage,
        upadlosciClients,
        negocjacjeClients,
        upadlosciRevenue,
        negocjacjeRevenueBrutto,
        negocjacjeRevenueKWZD: negocjacjeRevenueBrutto * NEGOCJACJE_REVENUE_SPLIT.kwzd
      });

      setRecentLeads(recent);
    } catch (error) {
      console.error("Błąd pobierania danych:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  // Obliczenie brakującej kwoty do wyświetlenia
  const missingRevenue = stats.monthTarget - stats.monthRevenue;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Pulpit</h1>
          <p className="text-stone-500 mt-1">
            {new Date().toLocaleDateString('pl-PL', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* --- NOWA SEKCJA: PROGRESS BAR (Wstawiona tutaj) --- */}
      <div className="bg-white rounded-xl p-6 border border-stone-200 mb-8 relative overflow-hidden shadow-sm">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-4">
            <div>
                <h2 className="text-lg font-bold text-stone-900">Cel miesięczny (Wpłaty)</h2>
                <p className="text-stone-500 text-sm mt-1">Realizacja płatności zaplanowanych na ten miesiąc</p>
            </div>
            <div className="text-right">
                <p className="text-3xl font-bold text-stone-900">{stats.revenuePercentage}%</p>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Wykonania planu</p>
            </div>
          </div>

          {/* Pasek */}
          <div className="h-5 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-100">
             <div 
                className={`h-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 ${
                    stats.revenuePercentage >= 100 ? 'bg-emerald-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${stats.revenuePercentage}%` }}
             >
             </div>
          </div>

          {/* Szczegóły liczbowe */}
          <div className="flex gap-8 mt-4 text-sm">
             <div>
                <span className="text-stone-500 block text-xs uppercase">Zebrano</span>
                <span className="font-bold text-emerald-600 text-lg">{formatPLN(stats.monthRevenue)}</span>
             </div>
             <div>
                <span className="text-stone-500 block text-xs uppercase">Cel całkowity</span>
                <span className="font-bold text-stone-900 text-lg">{formatPLN(stats.monthTarget)}</span>
             </div>
             {missingRevenue > 0 && (
                 <div>
                    <span className="text-stone-500 block text-xs uppercase">Brakuje</span>
                    <span className="font-bold text-amber-600 text-lg">{formatPLN(missingRevenue)}</span>
                 </div>
             )}
          </div>
        </div>
      </div>
      {/* --- KONIEC NOWEJ SEKCJI --- */}

      {/* KPI Cards (Twoje oryginalne) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Dzisiejsze leady */}
        <div className="bg-white rounded-xl p-6 border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-stone-500 text-sm font-medium">Dziś</span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-semibold text-stone-900">{stats.todayLeads}</div>
          <p className="text-stone-500 text-sm mt-1">nowych leadów</p>
        </div>

        {/* Tydzień */}
        <div className="bg-white rounded-xl p-6 border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-stone-500 text-sm font-medium">Ostatnie 7 dni</span>
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-semibold text-stone-900">{stats.weekLeads}</div>
          <p className="text-stone-500 text-sm mt-1">leadów w tygodniu</p>
        </div>

        {/* Konwersja */}
        <div className="bg-white rounded-xl p-6 border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-stone-500 text-sm font-medium">Konwersja</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-semibold text-stone-900">{stats.conversionRate}%</div>
          <p className="text-stone-500 text-sm mt-1">leadów → klientów</p>
        </div>

        {/* Przychody */}
        <div className="bg-white rounded-xl p-6 border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-stone-500 text-sm font-medium">Przychody</span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-semibold text-stone-900">{formatPLN(stats.expectedRevenue)}</div>
          <p className="text-stone-500 text-sm mt-1">przewidywane</p>
        </div>
      </div>

      {/* Główna sekcja (Twoja oryginalna) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ostatnie leady */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">Ostatnie leady</h2>
            <Link to={`/crm/${department}/leady`} className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
              Zobacz wszystkie →
            </Link>
          </div>
          
          <div className="divide-y divide-stone-100">
            {recentLeads.length === 0 ? (
              <div className="px-6 py-12 text-center text-stone-400">
                Brak leadów do wyświetlenia
              </div>
            ) : (
              recentLeads.map((lead) => (
                <Link 
                  key={lead.id} 
                  to={`/crm/${department}/leady/${lead.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                      <span className="text-stone-600 font-medium text-sm">
                        {lead.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{lead.name}</p>
                      <p className="text-sm text-stone-500">{lead.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${LEAD_STATUSES[lead.status]?.color || 'bg-stone-100 text-stone-600'}`}>
                      {LEAD_STATUSES[lead.status]?.label || lead.status}
                    </span>
                    <span className="text-sm text-stone-400">
                      {timeAgo(lead.createdAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Panel boczny */}
        <div className="space-y-6">
          
          {/* Podsumowanie */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="font-semibold text-stone-900 mb-4">Podsumowanie</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Wszystkich klientów</span>
                <span className="font-semibold text-stone-900">{stats.totalClients}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Leadów (30 dni)</span>
                <span className="font-semibold text-stone-900">{stats.monthLeads}</span>
              </div>
              <div className="h-px bg-stone-100"></div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Do kontaktu dziś</span>
                <span className="font-semibold text-amber-600">—</span>
              </div>
            </div>
          </div>

          {/* Szybkie akcje */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="font-semibold text-stone-900 mb-4">Szybkie akcje</h2>
            
            <div className="space-y-3">
              <Link 
                to={`/crm/${department}/leady`}
                className="w-full flex items-center gap-3 px-4 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="font-medium">Przejdź do leadów</span>
              </Link>
              
              <Link 
                to={`/crm/${department}/klienci`}
                className="w-full flex items-center gap-3 px-4 py-3 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium">Teczki klientów</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;