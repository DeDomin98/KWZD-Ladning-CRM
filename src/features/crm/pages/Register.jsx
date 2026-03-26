import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../lib/firebase';

const Register = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    checkInvitation();
  }, [token]);

  const checkInvitation = async () => {
    try {
      const q = query(collection(db, 'invitations'), where('token', '==', token));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Nieprawidłowy link zaproszenia');
        setLoading(false);
        return;
      }

      const invite = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

      if (invite.used) {
        setError('Ten link został już wykorzystany');
        setLoading(false);
        return;
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        setError('Ten link wygasł. Poproś o nowy link.');
        setLoading(false);
        return;
      }

      setInvitation(invite);
      setLoading(false);
    } catch (err) {
      console.error('Błąd sprawdzania zaproszenia:', err);
      setError('Wystąpił błąd. Spróbuj ponownie.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Walidacja
    if (formData.password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne');
      return;
    }

    setSubmitting(true);

    try {
      const auth = getAuth();

      // Jeśli zaproszenie MA przypisany uid, używamy funkcji w chmurze,
      // żeby przejąć istniejące konto (scenariusz "pracownik przejmuje konto z leadami").
      if (invitation?.uid) {
        const completeInvite = httpsCallable(functions, 'completeInviteRegistration');

        await completeInvite({
          token,
          email: formData.email,
          password: formData.password
        });

        // Po udanym przejęciu konta logujemy użytkownika
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        // STARE / STANDARDOWE ZACHOWANIE:
        // Tworzymy zupełnie nowe konto po stronie klienta (jak wcześniej).

        // 1. Utwórz konto w Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // 2. Ustaw displayName
        await updateProfile(userCredential.user, {
          displayName: invitation.displayName
        });

        // 3. Utwórz dokument użytkownika w Firestore
        const { setDoc, serverTimestamp } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: formData.email,
          displayName: invitation.displayName,
          role: invitation.role || 'agent',
          isOnline: true,
          lastActiveAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });

        // 4. Oznacz zaproszenie jako użyte
        await updateDoc(doc(db, 'invitations', invitation.id), {
          used: true,
          usedBy: formData.email,
          usedAt: new Date().toISOString()
        });
      }

      // 5. Przekieruj do CRM
      navigate('/crm');

    } catch (err) {
      console.error('Błąd rejestracji:', err);

      // Błędy z funkcji chmurowej (HttpsError) mają kod zaczynający się od "functions/"
      if (err.code === 'functions/not-found') {
        setError('Nieprawidłowy link zaproszenia');
      } else if (err.code === 'functions/failed-precondition') {
        setError(err.message || 'Link jest nieaktywny lub wygasł');
      } else if (err.code === 'functions/invalid-argument') {
        setError('Nieprawidłowe dane w formularzu');
      } else if (err.code === 'functions/already-exists') {
        setError(err.message || 'Ten adres email jest już zarejestrowany');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Ten adres email jest już zarejestrowany');
      } else if (err.code === 'auth/invalid-email') {
        setError('Nieprawidłowy adres email');
      } else if (err.code === 'auth/weak-password') {
        setError('Hasło jest zbyt słabe');
      } else {
        setError('Wystąpił błąd podczas rejestracji. Spróbuj ponownie.');
      }

      setSubmitting(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  // Błąd - nieprawidłowy/wygasły/użyty link
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Link nieprawidłowy</h1>
          <p className="text-stone-500 mb-6">{error}</p>
          <Link
            to="/crm/login"
            className="inline-block px-6 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
          >
            Przejdź do logowania
          </Link>
        </div>
      </div>
    );
  }

  // Formularz rejestracji
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">Witaj w zespole!</h1>
          <p className="text-stone-500 mt-2">
            Tworzysz konto jako: <strong className="text-stone-900">{invitation.displayName}</strong>
          </p>
        </div>

        {/* Formularz */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Twój adres email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
              placeholder="jan@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Hasło
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
              placeholder="Minimum 6 znaków"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Powtórz hasło
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-base"
              placeholder="Powtórz hasło"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Tworzenie konta...' : 'Utwórz konto'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-stone-400 mt-6">
          Masz już konto?{' '}
          <Link to="/crm/login" className="text-stone-900 font-medium hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;