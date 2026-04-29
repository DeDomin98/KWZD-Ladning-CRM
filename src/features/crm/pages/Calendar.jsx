import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatDate, getDaysInMonth, getFirstDayOfMonth, addDays, daysUntil } from "../../../lib/utils";
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from "../../../hooks/useAuth";

// ===== Date helpers (LOCAL time, not UTC) =====
// Zwraca YYYY-MM-DD w lokalnym czasie (Polski). Naprawia bug off-by-one przy 22:00-2:00.
const toLocalDateStr = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const reminderDate = (r) => r?.date?.seconds ? new Date(r.date.seconds * 1000) : new Date(r?.date);
const startOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Pon = 0, Nd = 6
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
};
const addDaysLocal = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

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

        {reminders.map(r => {
          const rDate = r.date?.seconds ? new Date(r.date.seconds * 1000) : new Date(r.date);
          const timeStr = !isNaN(rDate) ? rDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
          const isCall = r.type === 'rozmowa';
          const isMeeting = r.type === 'spotkanie';
          const iconWrap = isCall
            ? 'bg-amber-100 text-amber-600'
            : isMeeting
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-violet-100 text-violet-600';
          const Ic = isCall ? PhoneIcon : isMeeting ? CheckIcon : BellIcon;
          const inner = (
            <>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconWrap}`}>
                <Ic className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {timeStr && (
                    <span className="text-[11px] font-mono font-semibold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded flex-shrink-0">
                      {timeStr}
                    </span>
                  )}
                  <p className={`text-sm font-medium truncate ${r.isCompleted ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{r.title}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {r.leadName && (
                    <span className="text-[11px] text-stone-500 truncate">{r.leadName}</span>
                  )}
                  {r.leadPhone && (
                    <span className="text-[11px] text-stone-500 font-mono">• {r.leadPhone}</span>
                  )}
                  {!r.leadName && (
                    <span className="text-[11px] text-stone-400">
                      {r.isCompleted ? 'Wykonane' : 'Przypomnienie'}{r.createdBy ? ` — ${r.createdBy}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </>
          );

          return (
            <div
              key={`r-${r.id}`}
              className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-stone-100 transition-all ${r.isCompleted ? 'opacity-50' : 'hover:border-violet-200 hover:shadow-sm'}`}
            >
              {r.leadId ? (
                <Link
                  to={`/crm/${department}/leady/${r.leadId}`}
                  state={{ from: 'calendar' }}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center gap-3 flex-1 min-w-0">{inner}</div>
              )}
              {!r.isCompleted && (
                <button
                  onClick={() => onCompleteReminder(r.id, r)}
                  className="p-2 hover:bg-emerald-50 rounded-lg transition-colors group flex-shrink-0"
                  title="Oznacz jako wykonane"
                >
                  <CheckIcon className="w-4 h-4 text-stone-300 group-hover:text-emerald-600" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===== Week View — siatka 7 dni × godziny =====
const WEEK_START_HOUR = 9;
const WEEK_END_HOUR = 20; // ekskluzywnie — pokazujemy 9:00–19:00 (11 wierszy)
const HOUR_PX = 44; // wysokosc 1h w pikselach (kompaktowa, aby zmiescic na ekranie)

// snap minutow do 15
const snapMinutes = (m) => Math.round(m / 15) * 15;

const WeekView = ({
  weekStart,
  setWeekStart,
  getEventsForDateStr,
  isContactedOnDate,
  handleCompleteReminder,
  handleDismissContact,
  department,
  onAddAt,
}) => {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDaysLocal(weekStart, i));
  }, [weekStart]);
  const todayStr = toLocalDateStr(new Date());
  const hours = useMemo(() => {
    const out = [];
    for (let h = WEEK_START_HOUR; h < WEEK_END_HOUR; h++) out.push(h);
    return out;
  }, []);

  const weekLabel = `${days[0].getDate()} ${days[0].toLocaleDateString('pl-PL', { month: 'short' })} – ${days[6].getDate()} ${days[6].toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })}`;

  const goPrev = () => setWeekStart(addDaysLocal(weekStart, -7));
  const goNext = () => setWeekStart(addDaysLocal(weekStart, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  // bieżący wskaźnik czasu (czerwona kreska)
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const nowHourFloat = now.getHours() + now.getMinutes() / 60;
  const nowVisible = nowHourFloat >= WEEK_START_HOUR && nowHourFloat < WEEK_END_HOUR;
  const nowTopPx = (nowHourFloat - WEEK_START_HOUR) * HOUR_PX;
  const nowDayIdx = days.findIndex(d => toLocalDateStr(d) === toLocalDateStr(now));

  // ===== Drag & Drop: przesuwanie kafelkow miedzy dniami/godzinami =====
  const [draggingId, setDraggingId] = useState(null);
  const [dragOver, setDragOver] = useState(null); // { dayIdx, topPx }

  const handleDragStart = (e, reminderId) => {
    setDraggingId(reminderId);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', reminderId); } catch { /* niektore przegladarki */ }
  };
  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOver(null);
  };
  const computeDropDate = (e, dayDate) => {
    const colEl = e.currentTarget;
    const rect = colEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hourFloat = WEEK_START_HOUR + y / HOUR_PX;
    let hour = Math.floor(hourFloat);
    let minute = snapMinutes((hourFloat - hour) * 60);
    if (minute === 60) { hour += 1; minute = 0; }
    if (hour < WEEK_START_HOUR) { hour = WEEK_START_HOUR; minute = 0; }
    if (hour >= WEEK_END_HOUR) { hour = WEEK_END_HOUR - 1; minute = 45; }
    const date = new Date(dayDate);
    date.setHours(hour, minute, 0, 0);
    return date;
  };
  const handleDragOverDay = (e, dayIdx, dayDate) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hourFloat = WEEK_START_HOUR + y / HOUR_PX;
    let hour = Math.floor(hourFloat);
    let minute = snapMinutes((hourFloat - hour) * 60);
    if (minute === 60) { hour += 1; minute = 0; }
    const topPx = ((hour - WEEK_START_HOUR) + minute / 60) * HOUR_PX;
    setDragOver({ dayIdx, topPx });
  };
  const handleDropOnDay = async (e, dayDate) => {
    if (!draggingId) return;
    e.preventDefault();
    const newDate = computeDropDate(e, dayDate);
    const id = draggingId;
    setDraggingId(null);
    setDragOver(null);
    try {
      await updateDoc(doc(db, 'reminders', id), { date: newDate.toISOString() });
    } catch (err) {
      console.error('Nie udalo sie przeniesc przypomnienia:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Pasek nawigacji */}
      <div className="px-4 sm:px-6 py-3 border-b border-stone-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-2 hover:bg-stone-100 rounded-lg transition-colors" title="Poprzedni tydzień">
            <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">Dziś</button>
          <button onClick={goNext} className="p-2 hover:bg-stone-100 rounded-lg transition-colors" title="Następny tydzień">
            <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <h2 className="text-sm sm:text-base font-semibold text-stone-900 capitalize">{weekLabel}</h2>
        <div className="text-[11px] text-stone-400 hidden sm:block">Czas: Europa/Warszawa</div>
      </div>

      {/* Nagłówek dni */}
      <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-stone-200 bg-stone-50 sticky top-0 z-20">
        <div />
        {days.map((d, i) => {
          const dStr = toLocalDateStr(d);
          const isToday = dStr === todayStr;
          const ev = getEventsForDateStr(dStr);
          const total = ev.contacts.length + ev.clientReminders.length + ev.reminders.filter(r => !r.isCompleted).length;
          const dayShort = d.toLocaleDateString('pl-PL', { weekday: 'short' });
          return (
            <div key={i} className={`px-2 py-2 text-center border-l border-stone-200 ${isToday ? 'bg-blue-50' : ''}`}>
              <div className={`text-[11px] uppercase font-semibold ${isToday ? 'text-blue-600' : 'text-stone-400'}`}>{dayShort}</div>
              <div className={`text-base font-bold ${isToday ? 'text-blue-700' : 'text-stone-900'}`}>{d.getDate()}</div>
              {total > 0 && (
                <div className="text-[10px] text-stone-500 mt-0.5">{total} {total === 1 ? 'zad.' : total < 5 ? 'zad.' : 'zad.'}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Siatka godzin */}
      <div className="overflow-y-auto max-h-[calc(100vh-240px)] relative">
        <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] relative" style={{ minHeight: hours.length * HOUR_PX }}>
          {/* Kolumna godzin */}
          <div className="relative">
            {hours.map(h => (
              <div key={h} className="border-b border-stone-100 text-[10px] text-stone-400 pr-1 text-right pt-0.5" style={{ height: HOUR_PX }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Kolumny dni */}
          {days.map((d, dayIdx) => {
            const dStr = toLocalDateStr(d);
            const ev = getEventsForDateStr(dStr);
            const isToday = dStr === todayStr;

            // Wszystkie wpisy z czasem (rozmowy/przypomnienia) — w tym wykonane (jako wyszarzone)
            const items = [];

            ev.reminders.forEach(r => {
              const rd = reminderDate(r);
              if (isNaN(rd)) return;
              const hourFloat = rd.getHours() + rd.getMinutes() / 60;
              if (hourFloat < WEEK_START_HOUR || hourFloat >= WEEK_END_HOUR) return;
              const isCall = r.type === 'rozmowa';
              const isMeeting = r.type === 'spotkanie';
              const completed = !!r.isCompleted;
              const tone = completed
                ? { bg: 'bg-stone-100 hover:bg-stone-200 border-stone-300', text: 'text-stone-500 line-through', accent: 'bg-stone-400' }
                : isCall
                  ? { bg: 'bg-amber-100 hover:bg-amber-200 border-amber-300', text: 'text-amber-900', accent: 'bg-amber-500' }
                  : isMeeting
                    ? { bg: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300', text: 'text-emerald-900', accent: 'bg-emerald-500' }
                    : { bg: 'bg-violet-100 hover:bg-violet-200 border-violet-300', text: 'text-violet-900', accent: 'bg-violet-500' };
              items.push({
                key: `r-${r.id}`,
                id: r.id,
                topPx: (hourFloat - WEEK_START_HOUR) * HOUR_PX,
                heightPx: 40,
                title: r.title,
                subtitle: [
                  rd.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                  r.leadName,
                  r.leadPhone,
                ].filter(Boolean).join(' • '),
                tone,
                completed,
                href: r.leadId ? `/crm/${department}/leady/${r.leadId}` : null,
                action: !completed ? () => handleCompleteReminder(r.id, r) : null,
                actionTitle: 'Oznacz jako wykonane',
                kind: isCall ? 'call' : isMeeting ? 'meeting' : 'note',
              });
            });

            // Kontakty bez godziny — strefa "cały dzień" pod nagłówkiem; tu pokażemy je o 8:00
            // ale lepiej w osobnej strefie — pominiemy w gridzie, pokażemy w nagłówku jako badge
            // (kontakty nie maja godziny, sa to pole nextContactDate jako data dnia)

            return (
              <div
                key={dayIdx}
                className={`relative border-l border-stone-200 ${isToday ? 'bg-blue-50/30' : ''} ${draggingId ? 'cursor-copy' : ''}`}
                onClick={(e) => {
                  // klik na pustą siatkę → otwórz modal z wybraną datą/godziną
                  if (e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top + e.currentTarget.scrollTop;
                  const hourFloat = WEEK_START_HOUR + y / HOUR_PX;
                  const hour = Math.floor(hourFloat);
                  const minute = Math.round((hourFloat - hour) * 4) * 15; // snap 15 min
                  const date = new Date(d);
                  date.setHours(hour, minute === 60 ? 0 : minute, 0, 0);
                  if (minute === 60) date.setHours(hour + 1, 0, 0, 0);
                  onAddAt?.(date);
                }}
                onDragOver={(e) => handleDragOverDay(e, dayIdx, d)}
                onDragLeave={() => { if (dragOver?.dayIdx === dayIdx) setDragOver(null); }}
                onDrop={(e) => handleDropOnDay(e, d)}
              >
                {/* Wskaznik miejsca upuszczenia */}
                {dragOver && dragOver.dayIdx === dayIdx && (
                  <div
                    className="absolute left-0.5 right-0.5 h-0.5 bg-blue-500 z-30 pointer-events-none rounded-full shadow"
                    style={{ top: dragOver.topPx }}
                  />
                )}
                {/* Linie godzin tła */}
                {hours.map(h => (
                  <div key={h} className="border-b border-stone-100 pointer-events-none" style={{ height: HOUR_PX }} />
                ))}

                {/* Kontakty/klientReminders bez godziny — chip na górze */}
                {(ev.contacts.length > 0 || ev.clientReminders.length > 0) && (
                  <div className="absolute top-0.5 left-1 right-1 flex flex-col gap-0.5 z-10 pointer-events-none">
                    {ev.contacts.slice(0, 2).map(l => {
                      const done = isContactedOnDate(l, dStr);
                      return (
                        <Link
                          key={`c-${l.id}`}
                          to={`/crm/${department}/leady/${l.id}`}
                          state={{ from: 'calendar' }}
                          className={`pointer-events-auto block text-[10px] px-1.5 py-0.5 rounded truncate ${done ? 'bg-emerald-100 text-emerald-700 line-through' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
                          title={`Kontakt z leadem: ${l.name}`}
                        >
                          ☎ {l.name}
                        </Link>
                      );
                    })}
                    {ev.contacts.length > 2 && (
                      <span className="text-[9px] text-stone-400 px-1">+{ev.contacts.length - 2}</span>
                    )}
                  </div>
                )}

                {/* Wydarzenia z godziną */}
                {items.map(it => {
                  const isDragging = draggingId === it.id;
                  const inner = (
                    <>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${it.tone.accent}`} />
                      <div className="pl-2 pr-1 py-0.5 h-full flex flex-col justify-center min-w-0">
                        <div className={`text-[11px] font-semibold truncate ${it.tone.text}`}>
                          {it.completed && <CheckIcon className="w-3 h-3 inline -mt-0.5 mr-0.5" />}
                          {it.title}
                        </div>
                        <div className="text-[9px] text-stone-600 truncate">{it.subtitle}</div>
                      </div>
                    </>
                  );
                  return (
                    <div
                      key={it.key}
                      draggable
                      onDragStart={(e) => handleDragStart(e, it.id)}
                      onDragEnd={handleDragEnd}
                      className={`absolute left-0.5 right-0.5 rounded border ${it.tone.bg} shadow-sm overflow-hidden transition-all group/ev select-none ${isDragging ? 'opacity-40 ring-2 ring-blue-400' : ''} ${it.completed ? 'opacity-70' : ''} cursor-grab active:cursor-grabbing`}
                      style={{ top: it.topPx, height: it.heightPx }}
                      title={`${it.title}${it.completed ? ' (wykonane)' : ''} — przeciagnij aby zmienic termin`}
                    >
                      {it.href ? (
                        <Link to={it.href} state={{ from: 'calendar' }} className="block relative h-full" draggable={false} onDragStart={(e) => e.preventDefault()}>
                          {inner}
                        </Link>
                      ) : (
                        <div className="relative h-full">{inner}</div>
                      )}
                      {it.action && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); it.action(); }}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded bg-white/70 hover:bg-white text-stone-500 hover:text-emerald-600 opacity-0 group-hover/ev:opacity-100 transition"
                          title={it.actionTitle}
                        >
                          <CheckIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Wskaźnik aktualnego czasu */}
                {nowVisible && nowDayIdx === dayIdx && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTopPx }}>
                    <div className="relative">
                      <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                      <div className="h-px bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
  const [prefillDate, setPrefillDate] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('cal_viewMode') || 'week');
  const [filterMode, setFilterMode] = useState(() => localStorage.getItem('cal_filterMode') || 'my');
  const [selectedGridDay, setSelectedGridDay] = useState(new Date().getDate());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const handleViewMode = (mode) => { setViewMode(mode); localStorage.setItem('cal_viewMode', mode); };
  const handleFilterMode = (mode) => { setFilterMode(mode); localStorage.setItem('cal_filterMode', mode); window.dispatchEvent(new Event('calFilterChanged')); };

  const { displayName: currentUser, isRestricted, userData } = useAuth();
  const location = useLocation();
  const department = location.pathname.split('/')[2];

  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = toLocalDateStr(oneWeekAgo);

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
      return toLocalDateStr(l.nextContactDate) === dateStr;
    });
    const clientReminders = filteredLeads.filter(l => {
      if (!l.nextReminderDate || l.status !== 'klient') return false;
      return toLocalDateStr(l.nextReminderDate) === dateStr;
    });
    const dayReminders = filteredReminders.filter(r => {
      const rDate = r.date?.seconds ? new Date(r.date.seconds * 1000) : new Date(r.date);
      return toLocalDateStr(rDate) === dateStr;
    });
    return { contacts, clientReminders, reminders: dayReminders };
  };

  // Check if a lead was contacted on a given date
  const isContactedOnDate = (lead, dateStr) => {
    if (!lead.lastContactDate) return false;
    try {
      return toLocalDateStr(lead.lastContactDate) === dateStr;
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
        const ds = toLocalDateStr(l.nextContactDate);
        if (!dateMap[ds]) dateMap[ds] = { contacts: [], clientReminders: [], reminders: [] };
        dateMap[ds].contacts.push(l);
      }
      if (l.nextReminderDate && l.status === 'klient') {
        const ds = toLocalDateStr(l.nextReminderDate);
        if (!dateMap[ds]) dateMap[ds] = { contacts: [], clientReminders: [], reminders: [] };
        dateMap[ds].clientReminders.push(l);
      }
    });

    filteredReminders.filter(r => !r.isCompleted).forEach(r => {
      const rDate = r.date?.seconds ? new Date(r.date.seconds * 1000) : new Date(r.date);
      const ds = toLocalDateStr(rDate);
      if (!dateMap[ds]) dateMap[ds] = { contacts: [], clientReminders: [], reminders: [] };
      dateMap[ds].reminders.push(r);
    });

    // Sort by date, and sort reminders within each day by time
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, events]) => ({
        dateStr,
        ...events,
        reminders: [...events.reminders].sort((a, b) => {
          const ta = a.date?.seconds ? a.date.seconds * 1000 : new Date(a.date).getTime();
          const tb = b.date?.seconds ? b.date.seconds * 1000 : new Date(b.date).getTime();
          return ta - tb;
        }),
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
    if (dateStr === toLocalDateStr(yesterday)) return 'Wczoraj';
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === toLocalDateStr(tomorrow)) return 'Jutro';
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
              onClick={() => handleViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Tydzień
            </button>
            <button
              onClick={() => handleViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Miesiąc
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
                const ds = toLocalDateStr(date);
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

      {/* ===== WEEK VIEW ===== */}
      {viewMode === 'week' && (
        <WeekView
          weekStart={weekStart}
          setWeekStart={setWeekStart}
          getEventsForDateStr={getEventsForDateStr}
          isContactedOnDate={isContactedOnDate}
          handleCompleteReminder={handleCompleteReminder}
          handleDismissContact={handleDismissContact}
          department={department}
          onAddAt={(date) => { setPrefillDate(date); setShowAddModal(true); }}
        />
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
                      {ev.reminders
                        .filter(r => !r.isCompleted)
                        .slice()
                        .sort((a, b) => {
                          const ta = a.date?.seconds ? a.date.seconds * 1000 : new Date(a.date).getTime();
                          const tb = b.date?.seconds ? b.date.seconds * 1000 : new Date(b.date).getTime();
                          return ta - tb;
                        })
                        .map(r => {
                          const rDate = r.date?.seconds ? new Date(r.date.seconds * 1000) : new Date(r.date);
                          const timeStr = !isNaN(rDate) ? rDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
                          const isCall = r.type === 'rozmowa';
                          const isMeeting = r.type === 'spotkanie';
                          const Ic = isCall ? PhoneIcon : isMeeting ? CheckIcon : BellIcon;
                          const tone = isCall
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                            : isMeeting
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                              : 'bg-violet-50 hover:bg-violet-100 text-violet-600';
                          const body = (
                            <>
                              <Ic className="w-3.5 h-3.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {timeStr && (
                                    <span className="text-[10px] font-mono font-semibold text-stone-700 bg-white/70 px-1 rounded flex-shrink-0">{timeStr}</span>
                                  )}
                                  <p className="text-xs font-medium text-stone-900 truncate">{r.title}</p>
                                </div>
                                {(r.leadName || r.leadPhone) ? (
                                  <p className="text-[10px] text-stone-500 truncate">
                                    {r.leadName}{r.leadPhone ? ` • ${r.leadPhone}` : ''}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-stone-400 truncate">{r.createdBy || 'Przypomnienie'}</p>
                                )}
                              </div>
                            </>
                          );
                          return (
                            <div key={r.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg ${tone}`}>
                              {r.leadId ? (
                                <Link
                                  to={`/crm/${department}/leady/${r.leadId}`}
                                  state={{ from: 'calendar' }}
                                  className="flex items-center gap-2.5 flex-1 min-w-0"
                                >
                                  {body}
                                </Link>
                              ) : (
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">{body}</div>
                              )}
                              <button onClick={() => handleCompleteReminder(r.id, r)} className="p-1 hover:bg-white/60 rounded transition-colors flex-shrink-0" title="Oznacz jako wykonane">
                                <CheckIcon className="w-3 h-3 text-stone-400 hover:text-emerald-600" />
                              </button>
                            </div>
                          );
                        })}
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
        <AddReminderModal
          leads={leads}
          currentUser={currentUser}
          prefillDate={prefillDate}
          onClose={() => { setShowAddModal(false); setPrefillDate(null); }}
          onSuccess={() => { setShowAddModal(false); setPrefillDate(null); }}
        />
      )}
    </div>
  );
};

// Modal dodawania przypomnienia / notatki / rozmowy
const REMINDER_TYPES = [
  { id: 'rozmowa', label: 'Rozmowa', icon: PhoneIcon, iconBg: 'bg-amber-100 text-amber-600', placeholder: 'np. Zadzwonić w sprawie umowy' },
  { id: 'notatka', label: 'Notatka', icon: BellIcon, iconBg: 'bg-violet-100 text-violet-600', placeholder: 'np. Sprawdzić dokumenty klienta' },
  { id: 'spotkanie', label: 'Spotkanie', icon: CheckIcon, iconBg: 'bg-emerald-100 text-emerald-600', placeholder: 'np. Spotkanie w kancelarii' },
];

const formatNowLocal = (offsetMinutes = 30) => {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ===== Intuicyjny picker daty + godziny =====
const DateTimePickerNice = ({ value, onChange }) => {
  // value w formacie "YYYY-MM-DDTHH:MM"
  const parsed = useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d) ? new Date() : d;
  }, [value]);

  const pad = (n) => String(n).padStart(2, '0');
  const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Szybkie dni: 7 dni od dzisiaj
  const quickDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDay = (d) => {
    const next = new Date(parsed);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    onChange(toStr(next));
  };
  const setHourMinute = (h, m) => {
    const next = new Date(parsed);
    next.setHours(h, m, 0, 0);
    onChange(toStr(next));
  };
  const dayLabel = (d) => {
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return 'Dziś';
    if (diff === 1) return 'Jutro';
    if (diff === 2) return 'Pojutrze';
    return d.toLocaleDateString('pl-PL', { weekday: 'short' });
  };
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // Sloty czasu — co 30 min od 7:00 do 20:30
  const timeSlots = useMemo(() => {
    const out = [];
    for (let h = 7; h <= 20; h++) {
      out.push({ h, m: 0 });
      out.push({ h, m: 30 });
    }
    return out;
  }, []);

  const currentH = parsed.getHours();
  const currentM = parsed.getMinutes();

  const fullDateLabel = parsed.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = `${pad(currentH)}:${pad(currentM)}`;

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">
        Data i godzina *
      </label>

      {/* Podsumowanie wyboru */}
      <div className="mb-3 px-4 py-3 bg-gradient-to-br from-stone-900 to-stone-700 text-white rounded-lg">
        <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Wybrany termin</div>
        <div className="flex items-baseline gap-3 mt-0.5 flex-wrap">
          <div className="text-base font-semibold capitalize">{fullDateLabel}</div>
          <div className="text-2xl font-bold font-mono tracking-tight">{timeLabel}</div>
        </div>
      </div>

      {/* Szybkie dni */}
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1.5">Dzień</div>
        <div className="grid grid-cols-7 gap-1">
          {quickDays.map((d, i) => {
            const active = isSameDay(d, parsed);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDay(d)}
                className={`flex flex-col items-center py-2 rounded-lg border-2 transition-all ${
                  active
                    ? 'border-stone-900 bg-stone-900 text-white shadow-md'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                }`}
              >
                <span className={`text-[10px] uppercase font-semibold ${active ? 'text-white/70' : 'text-stone-400'}`}>{dayLabel(d)}</span>
                <span className="text-base font-bold leading-none mt-0.5">{d.getDate()}</span>
                <span className={`text-[9px] mt-0.5 ${active ? 'text-white/60' : 'text-stone-400'}`}>{d.toLocaleDateString('pl-PL', { month: 'short' })}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={`${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`}
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, mo, da] = e.target.value.split('-').map(Number);
              const next = new Date(parsed);
              next.setFullYear(y, mo - 1, da);
              onChange(toStr(next));
            }}
            className="text-xs px-2 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
          />
          <span className="text-[11px] text-stone-400">…lub wybierz inną datę</span>
        </div>
      </div>

      {/* Godzina — sloty co 30 min */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">Godzina</div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={23}
              value={currentH}
              onChange={(e) => setHourMinute(Math.max(0, Math.min(23, Number(e.target.value) || 0)), currentM)}
              className="w-12 text-center text-sm font-mono px-1.5 py-1 border border-stone-200 rounded focus:outline-none focus:border-stone-400"
            />
            <span className="text-stone-400 font-bold">:</span>
            <input
              type="number"
              min={0}
              max={59}
              step={5}
              value={currentM}
              onChange={(e) => setHourMinute(currentH, Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
              className="w-12 text-center text-sm font-mono px-1.5 py-1 border border-stone-200 rounded focus:outline-none focus:border-stone-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 max-h-44 overflow-y-auto pr-1">
          {timeSlots.map(({ h, m }) => {
            const active = h === currentH && m === currentM;
            const label = `${pad(h)}:${pad(m)}`;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setHourMinute(h, m)}
                className={`px-1 py-1.5 rounded text-xs font-mono font-medium transition-all border ${
                  active
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AddReminderModal = ({ leads, currentUser, prefillDate, onClose, onSuccess }) => {
  const initialDate = useMemo(() => {
    const d = prefillDate ? new Date(prefillDate) : new Date(Date.now() + 30 * 60000);
    d.setSeconds(0, 0);
    if (!prefillDate) {
      // zaokrąglij do najbliższych 15 min
      d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
    }
    return d;
  }, [prefillDate]);
  const pad = (n) => String(n).padStart(2, '0');
  const dateToString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [type, setType] = useState('rozmowa');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => dateToString(initialDate));
  const [notes, setNotes] = useState('');
  const [leadId, setLeadId] = useState('');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedLead = useMemo(
    () => leads.find(l => l.id === leadId) || null,
    [leads, leadId]
  );

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return leads
      .filter(l =>
        String(l.name || '').toLowerCase().includes(q) ||
        String(l.phone || '').toLowerCase().includes(q) ||
        String(l.email || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [leads, search]);

  const handleSelectLead = (lead) => {
    setLeadId(lead.id);
    setSearch('');
    setShowSuggestions(false);
    if (!title.trim()) {
      const def = type === 'rozmowa' ? `Zadzwonić do ${lead.name}`
        : type === 'spotkanie' ? `Spotkanie z ${lead.name}`
        : `Notatka — ${lead.name}`;
      setTitle(def);
    }
  };

  const clearLead = () => {
    setLeadId('');
    setSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);

    try {
      await addDoc(collection(db, "reminders"), {
        title: title.trim(),
        date: new Date(date).toISOString(),
        leadId: leadId || '',
        leadName: selectedLead?.name || '',
        leadPhone: selectedLead?.phone || '',
        type,
        notes: notes.trim(),
        isCompleted: false,
        isAutomatic: false,
        repeatDays: null,
        createdBy: currentUser,
        createdAt: serverTimestamp()
      });
      onSuccess();
    } catch (error) {
      console.error("Błąd:", error);
      alert('Nie udało się zapisać: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const activeType = REMINDER_TYPES.find(t => t.id === type) || REMINDER_TYPES[0];
  const ActiveIcon = activeType.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

          <div className="px-6 py-4 border-b border-stone-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-stone-900">Dodaj wydarzenie</h2>
            <p className="text-xs text-stone-500 mt-0.5">Zaplanuj rozmowę, spotkanie lub notatkę</p>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">

              {/* Typ */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Typ</label>
                <div className="grid grid-cols-3 gap-2">
                  {REMINDER_TYPES.map(t => {
                    const Ic = t.icon;
                    const active = type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id)}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 transition-all ${
                          active
                            ? `border-stone-900 bg-stone-50`
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.iconBg}`}>
                          <Ic className="w-4 h-4" />
                        </div>
                        <span className={`text-xs font-medium ${active ? 'text-stone-900' : 'text-stone-600'}`}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wyszukiwarka leada */}
              <div className="relative">
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Powiązany kontakt (opcjonalnie)
                </label>

                {selectedLead ? (
                  <div className="border-2 border-stone-900 bg-stone-50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 truncate">{selectedLead.name}</p>
                        <div className="mt-1 space-y-0.5">
                          {selectedLead.phone && (
                            <p className="text-xs text-stone-600 flex items-center gap-1.5">
                              <PhoneIcon className="w-3 h-3 text-stone-400" />
                              <span className="font-mono">{selectedLead.phone}</span>
                            </p>
                          )}
                          {selectedLead.email && (
                            <p className="text-xs text-stone-500 truncate">{selectedLead.email}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {selectedLead.status && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600 uppercase tracking-wide">
                                {selectedLead.status}
                              </span>
                            )}
                            {selectedLead.assignedTo && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                                {selectedLead.assignedTo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearLead}
                        className="p-1 text-stone-400 hover:text-red-500 rounded"
                        title="Usuń"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Wyszukaj po imieniu, nazwisku lub telefonie..."
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {suggestions.map(lead => (
                          <button
                            key={lead.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectLead(lead)}
                            className="w-full text-left px-3 py-2.5 hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors"
                          >
                            <p className="text-sm font-medium text-stone-900 truncate">{lead.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {lead.phone && <span className="text-[11px] text-stone-500 font-mono">{lead.phone}</span>}
                              {lead.assignedTo && <span className="text-[11px] text-stone-400">• {lead.assignedTo}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showSuggestions && search.trim() && suggestions.length === 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg p-3">
                        <p className="text-xs text-stone-400 text-center">Brak wyników</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Tytuł */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Tytuł *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors"
                  placeholder={activeType.placeholder}
                />
              </div>

              {/* Data + godzina — intuicyjny picker */}
              <DateTimePickerNice value={date} onChange={setDate} />

              {/* Notatka */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Notatka
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors resize-none"
                  placeholder="Dodatkowe informacje..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim() || !date}
                className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <ActiveIcon className="w-4 h-4" />
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
