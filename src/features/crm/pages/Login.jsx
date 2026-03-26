import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/crm');
    } catch (err) {
      setError('Nieprawidłowy email lub hasło');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex font-['Inter',system-ui,sans-serif]">
      
      {/* Lewa strona - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-stone-900 p-12 flex-col justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Kancelaria</h1>
          <p className="text-stone-500 text-sm mt-1">System zarządzania klientami</p>
        </div>
        
        <div className="space-y-6">
          <blockquote className="text-stone-300 text-lg leading-relaxed">
            "Porządek w dokumentach to porządek w sprawach."
          </blockquote>
          <div className="w-16 h-px bg-stone-700"></div>
        </div>
        
        <p className="text-stone-600 text-sm">
          © 2024 Kancelaria. Wszelkie prawa zastrzeżone.
        </p>
      </div>

      {/* Prawa strona - formularz */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          
          {/* Logo mobilne */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-stone-900 text-2xl font-semibold tracking-tight">Kancelaria</h1>
            <p className="text-stone-500 text-sm mt-1">System CRM</p>
          </div>

          {/* Nagłówek */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-stone-900">Witaj ponownie</h2>
            <p className="text-stone-500 mt-2">Zaloguj się do swojego konta</p>
          </div>

          {/* Błąd */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Formularz */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Adres email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors"
                placeholder="jan@kancelaria.pl"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Hasło
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-stone-900 text-white font-medium rounded-lg hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Logowanie...
                </span>
              ) : (
                'Zaloguj się'
              )}
            </button>
          </form>

          {/* Stopka */}
          <p className="mt-8 text-center text-stone-400 text-sm">
            Problem z logowaniem? Skontaktuj się z administratorem.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;