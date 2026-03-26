<div align="center">

# ⚖️ Kancelaria Wyjście z Długów

### Landing Page & System CRM

Kompleksowa platforma webowa dla kancelarii specjalizującej się w oddłużaniu — strona internetowa + wewnętrzny system CRM z zarządzaniem leadami, klientami, umowami i finansami.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📋 Spis treści

- [O projekcie](#-o-projekcie)
- [Funkcjonalności](#-funkcjonalności)
- [Tech Stack](#-tech-stack)
- [Struktura projektu](#-struktura-projektu)
- [Instalacja](#-instalacja)
- [Uruchomienie](#-uruchomienie)
- [Firebase Functions](#-firebase-functions)
- [Kontrola dostępu](#-kontrola-dostępu)

---

## 💡 O projekcie

Platforma składa się z dwóch głównych części:

| Moduł | Opis |
|---|---|
| **Landing Page** | Strona internetowa kancelarii z prezentacją usług, formularzem kontaktowym, sekcją „o nas" oraz regulaminem i polityką prywatności |
| **CRM** | Wewnętrzny system do zarządzania procesem obsługi klienta — od pozyskania leada po rozliczenie finansowe |

Kancelaria obsługuje trzy główne usługi:
- **Upadłość konsumencka** — sądowe umorzenie długów
- **Negocjacje z wierzycielami** — redukcja i restrukturyzacja płatności
- **Restrukturyzacja zadłużenia** — reorganizacja finansowa

---

## ✨ Funkcjonalności

### 🌐 Strona internetowa
- Responsywny landing page z sekcją hero, kartami usług i krokami procesu
- Strona usług, kontakt, o nas
- Polityka prywatności i regulamin
- Potwierdzenie umowy online
- SEO (react-helmet-async, sitemap, robots.txt)

### 📊 CRM — Dashboard
- KPI w czasie rzeczywistym (leady, klienci, konwersja, przychód)
- Cele miesięczne i śledzenie postępu
- Statystyki per departament (upadłości / negocjacje)
- Widget ostatnich leadów

### 👥 Zarządzanie leadami
- Pipeline statusów: `nowy` → `do kontaktu` → `skwalifikowany` → `klient` → `opłacone` / `spalony`
- Filtrowanie po statusie, źródle, agencie, dacie
- Przypisywanie leadów do pracowników
- Historia kontaktu i prób kontaktowych
- Widoczność ograniczona do przypisanych leadów (per pracownik)

### 📁 Zarządzanie klientami
- Kategorie: onboarding, aktywni, zarchiwizowani
- Śledzenie płatności i rat
- Alerty zaległych płatności
- Podział przychodów 30/70 (KWZD / firma partnerska) dla negocjacji

### 📝 Generowanie umów
- Dynamiczny formularz z danymi klienta i usługi
- Tryby płatności: jednorazowa / ratalna
- Automatyczne generowanie PDF:
  - Umowa główna
  - Klauzula RODO
  - Formularz odstąpienia
- Wysyłka dokumentów na e-mail klienta
- Obsługa wielu departamentów (różne firmy, adresy, szablony)

### 💰 Finanse
- Oś czasu płatności pogrupowana po miesiącach
- Porównanie miesiąc do miesiąca
- Ewidencja kosztów (reklama, biuro, oprogramowanie, podatki)
- Raportowanie przychodów per departament

### 🔧 Dodatkowe moduły
- **Chat wewnętrzny** — komunikacja zespołowa w czasie rzeczywistym
- **Kalendarz** — planowanie spotkań i wydarzeń
- **Upload plików** — dokumenty klientów w Firebase Storage
- **Edytor PDF** — podgląd i edycja dokumentów
- **Podpisy cyfrowe** — przechowywanie i zarządzanie
- **System zaproszeń** — rejestracja pracowników przez token
- **Tryb ciemny / jasny**

---

## 🛠 Tech Stack

| Warstwa | Technologie |
|---|---|
| **Frontend** | React 19, React Router 7, Tailwind CSS 4, Framer Motion |
| **Backend** | Firebase Functions (Node.js 22) |
| **Baza danych** | Cloud Firestore (real-time listeners) |
| **Autoryzacja** | Firebase Authentication |
| **Storage** | Firebase Cloud Storage |
| **Email** | Nodemailer + Gmail SMTP |
| **PDF** | html2pdf.js, pdf-lib |
| **Build** | Vite 7 |
| **Ikony** | Lucide React |

---

## 📂 Struktura projektu

```
├── functions/              # Firebase Cloud Functions (backend)
│   └── index.js            # Wysyłka e-maili z umowami
├── public/                 # Zasoby statyczne (obrazy, sitemap, robots.txt)
├── src/
│   ├── components/         # Współdzielone komponenty
│   │   ├── layout/         #   Navbar, Footer, CrmLayout, WebsiteLayout
│   │   └── ui/             #   Button, SEO
│   ├── context/            # ThemeContext (dark/light mode)
│   ├── features/
│   │   ├── crm/
│   │   │   ├── components/ #   Chat, FileUploader, PdfEditor, Signatures...
│   │   │   └── pages/      #   Dashboard, Leads, Clients, Contracts, Finances...
│   │   └── website/
│   │       └── pages/      #   Home, Services, Contact, About, Privacy...
│   ├── hooks/              # useAuth, usePresence
│   └── lib/                # Firebase config, utilities, storage helpers
├── firebase.json           # Konfiguracja Firebase
├── vite.config.js          # Konfiguracja Vite
└── package.json
```

---

## 🚀 Instalacja

```bash
# Klonowanie repozytorium
git clone https://github.com/DeDomin98/KWZD-Ladning-CRM.git
cd KWZD-Ladning-CRM

# Instalacja zależności frontendu
npm install

# Instalacja zależności Firebase Functions
cd functions
npm install
cd ..
```

---

## ⚡ Uruchomienie

```bash
# Serwer deweloperski
npm run dev

# Build produkcyjny
npm run build

# Podgląd builda
npm run preview

# Firebase Functions (emulator)
cd functions
npm run serve
```

---

## 🔥 Firebase Functions

### `sendContractEmailOnCreate`

Trigger uruchamiany przy dodaniu dokumentu do kolekcji `emailQueue`:

- Automatycznie wykrywa załączone dokumenty (umowa, RODO, odstąpienie)
- Generuje kontekstowy tytuł i treść e-maila
- Pobiera PDF-y z Firebase Storage i dołącza jako załączniki
- Wysyła profesjonalny e-mail HTML z brandingiem kancelarii
- Zawiera link do potwierdzenia umowy online

---

## 🔐 Kontrola dostępu

| Rola | Uprawnienia |
|---|---|
| **Admin** | Pełny dostęp do wszystkich departamentów i pracowników |
| **Kierownik departamentu** | Zarządzanie własnym departamentem |
| **Pracownik** | Widoczność tylko przypisanych leadów i klientów |
| **Agent negocjacji** | Dostęp wyłącznie do leadów zakwalifikowanych do negocjacji |

System obsługuje równoległe operacje dwóch departamentów z niezależnymi pipeline'ami leadów, bazami klientów, szablonami umów i celami finansowymi.

---

<div align="center">

**Kancelaria Wyjście z Długów** · Wrocław / Warszawa

</div>
