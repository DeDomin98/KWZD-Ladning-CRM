import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatDate, getDaysInMonth, getFirstDayOfMonth, addDays, daysUntil } from "../../../lib/utils";
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from "../../../hooks/useAuth";

// ===== Icons =====
const PhoneIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
);
const CheckIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);
const BellIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
);

// ===== Mini Calendar (for navigation) =====
const MiniCalendar = ({ currentDate, setCurrentDate, selectedDate, onSelectDate, getEventCountForDay }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(month, year);
  const firstDayOfMonth = getFirstDayOfMonth(month, year);
  const today = new Date();
  const weekDays = ['Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'So', 'Nd'];

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isSelected = (day) => {
    if (!selectedDate || !day) return false;
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 hover:bg-stone-100 rounded transition-colors">
          <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-semibold text-stone-900 capitalize">
          {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-stone-100 rounded transition-colors">
          <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-stone-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const count = getEventCountForDay(day);
          return (
            <button
              key={i}
              onClick={() => onSelectDate(new Date(year, month, day))}
              className={`relative w-full aspect-square flex items-center justify-center text-xs rounded-lg transition-colors ${
                isSelected(day) ? 'bg-stone-900 text-white font-bold' :
                isToday(day) ? 'bg-blue-100 text-blue-700 font-semibold' :
                count > 0 ? 'hover:bg-stone-100 text-stone-900 font-medium' :
                'hover:bg-stone-50 text-stone-400'
              }`}
            >
              {day}
              {count > 0 && !isSelected(day) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ===== Day Agenda Section =====
const DayAgenda = ({ dateStr, label, contacts, clientReminders, reminders, department, onCompleteReminder, onDismiss, isOverdue, isContactedFn }) => {
  const total = contacts.length + clientReminders.length + reminders.length;
  if (total === 0) return null;

  return (
    <div className="mb-6" id={`day-${dateStr}`}>
      {/* Date header */}
      <div className="flex items-center gap-3 mb-3 sticky top-0 bg-stone-100 py-2 z-10">
        <h3 className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-stone-900'}`}>{label}</h3>
        <div className="flex-1 h-px bg-stone-200" />
        <div className="flex items-center gap-2">
          {contacts.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              <PhoneIcon className="w-3 h-3" />{contacts.length}
            </span>
          )}
          {clientReminders.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              <CheckIcon className="w-3 h-3" />{clientReminders.length}
            </span>
          )}
          {reminders.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
              <BellIcon className="w-3 h-3" />{reminders.length}
            </span>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="space-y-1.5">
        {contacts.map(lead => {
          const done = isContactedFn?.(lead, dateStr);
          return (
            <div key={`c-${lead.id}`} className="relative group/item">
              <Link
                to={`/crm/${department}/leady/${lead.id}`}
                state={{ from: 'calendar' }}
                className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border transition-all group ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-stone-100 hover:border-amber-200 hover:shadow-sm'}`}
              >
                {done ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                    <PhoneIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${done ? 'text-emerald-700 line-through' : 'text-stone-900'}`}>{lead.name}</p>
                  <p className="text-[11px] text-stone-400">{done ? 'Skontaktowano' : `Kontakt z leadem${lead.assignedTo ? ` — ${lead.assignedTo}` : ''}`}</p>
                </div>
                {done ? (
                  <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">OK</span>
                ) : (
                  <svg className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                )}
              </Link>
              {onDismiss && !done && (
                <button
                  onClick={() => onDismiss(lead.id, 'lead')}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-300 opacity-0 group-hover/item:opacity-100 transition-all shadow-sm"
                  title="Usun z kalendarza"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          );
        })}

        {clientReminders.map(lead => {
          const done = isContactedFn?.(lead, dateStr);
          return (
            <div key={`cr-${lead.id}`} className="relative group/item">
              <Link
                to={`/crm/${department}/klienci/${lead.id}`}
                state={{ from: 'calendar' }}
                className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border transition-all group ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-stone-100 hover:border-emerald-200 hover:shadow-sm'}`}
              >
                {done ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${done ? 'text-emerald-700 line-through' : 'text-stone-900'}`}>{lead.name}</p>
                  <p className="text-[11px] text-stone-400">{done ? 'Skontaktowano' : `Kontakt kontrolny${lead.assignedTo ? ` — ${lead.assignedTo}` : ''}`}</p>
                </div>
                {done ? (
                  <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">OK</span>
                ) : (
                  <svg className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                )}
              </Link>
              {onDismiss && !done && (
                <button
                  onClick={() => onDismiss(lead.id, 'client')}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-300 opacity-0 group-hover/item:opacity-100 transition-all shadow-sm"
                  title="Usun z kalendarza"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          );
        })}

        {reminders.map(r => (
          <div
            key={`r-${r.id}`}
            className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-stone-100 transition-all ${r.isCompleted ? 'opacity-50' : 'hover:border-violet-200 hover:shadow-sm'}`}
          >
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
              <BellIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${r.isCompleted ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{r.title}</p>
              <p className="text-[11px] text-stone-400">
                {r.isCompleted ? 'Wykonane' : 'Przypomnienie'}{r.createdBy ? ` — ${r.createdBy}` : ''}
              </p>
            </div>
            {!r.isCompleted && (
              <button
                onClick={() => onCompleteReminder(r.id, r)}
                className="p-2 hover:bg-emerald-50 rounded-lg transition-colors group"
                title="Oznacz jako wykonane"
              >
                <CheckIcon className="w-4 h-4 text-stone-300 group-hover:text-emerald-600" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== Main Calendar =====
const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('cal_viewMode') || 'grid');
  const [filterMode, setFilterMode] = useState(() => localStorage.getItem('cal_filterMode') || 'my');
  const [selectedGridDay, setSelectedGridDay] = useState(new Date().getDate());

  const handleViewMode = (mode) => { setViewMode(mode); localStorage.setItem('cal_viewMode', mode); };
  const handleFilterMode = (mode) => { setFilterMode(mode); localStorage.setItem('cal_filterMode', mode); window.dispatchEvent(new Event('calFilterChanged')); };

  const { displayName: currentUser, isRestricted, userData } = useAuth();
  const location = useLocation();
  const department = location.pathname.split('/')[2];

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString().slice(0, 10);

  useEffect(() => {
    const unsubReminders = onSnapshot(collection(db, "reminders"), (snapshot) => {
      setReminders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubLeads = onSnapshot(collection(db, "leads"), (snapshot) => {
      setLeads(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => { unsubReminders(); unsubLeads(); };
  }, []);

  // My name for filtering
  const myName = userData?.displayName || currentUser;

  // Filtered data: "my" or "all"
  const filteredLeads = useMemo(() => {
    if (filterMode === 'all' && !isRestricted) return leads;
    return leads.filter(l => l.assignedTo === myName);
  }, [leads, filterMode, isRestricted, myName]);

  const myLeadIds = useMemo(() => new Set(filteredLeads.map(l => l.id)), [filteredLeads]);

  const filteredReminders = useMemo(() => {
    if (filterMode === 'all' && !isRestricted) return reminders;
    return reminders.filter(r => {
      if (r.leadId && myLeadIds.has(r.leadId)) return true;
      return r.createdBy === myName;
    });
  }, [reminders, filterMode, isRestricted, myLeadIds, myName]);

  // Get events for a specific date string (YYYY-MM-DD)
  const getEventsForDateStr = (dateStr) => {
    const contacts = filteredLeads.filter(l => {
      if (!l.nextContactDate || l.status === 'klient' || l.status === 'spalony') return false;
      return new Date(l.nextContactDate).toISOString().slice(0, 10) === dateStr;
    });
    const clientReminders = filteredLeads.filter(l => {
      if (!l.nextReminderDate || l.status !== 'klient') return false;
      return new Date(l.nextReminderDate).toISOString().slice(0, 10) === dateStr;
    });
    const dayReminders = filteredReminders.filter(r => {
      const rDate = r.date?.seconds ? new Date(r.date.seconds * 1000) : new Date(r.date);
      return rDate.toISOString().slice(0, 10) === dateStr;
    });
    return { contacts, clientReminders, reminders: dayReminders };
  };

  // Check if a lead was contacted on a given date
  const isContactedOnDate = (lead, dateStr) => {
    if (!lead.lastContactDate) return false;
    try {
      return new Date(lead.lastContactDate).toISOString().slice(0, 10) === dateStr;
    } catch { return false; }
  };

  // Event count for mini calendar
  const getEventCountForDay = (day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const ev = getEventsForDateStr(dateStr);
    return ev.contacts.length + ev.clientReminders.length + ev.reminders.length;
  };

  // Dismiss overdue contact (clear nextContactDate or nextReminderDate)
  const handleDismissContact = async (leadId, type) => {
    const field = type === 'client' ? 'nextReminderDate' : 'nextContactDate';
    await updateDoc(doc(db, "leads", leadId), { [field]: null });
  };

  // Complete reminder
  const handleCompleteReminder = async (reminderId, reminder) => {
    await updateDoc(doc(db, "reminders", reminderId), {
      isCompleted: true, completedAt: new Date().toISOString(), completedBy: currentUser
    });
    if (reminder.repeatDays && reminder.leadId) {
      const nextDate = addDays(new Date(), reminder.repeatDays);
      await addDoc(collection(db, "reminders"), {
        leadId: reminder.leadId, type: reminder.type, title: reminder.title,
        date: nextDate.toISOString(), isAutomatic: true, repeatDays: reminder.repeatDays,
        isCompleted: false, createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "leads", reminder.leadId), { nextReminderDate: nextDate.toISOString() });
    }
  };

  // ===== Agenda data: build list of days with events =====
  const agendaDays = useMemo(() => {
    // Collect all unique dates with events
    const dateMap = {};

    filteredLeads.forEach(l => {
      if (l.nextContactDate && l.status !== 'klient' && l.status !== 'spalony') {
        const ds = new Date(l.nextContactDate).toISOString().slice(0, 10);
        if (!dateMap[ds]) dateMap[ds] = { contacts: [], clientReminders: [], reminders: [] };
        dateMap[ds].contacts.push(l);
      }
      if (l.nextReminderDate && l.status === 'klient') {
        const ds = new Date(l.nextReminderDate).toISOString().slice(0, 10);
        if (!dateMap[ds]) dateMap[ds] = { contacts: [], clientReminders: [], reminders: [] };
        dateMap[ds].clientReminders.push(l);
      }
    });

    filteredReminders.filter(r => !r.isCompleted).forEach(r => {
      const rDate = r.date?.seconds ? new Date(r.date.seconds * 1000) : new Date(r.date);
      const ds = rDate.toISOString().slice(0, 10);
      if (!dateMap[ds]) dateMap[ds] = { contacts: [], clientReminders: [], reminders: [] };
      dateMap[ds].reminders.push(r);
    });

    // Sort by date
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, events]) => ({
        dateStr,
        ...events,
        isOverdue: dateStr < todayStr,
        isToday: dateStr === todayStr,
      }));
  }, [filteredLeads, filteredReminders, todayStr]);

  // Split into overdue / today / upcoming (hide overdue older than 7 days)
  const overdueDays = agendaDays.filter(d => d.isOverdue && d.dateStr >= oneWeekAgoStr);
  const todayAgenda = agendaDays.find(d => d.isToday);
  const upcomingDays = agendaDays.filter(d => !d.isOverdue && !d.isToday);

  // Stats
  const totalOverdue = overdueDays.reduce((sum, d) => sum + d.contacts.length + d.clientReminders.length + d.reminders.length, 0);
  const totalToday = todayAgenda ? todayAgenda.contacts.length + todayAgenda.clientReminders.length + todayAgenda.reminders.length : 0;
  const totalUpcoming = upcomingDays.reduce((sum, d) => sum + d.contacts.length + d.clientReminders.length + d.reminders.length, 0);

  const formatDayLabel = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    if (dateStr === todayStr) return 'Dzisiaj';
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Wczoraj';
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().slice(0, 10)) return 'Jutro';
    return date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // ===== Grid view helpers =====
  const gridYear = currentDate.getFullYear();
  const gridMonth = currentDate.getMonth();
  const gridDaysInMonth = getDaysInMonth(gridMonth, gridYear);
  const gridFirstDay = getFirstDayOfMonth(gridMonth, gridYear);
  const weekDays = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Nd'];

  const gridCells = [];
  for (let i = 0; i < gridFirstDay; i++) gridCells.push(null);
  for (let d = 1; d <= gridDaysInMonth; d++) gridCells.push(d);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Kalendarz</h1>
          <p className="text-stone-500 mt-1 text-sm">Przypomnienia i zaplanowane kontakty</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter toggle */}
          {!isRestricted && (
            <div className="flex bg-stone-100 rounded-lg p-0.5">
              <button
                onClick={() => handleFilterMode('my')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterMode === 'my' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Moje
              </button>
              <button
                onClick={() => handleFilterMode('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterMode === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Wszystkie
              </button>
            </div>
          )}

          {/* View toggle */}
          <div className="flex bg-stone-100 rounded-lg p-0.5">
            <button
              onClick={() => handleViewMode('agenda')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'agenda' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Lista
            </button>
            <button
              onClick={() => handleViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Siatka
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Dodaj
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {totalOverdue > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm font-semibold text-red-700">{totalOverdue}</span>
            <span className="text-sm text-red-600">zaległych</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-semibold text-blue-700">{totalToday}</span>
          <span className="text-sm text-blue-600">dzisiaj</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-stone-400" />
          <span className="text-sm font-semibold text-stone-700">{totalUpcoming}</span>
          <span className="text-sm text-stone-500">nadchodzących</span>
        </div>
      </div>

      {/* ===== AGENDA VIEW ===== */}
      {viewMode === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Agenda list */}
          <div className="lg:col-span-3">
            {agendaDays.length === 0 ? (
              <div className="bg-white rounded-xl border border-stone-200 p-16 text-center">
                <p className="text-stone-400 text-sm">Brak zaplanowanych zadań</p>
              </div>
            ) : (
              <>
                {/* Overdue section */}
                {overdueDays.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h2 className="text-base font-bold text-red-700">Zaległe</h2>
                    </div>
                    {overdueDays.map(day => (
                      <DayAgenda
                        key={day.dateStr}
                        dateStr={day.dateStr}
                        label={formatDayLabel(day.dateStr)}
                        contacts={day.contacts}
                        clientReminders={day.clientReminders}
                        reminders={day.reminders}
                        department={department}
                        onCompleteReminder={handleCompleteReminder}
                        onDismiss={handleDismissContact}
                        isContactedFn={isContactedOnDate}
                        isOverdue
                      />
                    ))}
                  </div>
                )}

                {/* Today */}
                {todayAgenda && (
                  <div className="mb-8">
                    <DayAgenda
                      dateStr={todayAgenda.dateStr}
                      label="Dzisiaj"
                      contacts={todayAgenda.contacts}
                      clientReminders={todayAgenda.clientReminders}
                      reminders={todayAgenda.reminders}
                      department={department}
                      onCompleteReminder={handleCompleteReminder}
                      onDismiss={handleDismissContact}
                      isContactedFn={isContactedOnDate}
                    />
                  </div>
                )}

                {/* Upcoming */}
                {upcomingDays.length > 0 && (
                  <div>
                    {upcomingDays.map(day => (
                      <DayAgenda
                        key={day.dateStr}
                        dateStr={day.dateStr}
                        label={formatDayLabel(day.dateStr)}
                        contacts={day.contacts}
                        clientReminders={day.clientReminders}
                        reminders={day.reminders}
                        department={department}
                        onCompleteReminder={handleCompleteReminder}
                        onDismiss={handleDismissContact}
                        isContactedFn={isContactedOnDate}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar - mini calendar */}
          <div className="space-y-4">
            <MiniCalendar
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              selectedDate={null}
              onSelectDate={(date) => {
                const ds = date.toISOString().slice(0, 10);
                const el = document.getElementById(`day-${ds}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              getEventCountForDay={getEventCountForDay}
            />

            {/* Legend */}
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h4 className="text-xs font-semibold text-stone-500 uppercase mb-3">Legenda</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center"><PhoneIcon className="w-3 h-3 text-amber-600" /></div>
                  <span className="text-xs text-stone-600">Kontakt z leadem</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center"><CheckIcon className="w-3 h-3 text-emerald-600" /></div>
                  <span className="text-xs text-stone-600">Kontakt kontrolny (klient)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center"><BellIcon className="w-3 h-3 text-violet-600" /></div>
                  <span className="text-xs text-stone-600">Przypomnienie ręczne</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== GRID VIEW ===== */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Month nav */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentDate(new Date(gridYear, gridMonth - 1, 1))} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-lg font-semibold text-stone-900 min-w-[200px] text-center capitalize">
                  {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => setCurrentDate(new Date(gridYear, gridMonth + 1, 1))} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">Dziś</button>
            </div>

            {/* Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-stone-400 uppercase py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {gridCells.map((day, idx) => {
                  if (day === null) return <div key={idx} className="h-20 bg-stone-50 rounded-lg" />;
                  const dateStr = `${gridYear}-${String(gridMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const ev = getEventsForDateStr(dateStr);
                  const total = ev.contacts.length + ev.clientReminders.length + ev.reminders.length;
                  const isToday = day === today.getDate() && gridMonth === today.getMonth() && gridYear === today.getFullYear();
                  const isSelected = selectedGridDay === day;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedGridDay(day)}
                      className={`h-20 p-1.5 rounded-lg border cursor-pointer transition-all overflow-hidden ${
                        isSelected ? 'border-stone-900 bg-stone-50' :
                        isToday ? 'border-blue-200 bg-blue-50' :
                        total > 0 ? 'border-transparent hover:border-stone-200 hover:bg-stone-50' :
                        'border-transparent hover:bg-stone-50'
                      }`}
                    >
                      <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-stone-700'}`}>{day}</div>
                      {total > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ev.contacts.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">{ev.contacts.length}</span>
                          )}
                          {ev.clientReminders.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">{ev.clientReminders.length}</span>
                          )}
                          {ev.reminders.filter(r => !r.isCompleted).length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">{ev.reminders.filter(r => !r.isCompleted).length}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected day detail */}
          <div className="space-y-4">
            {selectedGridDay ? (() => {
              const dateStr = `${gridYear}-${String(gridMonth + 1).padStart(2, '0')}-${String(selectedGridDay).padStart(2, '0')}`;
              const ev = getEventsForDateStr(dateStr);
              const total = ev.contacts.length + ev.clientReminders.length + ev.reminders.length;

              return (
                <div className="bg-white rounded-xl border border-stone-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-stone-900">
                      {selectedGridDay} {currentDate.toLocaleDateString('pl-PL', { month: 'long' })}
                    </h3>
                    <button onClick={() => setSelectedGridDay(null)} className="p-1 hover:bg-stone-100 rounded transition-colors">
                      <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {total === 0 ? (
                    <p className="text-sm text-stone-400">Brak zadań</p>
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {ev.contacts.map(lead => {
                        const done = isContactedOnDate(lead, dateStr);
                        return (
                          <div key={lead.id} className="relative group/item">
                            <Link to={`/crm/${department}/leady/${lead.id}`} state={{ from: 'calendar' }} className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-colors ${done ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-amber-50 hover:bg-amber-100'}`}>
                              {done ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                  <CheckIcon className="w-3 h-3 text-white" />
                                </div>
                              ) : (
                                <PhoneIcon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-medium truncate ${done ? 'text-emerald-700 line-through' : 'text-stone-900'}`}>{lead.name}</p>
                                <p className="text-[10px] text-stone-400">{done ? 'Skontaktowano' : (lead.assignedTo || 'Kontakt z leadem')}</p>
                              </div>
                              {done && <span className="text-[10px] font-medium text-emerald-600 flex-shrink-0">OK</span>}
                            </Link>
                            {!done && (
                              <button onClick={() => handleDismissContact(lead.id, 'lead')} className="absolute top-1 right-1 p-0.5 rounded-full bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-300 opacity-0 group-hover/item:opacity-100 transition-all shadow-sm" title="Usun z kalendarza">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {ev.clientReminders.map(lead => {
                        const done = isContactedOnDate(lead, dateStr);
                        return (
                          <div key={lead.id} className="relative group/item">
                            <Link to={`/crm/${department}/klienci/${lead.id}`} state={{ from: 'calendar' }} className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-colors ${done ? 'bg-emerald-50 hover:bg-emerald-100 opacity-75' : 'bg-emerald-50 hover:bg-emerald-100'}`}>
                              {done ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                  <CheckIcon className="w-3 h-3 text-white" />
                                </div>
                              ) : (
                                <CheckIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-medium truncate ${done ? 'text-emerald-700 line-through' : 'text-stone-900'}`}>{lead.name}</p>
                                <p className="text-[10px] text-stone-400">{done ? 'Skontaktowano' : (lead.assignedTo || 'Kontakt kontrolny')}</p>
                              </div>
                              {done && <span className="text-[10px] font-medium text-emerald-600 flex-shrink-0">OK</span>}
                            </Link>
                            {!done && (
                              <button onClick={() => handleDismissContact(lead.id, 'client')} className="absolute top-1 right-1 p-0.5 rounded-full bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-300 opacity-0 group-hover/item:opacity-100 transition-all shadow-sm" title="Usun z kalendarza">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {ev.reminders.filter(r => !r.isCompleted).map(r => (
                        <div key={r.id} className="flex items-center gap-2.5 p-2.5 bg-violet-50 rounded-lg">
                          <BellIcon className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-stone-900 truncate">{r.title}</p>
                            <p className="text-[10px] text-stone-400">{r.createdBy || 'Przypomnienie'}</p>
                          </div>
                          <button onClick={() => handleCompleteReminder(r.id, r)} className="p-1 hover:bg-emerald-100 rounded transition-colors">
                            <CheckIcon className="w-3 h-3 text-stone-400 hover:text-emerald-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="bg-white rounded-xl border border-stone-200 p-5 text-center">
                <p className="text-sm text-stone-400">Kliknij dzień w siatce</p>
              </div>
            )}

            {/* Legend */}
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h4 className="text-xs font-semibold text-stone-500 uppercase mb-3">Legenda</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">3</span>
                  <span className="text-xs text-stone-600">Kontakty z leadami</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">2</span>
                  <span className="text-xs text-stone-600">Kontakty kontrolne</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700">1</span>
                  <span className="text-xs text-stone-600">Przypomnienia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddReminderModal leads={leads} currentUser={currentUser} onClose={() => setShowAddModal(false)} onSuccess={() => setShowAddModal(false)} />
      )}
    </div>
  );
};

// Modal dodawania przypomnienia
const AddReminderModal = ({ leads, currentUser, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    leadId: '',
    type: 'reczne',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await addDoc(collection(db, "reminders"), {
        ...formData,
        date: new Date(formData.date).toISOString(),
        isCompleted: false,
        isAutomatic: false,
        repeatDays: null,
        createdBy: currentUser,
        createdAt: serverTimestamp()
      });
      onSuccess();
    } catch (error) {
      console.error("Błąd:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
          
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-semibold text-stone-900">Dodaj przypomnienie</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Tytuł *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors"
                  placeholder="np. Zadzwonić do klienta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Data *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Powiązany klient (opcjonalnie)
                </label>
                <select
                  value={formData.leadId}
                  onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors bg-white"
                >
                  <option value="">-- Brak --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Notatka
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors resize-none"
                  placeholder="Dodatkowe informacje..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Zapisywanie...' : 'Dodaj'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Calendar;