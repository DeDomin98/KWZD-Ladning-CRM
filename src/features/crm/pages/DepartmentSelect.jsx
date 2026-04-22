import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getAuth, signOut } from 'firebase/auth';
import { DEPARTMENTS } from '../../../lib/utils';

const DepartmentSelect = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { displayName, departments, isNegocjacjeOnly } = useAuth();

  // If user only has access to one department, redirect immediately
  React.useEffect(() => {
    if (departments.length === 1) {
      navigate(`/crm/${departments[0]}`, { replace: true });
    }
  }, [departments, navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/crm/login');
  };

  const firstName = displayName?.split(' ')[0] || 'Użytkownik';

  // While redirecting single-dept users, show nothing
  if (departments.length <= 1) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-['Inter',system-ui,sans-serif]">
      {/* Top bar */}
      <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h1 className="text-stone-900 font-semibold">Wyjście z długów</h1>
          <p className="text-stone-500 text-xs">System CRM</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-500">Cześć, <span className="font-medium text-stone-900">{firstName}</span></span>
          <button
            onClick={handleLogout}
            className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
            title="Wyloguj"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-stone-900">Wybierz dział</h2>
            <p className="text-stone-500 mt-2">Do którego panelu chcesz przejść?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Upadłości */}
            {departments.includes('upadlosci') && (
              <button
                onClick={() => navigate('/crm/upadlosci')}
                className="group bg-white rounded-2xl border-2 border-stone-200 hover:border-blue-400 p-8 transition-all duration-200 hover:shadow-lg hover:shadow-blue-100 text-left"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-5 transition-colors">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l9-4 9 4M3 6v2l9 4 9-4V6M3 12v2l9 4 9-4v-2" /></svg>
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">Upadłości</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Upadłość konsumencka — leady, klienci, umowy, finanse i kalendarz.
                </p>
                <div className="mt-6 flex items-center gap-2 text-blue-600 font-medium text-sm group-hover:gap-3 transition-all">
                  Przejdź do panelu
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}

            {/* Negocjacje */}
            {departments.includes('negocjacje') && (
              <button
                onClick={() => navigate('/crm/negocjacje')}
                className="group bg-white rounded-2xl border-2 border-stone-200 hover:border-violet-400 p-8 transition-all duration-200 hover:shadow-lg hover:shadow-violet-100 text-left"
              >
                <div className="w-16 h-16 rounded-2xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center mb-5 transition-colors">
                  <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">Negocjacje</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Negocjacje z wierzycielami — leady, klienci, umowy, finanse i kalendarz.
                </p>
                <div className="mt-6 flex items-center gap-2 text-violet-600 font-medium text-sm group-hover:gap-3 transition-all">
                  Przejdź do panelu
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}
          </div>

          {/* Phone — bramka telefoniczna (moduł testowy, dostępny dla wszystkich) */}
          <div className="mt-6">
            <button
              onClick={() => navigate('/crm/phone')}
              className="group w-full bg-white rounded-2xl border-2 border-stone-200 hover:border-emerald-400 p-6 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-100 text-left flex items-center gap-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-stone-900 mb-1">Bramka telefoniczna</h3>
                <p className="text-sm text-stone-500">
                  Odbieraj połączenia przez przeglądarkę i przeglądaj historię rozmów.
                </p>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm group-hover:gap-3 transition-all">
                Otwórz
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentSelect;
