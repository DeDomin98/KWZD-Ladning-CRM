import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const ContractConfirmation = () => {
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get('id');
  const [status, setStatus] = useState('loading'); // loading, confirming, success, already_signed, error
  const [errorMessage, setErrorMessage] = useState('');
  const [contractData, setContractData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const confirmContract = useCallback(async () => {
    if (!contractId) {
      setStatus('error');
      setErrorMessage('Brak identyfikatora umowy w adresie URL.');
      return;
    }

    try {
      setStatus('loading');
      
      // Pobierz dokument umowy
      const contractRef = doc(db, 'contracts', contractId);
      const contractSnap = await getDoc(contractRef);

      if (!contractSnap.exists()) {
        setStatus('error');
        setErrorMessage('Umowa o podanym identyfikatorze nie została znaleziona.');
        return;
      }

      const data = contractSnap.data();
      setContractData(data);

      // Sprawdź czy umowa nie została już podpisana
      if (data.status === 'podpisana_przez_klienta' || data.signedAt) {
        setStatus('already_signed');
        return;
      }

      // Pokaż przycisk do potwierdzenia (nie aktualizuj automatycznie)
      setStatus('confirming');
      
    } catch (error) {
      console.error('Błąd podczas pobierania umowy:', error);
      
      // Bardziej szczegółowa obsługa błędów
      if (error.code === 'permission-denied') {
        setErrorMessage('Brak uprawnień do wyświetlenia tej umowy.');
      } else if (error.code === 'unavailable') {
        setErrorMessage('Serwer jest tymczasowo niedostępny. Spróbuj ponownie za chwilę.');
      } else if (!navigator.onLine) {
        setErrorMessage('Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.');
      } else {
        setErrorMessage('Wystąpił błąd podczas ładowania umowy. Spróbuj odświeżyć stronę.');
      }
      setStatus('error');
    }
  }, [contractId]);

  useEffect(() => {
    confirmContract();
  }, [confirmContract, retryCount]);

  const handleConfirmSignature = async () => {
    if (!contractId) return;

    setStatus('loading');

    try {
      const contractRef = doc(db, 'contracts', contractId);
      
      // Aktualizuj status umowy
      await updateDoc(contractRef, {
        status: 'podpisana_przez_klienta',
        signedAt: serverTimestamp(),
        signedViaEmail: true,
        signedFromDevice: navigator.userAgent,
        signedIP: 'captured-server-side' // Można dodać przez Cloud Function
      });

      setStatus('success');
    } catch (error) {
      console.error('Błąd podczas potwierdzania umowy:', error);
      
      if (error.code === 'permission-denied') {
        setErrorMessage('Brak uprawnień do podpisania tej umowy. Skontaktuj się z nami.');
      } else if (error.code === 'unavailable' || !navigator.onLine) {
        setErrorMessage('Problem z połączeniem. Sprawdź internet i spróbuj ponownie.');
      } else {
        setErrorMessage('Wystąpił błąd podczas podpisywania. Spróbuj ponownie lub skontaktuj się z nami.');
      }
      setStatus('error');
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-stone-200 p-8">
        
        {/* Loading */}
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">Przetwarzanie...</h2>
            <p className="text-stone-600">Ładowanie umowy, proszę czekać.</p>
          </div>
        )}

        {/* Confirming - pokazuje przycisk do podpisania */}
        {status === 'confirming' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-stone-900 mb-2">Potwierdź podpisanie umowy</h2>
            
            {contractData && (
              <div className="text-left bg-stone-50 rounded-lg p-4 mb-6 text-sm">
                <p className="text-stone-600 mb-1">
                  <span className="font-medium">Klient:</span> {contractData.clientName}
                </p>
                <p className="text-stone-600 mb-1">
                  <span className="font-medium">Data umowy:</span> {contractData.contractDate}
                </p>
                {contractData.servicePrice && (
                  <p className="text-stone-600">
                    <span className="font-medium">Wartość:</span> {contractData.servicePrice.toLocaleString('pl-PL')} PLN
                  </p>
                )}
              </div>
            )}

            <p className="text-stone-600 mb-6">
              Klikając poniższy przycisk potwierdzasz zapoznanie się z treścią umowy oraz wyrażasz zgodę na jej warunki.
            </p>
            
            <button
              onClick={handleConfirmSignature}
              className="w-full px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-lg"
            >
              Potwierdzam i podpisuję umowę
            </button>
            
            <p className="text-xs text-stone-400 mt-4">
              Data i godzina podpisu zostaną zarejestrowane automatycznie.
            </p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-stone-900 mb-2">Umowa podpisana!</h2>
            <p className="text-stone-600 mb-6">
              Twoja umowa została pomyślnie potwierdzona i podpisana. Dziękujemy za zaufanie!
            </p>
            <p className="text-sm text-stone-500">
              Potwierdzenie zostanie wysłane na Twój adres e-mail.
            </p>
          </div>
        )}

        {/* Already signed */}
        {status === 'already_signed' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-stone-900 mb-2">Umowa już podpisana</h2>
            <p className="text-stone-600 mb-6">
              Ta umowa została już wcześniej podpisana. Nie musisz podejmować żadnych dodatkowych działań.
            </p>
            {contractData?.signedAt && (
              <p className="text-sm text-stone-500">
                Podpisano: {contractData.signedAt?.toDate?.()?.toLocaleString('pl-PL') || 'Data zapisana'}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-stone-900 mb-2">Wystąpił problem</h2>
            <p className="text-red-600 mb-6">
              {errorMessage}
            </p>
            
            <button
              onClick={handleRetry}
              className="w-full px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium mb-4"
            >
              Spróbuj ponownie
            </button>
            
            <p className="text-sm text-stone-500">
              Jeśli problem się powtarza, prosimy o kontakt:{' '}
              <a href="mailto:kontakt@wyjscie-z-dlugow.pl" className="text-stone-900 underline">
                kontakt@wyjscie-z-dlugow.pl
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractConfirmation;