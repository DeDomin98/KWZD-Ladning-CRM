// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/lib/utils.js

// Formatowanie kwoty PLN
export const formatPLN = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '—';
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Formatowanie daty (DD.MM.YYYY)
export const formatDate = (dateInput) => {
  if (!dateInput) return '—';
  const date = dateInput.seconds
    ? new Date(dateInput.seconds * 1000)
    : new Date(dateInput);
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

// Formatowanie daty z godziną
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '—';
  const date = dateInput.seconds
    ? new Date(dateInput.seconds * 1000)
    : new Date(dateInput);
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Formatowanie relatywnego czasu (np. "5 min temu", "2 dni temu")
export const timeAgo = (dateInput) => {
  if (!dateInput) return '—';
  const date = dateInput.seconds
    ? new Date(dateInput.seconds * 1000)
    : new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'przed chwilą';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return 'wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  return formatDate(date);
};

// Ile dni minęło od daty
export const daysSince = (dateInput) => {
  if (!dateInput) return 0;
  const date = dateInput.seconds
    ? new Date(dateInput.seconds * 1000)
    : new Date(dateInput);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Ile dni do daty (ujemne = po terminie)
export const daysUntil = (dateInput) => {
  if (!dateInput) return null;
  const date = dateInput.seconds
    ? new Date(dateInput.seconds * 1000)
    : new Date(dateInput);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = date - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Dodaj dni do daty
export const addDays = (dateInput, days) => {
  const date = dateInput
    ? (dateInput.seconds ? new Date(dateInput.seconds * 1000) : new Date(dateInput))
    : new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Początek dnia
export const startOfDay = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

// Koniec dnia
export const endOfDay = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

// Statusy leadów z konfiguracją
export const LEAD_STATUSES = {
  nowy: {
    label: 'Nowy',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500'
  },
  do_kontaktu: {
    label: 'Do kontaktu',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500'
  },
  w_trakcie: {
    label: 'W trakcie',
    color: 'bg-violet-100 text-violet-800 border-violet-200',
    dot: 'bg-violet-500'
  },
  do_umowy: {
    label: 'Czeka na umowę',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500'
  },
  klient: {
    label: 'Klient',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500'
  },
  spalony: {
    label: 'Spalony',
    color: 'bg-stone-100 text-stone-600 border-stone-200',
    dot: 'bg-stone-400'
  }
};

// Typy usług
export const SERVICE_TYPES = {
  upadlosc: {
    label: 'Upadłość konsumencka',
    shortLabel: 'Upadłość',
    defaultPrice: 4000,
    department: 'upadlosci'
  },
  negocjacje: {
    label: 'Negocjacje z wierzycielami',
    shortLabel: 'Negocjacje',
    defaultPrice: 700, // minimum 700zł za wierzyciela
    department: 'negocjacje',
    perCreditor: true,
    minPerCreditor: 700
  }
};

// Działy (departamenty)
export const DEPARTMENTS = {
  upadlosci: {
    label: 'Upadłości',
    shortLabel: 'Upadłości',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: null
  },
  negocjacje: {
    label: 'Negocjacje',
    shortLabel: 'Negocjacje',
    color: 'bg-violet-100 text-violet-800 border-violet-200',
    icon: null
  }
};

// Role użytkowników
export const USER_ROLES = {
  admin: {
    label: 'Administrator',
    departments: ['upadlosci', 'negocjacje'],
    canSeeAllLeads: true,
    canSeeLeads: true,
    canSeeFinances: true,
    canSeeSettings: true,
    isRestricted: false
  },
  agent_negocjacje: {
    label: 'Agent Negocjacji',
    departments: ['negocjacje'],
    canSeeAllLeads: false, // widzi tylko leady qualified for negocjacje
    canSeeLeads: true,
    canSeeFinances: true, // ale tylko negocjacje
    canSeeSettings: false,
    isRestricted: false
  },
  restricted_upadlosci: {
    label: 'Pracownik Upadłości (ograniczony)',
    departments: ['upadlosci'],
    canSeeAllLeads: false,
    canSeeLeads: true,
    canSeeFinances: false,
    canSeeSettings: false,
    isRestricted: true
  },
  restricted_negocjacje: {
    label: 'Pracownik Negocjacji (ograniczony)',
    departments: ['negocjacje'],
    canSeeAllLeads: false,
    canSeeLeads: true,
    canSeeFinances: true,
    canSeeSettings: false,
    isRestricted: false
  }
};

// Podział finansowy negocjacji (30% KWZD / 70% kancelaria partnerska)
export const NEGOCJACJE_REVENUE_SPLIT = {
  kwzd: 0.30,
  partner: 0.70
};

// Wyniki kontaktu
export const CONTACT_RESULTS = {
  odebrał_pozytywna: 'Odebrał - rozmowa pozytywna',
  odebrał_do_przemyslenia: 'Odebrał - do przemyślenia',
  odebrał_odmowa: 'Odebrał - odmowa',
  nie_odebral: 'Nie odebrał',
  zajety: 'Zajęty / oddzwoni',
  nieaktualny_numer: 'Nieaktualny numer',
  wyslano_sms: 'Wysłano SMS',
  wyslano_email: 'Wysłano email'
};

export const startOfWeek = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Początek miesiąca
export const startOfMonth = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Koniec miesiąca
export const endOfMonth = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};


// Czas od leada (bardziej precyzyjny)
export const timeSinceLead = (dateInput) => {
  if (!dateInput) return { value: 0, unit: 'min', full: '—', color: 'stone' };

  const date = dateInput.seconds
    ? new Date(dateInput.seconds * 1000)
    : new Date(dateInput);

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    const color = diffMins < 30 ? 'emerald' : 'amber';
    return { value: diffMins, unit: 'min', full: `${diffMins} min`, color };
  }
  if (diffHours < 24) {
    const color = diffHours < 2 ? 'amber' : 'orange';
    return { value: diffHours, unit: 'godz', full: `${diffHours} godz.`, color };
  }
  return { value: diffDays, unit: 'dni', full: `${diffDays} dni`, color: 'red' };
};

// Dni w miesiącu
export const getDaysInMonth = (month, year) => {
  return new Date(year, month + 1, 0).getDate();
};

// Pierwszy dzień miesiąca (0 = niedziela, 1 = poniedziałek)
export const getFirstDayOfMonth = (month, year) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Konwersja na poniedziałek = 0
};