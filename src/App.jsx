import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.js';
import ProtectedRoute from './components/ProtectedRoute';

// Publiczna strona
import WebsiteLayout from './components/layout/WebsiteLayout';
import Home from './features/website/pages/Home';
import Services from './features/website/pages/Services';
import Contact from './features/website/pages/Contact';
import About from './features/website/pages/About';
import PrivacyPolicy from './features/website/pages/PrivacyPolicy';
import TermsOfService from './features/website/pages/TermsOfService';
import ContractConfirmation from './features/website/pages/ContractConfirmation';
import Register from './features/crm/pages/Register';

// CRM
import CrmLayout from './components/layout/CrmLayout';
import DepartmentSelect from './features/crm/pages/DepartmentSelect';
import Login from './features/crm/pages/Login';
import Dashboard from './features/crm/pages/Dashboard';
import Leads from './features/crm/pages/Leads';
import LeadDetails from './features/crm/pages/LeadDetails';
import Clients from './features/crm/pages/Clients';
import ClientDetails from './features/crm/pages/ClientDetails';
import Finances from './features/crm/pages/Finances';
import Settings from './features/crm/pages/Settings';
import Calendar from './features/crm/pages/Calendar';
import Contracts from './features/crm/pages/Contracts';

// Import ThemeProvider
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* PUBLICZNA STRONA W WebsiteLayout */}
          <Route path="/" element={<WebsiteLayout />}>
            <Route index element={<Home />} />
            <Route path="uslugi" element={<Services />} />
            <Route path="kontakt" element={<Contact />} />
            <Route path="o-nas" element={<About />} />
            <Route path="polityka-prywatnosci" element={<PrivacyPolicy />} />
            <Route path="regulamin" element={<TermsOfService />} />
            <Route path="potwierdzenie-umowy" element={<ContractConfirmation />} />
          </Route>

          {/* CRM - login */}
          <Route path="/crm/login" element={<Login />} />
          <Route path="/crm/rejestracja/:token" element={<Register />} />

          {/* CRM - strefa chroniona */}
          <Route path="/crm" element={
            <ThemeProvider>
              <ProtectedRoute />
            </ThemeProvider>
          }>
            {/* Wybór działu */}
            <Route index element={<DepartmentSelect />} />

            {/* UPADŁOŚCI */}
            <Route path="upadlosci" element={<CrmLayout department="upadlosci" />}>
              <Route index element={<Dashboard department="upadlosci" />} />
              <Route path="leady" element={<Leads />} />
              <Route path="leady/:id" element={<LeadDetails />} />
              <Route path="klienci" element={<Clients department="upadlosci" />} />
              <Route path="klienci/:id" element={<ClientDetails department="upadlosci" />} />
              <Route path="umowy" element={<Contracts department="upadlosci" />} />
              <Route path="finanse" element={<Finances department="upadlosci" />} />
              <Route path="kalendarz" element={<Calendar />} />
              <Route path="ustawienia" element={<Settings />} />
            </Route>

            {/* NEGOCJACJE */}
            <Route path="negocjacje" element={<CrmLayout department="negocjacje" />}>
              <Route index element={<Dashboard department="negocjacje" />} />
              <Route path="leady" element={<Leads />} />
              <Route path="leady/:id" element={<LeadDetails />} />
              <Route path="klienci" element={<Clients department="negocjacje" />} />
              <Route path="klienci/:id" element={<ClientDetails department="negocjacje" />} />
              <Route path="umowy" element={<Contracts department="negocjacje" />} />
              <Route path="finanse" element={<Finances department="negocjacje" />} />
              <Route path="kalendarz" element={<Calendar />} />
              <Route path="ustawienia" element={<Settings />} />
            </Route>

            {/* Legacy redirects */}
            <Route path="leady" element={<Navigate to="/crm" replace />} />
            <Route path="klienci" element={<Navigate to="/crm" replace />} />
            <Route path="klienci/:id" element={<Navigate to="/crm" replace />} />
            <Route path="umowy" element={<Navigate to="/crm" replace />} />
            <Route path="finanse" element={<Navigate to="/crm" replace />} />
            <Route path="kalendarz" element={<Navigate to="/crm" replace />} />
            <Route path="ustawienia" element={<Navigate to="/crm" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;