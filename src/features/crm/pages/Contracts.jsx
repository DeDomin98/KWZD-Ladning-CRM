import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { formatPLN, formatDate, SERVICE_TYPES, DEPARTMENTS } from '../../../lib/utils';
import { useAuth } from '../../../hooks/useAuth';
import { uploadFile } from '../../../lib/storage';
import { useSearchParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';

// --- DANE KANCELARII DO EDYCJI ---
const COMPANY_DATA = {
  name: "KWZD Sp. z o.o.",
  address: "Św. Mikołaja 8/11/208, 50-125 Wrocław, Polska",
  nip: "8971965477",
  regon: "543812157",
  krs: "0001217909",
  bankAccount: "25 1020 2498 0000 8102 0886 3591",
  email: "kontakt@wyjscie-z-dlugow.pl",
  representation: "Prezesa Zarządu Dominik Hardek"
};

// --- DANE KANCELARII NEGOCJACJE ---
const NEGOCJACJE_COMPANY_DATA = {
  name: "Kancelaria Prawnicza Paulina Ewa Zdziech-Pośpieszczyk",
  address: "Al. Jana Pawła II 22, piętro 2, 00-133 Warszawa",
  nip: "5381783957",
  bankAccount: "31 1910 1048 2261 1745 7071 0001",
  email: "kancelaria@lexlinea.pl",
  representation: "radcę prawnego Paulinę Ewę Zdziech-Pośpieszczyk",
  representationShort: "radca prawny Paulina Ewa Zdziech-Pośpieszczyk"
};

// --- IKONY SVG (bez emotek) ---
const IconDocument = ({ className = 'w-4 h-4', stroke = 'currentColor' }) => (
  <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconLock = ({ className = 'w-4 h-4', stroke = 'currentColor' }) => (
  <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const IconWithdrawal = ({ className = 'w-4 h-4', stroke = 'currentColor' }) => (
  <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
  </svg>
);
const IconEnvelope = ({ className = 'w-4 h-4', stroke = 'currentColor' }) => (
  <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const Contracts = ({ department }) => {
  const { displayName: currentUser, currentUser: authUser, isRestricted, canSeeDepartment } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [generatedDocs, setGeneratedDocs] = useState(null);
  const [currentContractId, setCurrentContractId] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  // Zmienna do trackowania który guzik na liście się kręci
  const [sendingEmailForContract, setSendingEmailForContract] = useState(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Prosty system ładnych powiadomień (toast)
  const [toast, setToast] = useState(null);

  // Modal potwierdzenia usunięcia umowy (zamiast window.confirm)
  const [contractToDelete, setContractToDelete] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const contractRef = useRef(null);
  const rodoRef = useRef(null);
  const withdrawalRef = useRef(null);

  const [formData, setFormData] = useState({
    clientName: '',
    pesel: '',
    idNumber: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    email: '',
    serviceType: department === 'negocjacje' ? 'negocjacje' : 'upadlosc',
    servicePrice: '',
    debtAmount: '',
    contractDate: new Date().toISOString().slice(0, 10),
    contractPlace: department === 'negocjacje' ? 'Warszawa' : 'Wrocław',
    notes: '',
    paymentMode: 'single',
    singlePaymentDate: new Date().toISOString().slice(0, 10),
    installmentsCount: 2,
    installmentPlanType: 'firstPayment',
    firstPaymentAmount: '',
    firstPaymentDate: new Date().toISOString().slice(0, 10),
    installmentDayOfMonth: 10,
    installmentSchedule: [],
    creditorsCount: '',
    pricePerCreditor: '700'
  });

  // Zbiór umów widocznych dla aktualnego użytkownika
  const visibleContracts = useMemo(() => {
    let result = contracts;
    
    // Filtruj wg działu — rozpoznaj dział na podstawie serviceType (primary) lub pola department (fallback)
    result = result.filter(c => {
      const stDept = SERVICE_TYPES[c.serviceType]?.department;
      const contractDept = stDept || c.department || 'upadlosci';
      return contractDept === department;
    });
    
    if (isRestricted) {
      result = result.filter(c => c.generatedBy === currentUser);
    }
    
    return result;
  }, [contracts, isRestricted, currentUser, department]);

  // Klienci dostępni do generowania umowy (filtr wg działu)
  const availableClients = useMemo(() => {
    if (department === 'negocjacje') {
      return clients.filter(c => c.serviceType === 'negocjacje' || c.qualifiedFor === 'negocjacje');
    }
    if (department === 'upadlosci') {
      return clients.filter(c => {
        const type = c.serviceType === 'upadlosc_konsumencka' ? 'upadlosc' : c.serviceType;
        return type === 'upadlosc' || (!c.serviceType && !c.qualifiedFor);
      });
    }
    return clients;
  }, [clients, department]);

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'leads'), (snapshot) => {
      const clientsData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(l => l.status === 'klient' || l.status === 'do_umowy');
      setClients(clientsData);
    });

    const unsubContracts = onSnapshot(collection(db, 'contracts'), (snapshot) => {
      const contractsData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setContracts(contractsData);
      setLoading(false);
    });

    const fetchSignatures = async () => {
      try {
        const sigDoc = await getDoc(doc(db, 'settings', 'signatures'));
        if (sigDoc.exists()) {
          setSignatures(sigDoc.data().list || []);
        }
      } catch (err) {
        console.error("Błąd pobierania podpisów:", err);
      }
    };
    fetchSignatures();

    return () => {
      unsubClients();
      unsubContracts();
    };
  }, []);

  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  // Dodawanie miesięcy kalendarzowo (ten sam dzień miesiąca: 07.02 → 07.03 → 07.04)
  const addMonths = (dateStr, months) => {
    const [y, m, day] = dateStr.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    d.setMonth(d.getMonth() + months);
    if (d.getDate() !== day) d.setDate(0); // koniec miesiąca gdy dzień nie istnieje (np. 31.01 + 1)
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const computeInstallments = () => {
    const total = Number(formData.servicePrice || 0);
    if (!total || formData.paymentMode !== 'installments') return [];

    const count = Number(formData.installmentsCount || 0);
    if (count < 2) return [];

    if (formData.installmentPlanType === 'firstPayment') {
      const firstDate = formData.firstPaymentDate || formData.contractDate;
      const firstAmtRaw = Number(formData.firstPaymentAmount || 0);
      const firstAmt = firstAmtRaw > 0 ? firstAmtRaw : round2(total / count);

      const rest = total - firstAmt;
      const restCount = count - 1;
      const each = restCount > 0 ? round2(rest / restCount) : 0;

      const schedule = [];
      schedule.push({ no: 1, amount: round2(firstAmt), date: firstDate });

      for (let i = 2; i <= count; i++) {
        const date = addMonths(firstDate, i - 1);
        schedule.push({ no: i, amount: each, date });
      }

      const sum = schedule.reduce((s, x) => s + Number(x.amount || 0), 0);
      const diff = round2(total - sum);
      if (diff !== 0 && schedule.length > 0) {
        schedule[schedule.length - 1].amount = round2(Number(schedule[schedule.length - 1].amount) + diff);
      }

      return schedule;
    }

    if (formData.installmentPlanType === 'schedule') {
      const schedule = (formData.installmentSchedule || [])
        .slice(0, count)
        .map((x, idx) => ({
          no: idx + 1,
          amount: round2(Number(x.amount || 0)),
          date: x.date || formData.contractDate
        }));

      return schedule;
    }

    return [];
  };

  const installments = useMemo(() => computeInstallments(), [
    formData.paymentMode,
    formData.installmentsCount,
    formData.installmentPlanType,
    formData.firstPaymentAmount,
    formData.firstPaymentDate,
    formData.installmentSchedule,
    formData.servicePrice,
    formData.contractDate
  ]);

  const installmentsTotal = useMemo(() => installments.reduce((s, x) => s + Number(x.amount || 0), 0), [installments]);

  const installmentsValid = useMemo(() => {
    if (formData.paymentMode !== 'installments') return true;

    const total = round2(Number(formData.servicePrice || 0));
    const count = Number(formData.installmentsCount || 0);

    if (!total || count < 2) return false;

    if (formData.installmentPlanType === 'firstPayment') {
      const firstAmtRaw = Number(formData.firstPaymentAmount || 0);
      const firstAmt = firstAmtRaw > 0 ? firstAmtRaw : round2(Number(formData.servicePrice || 0) / count);
      if (!(firstAmt > 0)) return false;
      if (!(firstAmt < total)) return false;
      if (!formData.firstPaymentDate) return false;
    }

    if (installments.length !== count) return false;
    if (round2(installmentsTotal) !== total) return false;

    if (!installments.every(x => Number(x.amount) > 0 && !!x.date)) return false;

    return true;
  }, [
    formData.paymentMode,
    formData.servicePrice,
    formData.installmentsCount,
    formData.installmentPlanType,
    formData.firstPaymentAmount,
    formData.firstPaymentDate,
    installments,
    installmentsTotal
  ]);

  const formatDateTimeSafe = (value) => {
    try {
      if (!value) return null;
      if (value.seconds) {
        return new Date(value.seconds * 1000).toLocaleString('pl-PL');
      }
      return new Date(value).toLocaleString('pl-PL');
    } catch {
      return null;
    }
  };

  const ensureScheduleLength = (count) => {
    const safeCount = Math.max(2, Math.min(24, Number(count || 2)));
    setFormData(prev => {
      const existing = Array.isArray(prev.installmentSchedule) ? prev.installmentSchedule : [];
      const next = Array.from({ length: safeCount }, (_, i) => {
        return existing[i] || { amount: '', date: prev.contractDate };
      });
      return {
        ...prev,
        installmentsCount: safeCount,
        installmentSchedule: next,
        firstPaymentAmount: prev.installmentPlanType === 'firstPayment' ? '' : prev.firstPaymentAmount
      };
    });
  };

  const handleSelectClient = useCallback((clientId) => {
    const client = availableClients.find(c => c.id === clientId);
    if (client) {
      setSelectedClient(client);
      const rawType = client.serviceType || (department === 'negocjacje' ? 'negocjacje' : 'upadlosc');
      // Map legacy 'upadlosc_konsumencka' to 'upadlosc'
      const serviceType = rawType === 'upadlosc_konsumencka' ? 'upadlosc' : rawType;
      setFormData(prev => ({
        ...prev,
        clientName: client.name || '',
        pesel: client.pesel || '',
        idNumber: client.idNumber || '',
        address: client.address || '',
        city: client.city || '',
        postalCode: client.postalCode || '',
        phone: client.phone || '',
        email: client.email || '',
        serviceType,
        servicePrice: client.servicePrice?.toString() || '',
        debtAmount: client.debtAmount?.toString() || '',
        creditorsCount: client.creditorsCount?.toString() || '',
        pricePerCreditor: client.pricePerCreditor?.toString() || '700'
      }));
    }
  }, [availableClients, department]);

  // Auto-open generator when clientId is in URL (link from client profile)
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId && clients.length > 0) {
      handleSelectClient(clientId);
      setShowGenerator(true);
      setSearchParams({}, { replace: true });
    }
  }, [clients, searchParams, handleSelectClient, setSearchParams]);

  const handleShowPreview = () => {
    if (!formData.clientName || !formData.pesel || !formData.servicePrice) {
      showToast('error', 'Wypełnij wymagane pola: Imię i nazwisko, PESEL, Wartość usługi');
      return;
    }

    if (formData.serviceType === 'negocjacje') {
      if (!formData.creditorsCount || Number(formData.creditorsCount) < 1) {
        showToast('error', 'Podaj ilość wierzycieli (min. 1)');
        return;
      }
      if (!formData.pricePerCreditor || Number(formData.pricePerCreditor) < 700) {
        showToast('error', 'Cena za 1 wierzyciela musi wynosić min. 700 zł');
        return;
      }
    }

    if (formData.paymentMode === 'installments' && !installmentsValid) {
      showToast(
        'error',
        'Raty są niepoprawne: sprawdź liczbę rat, daty oraz sumę rat (musi równać się wartości usługi).'
      );
      return;
    }

    setGeneratedDocs(null);
    setShowPreview(true);
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      pesel: '',
      idNumber: '',
      address: '',
      city: '',
      postalCode: '',
      phone: '',
      email: '',
      serviceType: department === 'negocjacje' ? 'negocjacje' : 'upadlosc',
      servicePrice: '',
      debtAmount: '',
      contractDate: new Date().toISOString().slice(0, 10),
      contractPlace: department === 'negocjacje' ? 'Warszawa' : 'Wrocław',
      notes: '',
      paymentMode: 'single',
      singlePaymentDate: new Date().toISOString().slice(0, 10),
      installmentsCount: 2,
      installmentPlanType: 'firstPayment',
      firstPaymentAmount: '',
      firstPaymentDate: new Date().toISOString().slice(0, 10),
      installmentDayOfMonth: 10,
      installmentSchedule: [],
      creditorsCount: '',
      pricePerCreditor: '700'
    });
    setSelectedClient(null);
    setCurrentContractId(null);
    setIsEditingExisting(false);
    setGeneratedDocs(null);
  };

  const generateSinglePdf = async (elementRef, filename) => {
    const el = elementRef.current;

    const opt = {
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: '.no-break'
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: 0,
        scrollX: 0,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const worker = html2pdf().set(opt).from(el).toPdf();
    const pdfBlob = await worker.output('blob');

    return new File([pdfBlob], filename, { type: 'application/pdf' });
  };

  const handleGenerateAll = async () => {
    if (!formData.email) {
      showToast('error', 'Uzupełnij adres email klienta przed generowaniem!');
      return;
    }

    if (formData.paymentMode === 'installments' && !installmentsValid) {
      showToast(
        'error',
        'Raty są niepoprawne: sprawdź liczbę rat, daty oraz sumę rat (musi równać się wartości usługi).'
      );
      return;
    }

    setGenerating(true);

    try {
      const clientSlug = formData.clientName.replace(/\s+/g, '_');
      const dateSlug = formData.contractDate;

      const contractFile = await generateSinglePdf(contractRef, `Umowa_${clientSlug}_${dateSlug}.pdf`);
      const rodoFile = await generateSinglePdf(rodoRef, `RODO_${clientSlug}_${dateSlug}.pdf`);

      const timestamp = Date.now();

      const contractUpload = await uploadFile(contractFile, `contracts/${timestamp}_${contractFile.name}`, () => {});
      const rodoUpload = await uploadFile(rodoFile, `contracts/${timestamp}_${rodoFile.name}`, () => {});

      const docs = {
        contract: { ...contractUpload, fileName: contractFile.name },
        rodo: { ...rodoUpload, fileName: rodoFile.name }
      };

      if (formData.serviceType !== 'negocjacje') {
        const withdrawalFile = await generateSinglePdf(withdrawalRef, `Odstapienie_${clientSlug}_${dateSlug}.pdf`);
        const withdrawalUpload = await uploadFile(withdrawalFile, `contracts/${timestamp}_${withdrawalFile.name}`, () => {});
        docs.withdrawal = { ...withdrawalUpload, fileName: withdrawalFile.name };
      }
      const basePayload = {
        clientId: selectedClient?.id || null,
        clientName: formData.clientName,
        clientEmail: formData.email,
        // dodatkowe dane klienta przydatne przy edycji umowy
        clientPesel: formData.pesel,
        clientIdNumber: formData.idNumber,
        clientAddress: formData.address,
        clientCity: formData.city,
        clientPostalCode: formData.postalCode,
        clientPhone: formData.phone,
        debtAmount: formData.debtAmount ? parseFloat(formData.debtAmount) : null,
        serviceType: formData.serviceType,
        servicePrice: parseFloat(formData.servicePrice),
        contractDate: formData.contractDate,
        generatedBy: currentUser,
        department: department || 'upadlosci',
        // Dane negocjacji (ilość wierzycieli, cena za wierzyciela)
        creditorsCount: formData.serviceType === 'negocjacje' ? (parseInt(formData.creditorsCount) || null) : null,
        pricePerCreditor: formData.serviceType === 'negocjacje' ? (parseFloat(formData.pricePerCreditor) || null) : null,
        documents: docs,
        payment: {
          mode: formData.paymentMode,
          singlePaymentDate: formData.paymentMode === 'single' ? (formData.singlePaymentDate || formData.contractDate) : null,
          installmentsCount: formData.paymentMode === 'installments' ? Number(formData.installmentsCount) : 1,
          planType: formData.paymentMode === 'installments' ? formData.installmentPlanType : null,
          schedule: formData.paymentMode === 'installments' ? installments : []
        }
      };

      let contractId = currentContractId;

      if (isEditingExisting && currentContractId) {
        await updateDoc(doc(db, 'contracts', currentContractId), {
          ...basePayload,
          updatedAt: serverTimestamp()
        });
      } else {
        const newContractRef = await addDoc(collection(db, 'contracts'), {
          ...basePayload,
          createdAt: serverTimestamp(),
          emailSent: false,
          rodoEmailSent: false, // flaga dla RODO
          status: 'generated'
        });
        contractId = newContractRef.id;
      }

      if (typeof setCurrentContractId === 'function' && contractId) {
        setCurrentContractId(contractId);
      }

      if (selectedClient?.id) {
        const clientDocuments = [
          {
            id: `${timestamp}_contract`,
            name: contractFile.name,
            url: contractUpload.url,
            path: contractUpload.path,
            type: 'application/pdf',
            category: 'umowa',
            createdAt: new Date().toISOString(),
            uploadedBy: currentUser
          },
          {
            id: `${timestamp}_rodo`,
            name: rodoFile.name,
            url: rodoUpload.url,
            path: rodoUpload.path,
            type: 'application/pdf',
            category: 'rodo',
            createdAt: new Date().toISOString(),
            uploadedBy: currentUser
          },
          {
            id: `${timestamp}_withdrawal`,
            name: withdrawalFile.name,
            url: withdrawalUpload.url,
            path: withdrawalUpload.path,
            type: 'application/pdf',
            category: 'formularz',
            createdAt: new Date().toISOString(),
            uploadedBy: currentUser
          }
        ];

        for (const documentItem of clientDocuments) {
          await updateDoc(doc(db, 'leads', selectedClient.id), {
            documents: arrayUnion(documentItem)
          });
        }

        // Zapisz dane adresowe i osobowe klienta do leada
        const clientDataUpdate = {};
        if (formData.address) clientDataUpdate.address = formData.address;
        if (formData.city) clientDataUpdate.city = formData.city;
        if (formData.postalCode) clientDataUpdate.postalCode = formData.postalCode;
        if (formData.pesel) clientDataUpdate.pesel = formData.pesel;
        if (formData.idNumber) clientDataUpdate.idNumber = formData.idNumber;
        if (Object.keys(clientDataUpdate).length > 0) {
          await updateDoc(doc(db, 'leads', selectedClient.id), clientDataUpdate);
        }
      }

      setGeneratedDocs(docs);
      showToast(
        'success',
        isEditingExisting ? 'Umowa została zaktualizowana i wygenerowana ponownie.' : 'Umowa została wygenerowana.'
      );
    } catch (error) {
      console.error('Błąd generowania dokumentów:', error);
      showToast('error', 'Wystąpił błąd podczas generowania dokumentów: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadFile = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    if (!generatedDocs) return;
    downloadFile(generatedDocs.contract.url, generatedDocs.contract.fileName);
    setTimeout(() => downloadFile(generatedDocs.rodo.url, generatedDocs.rodo.fileName), 500);
    if (generatedDocs.withdrawal) {
      setTimeout(() => downloadFile(generatedDocs.withdrawal.url, generatedDocs.withdrawal.fileName), 1000);
    }
  };

  // --- ZMODYFIKOWANA FUNKCJA: WYSYŁKA Z POPUPU (TYLKO UMOWA) ---
  const handleSendEmail = async () => {
    if (!formData.email) {
      showToast('error', 'Brak adresu email klienta');
      return;
    }

    if (!generatedDocs) {
      showToast('error', 'Najpierw wygeneruj dokumenty');
      return;
    }

    if (!authUser) {
      showToast('error', 'Musisz być zalogowany, aby wysłać email');
      return;
    }

    setSendingEmail(true);

    try {
      await addDoc(collection(db, 'emailQueue'), {
        clientName: formData.clientName,
        clientEmail: formData.email,
        // WYSYŁAMY TYLKO UMOWĘ z POPUPU
        documents: {
            contract: generatedDocs.contract
        },
        emailType: 'contract_only', // Tagujemy jako tylko umowa
        contractDate: formatDate(formData.contractDate),
        senderName: currentUser,
        contractId: currentContractId,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: authUser.uid
      });

      if (currentContractId) {
        await updateDoc(doc(db, 'contracts', currentContractId), {
          emailSent: true,
          emailSentAt: serverTimestamp(),
          emailSentCount: increment(1),
          lastContractEmailSentAt: serverTimestamp()
        });
      }

      setTimeout(() => {
        setSendingEmail(false);
        showToast('success', `Wysłano samą UMOWĘ do ${formData.email}`);
      }, 3000);
    } catch (error) {
      console.error('Błąd:', error);
      showToast('error', `Błąd wysyłki: ${error.message}`);
      setSendingEmail(false);
    }
  };

  // --- FUNKCJA WYSYŁKI Z LISTY (Obsługuje oba typy) ---
  const handleSendSpecificEmail = async (contract, type) => {
    if (!contract.clientEmail) {
      showToast('error', 'Brak adresu email klienta');
      return;
    }
    if (!authUser) {
      showToast('error', 'Musisz być zalogowany');
      return;
    }
 
    // Wybieramy odpowiednie dokumenty
    let selectedDocs = {};
    
    if (type === 'contract_only') {
        if (!contract.documents?.contract) {
            showToast('error', 'Brak wygenerowanej umowy!');
            return;
        }
        selectedDocs = { contract: contract.documents.contract };
    } 
    else if (type === 'rodo_package') {
        if (!contract.documents?.rodo || !contract.documents?.withdrawal) {
            showToast('error', 'Brak wygenerowanych dokumentów RODO/Odstąpienia!');
            return;
        }
        selectedDocs = { 
            rodo: contract.documents.rodo, 
            withdrawal: contract.documents.withdrawal 
        };
    }
 
    setSendingEmailForContract(contract.id); 
 
    try {
      await addDoc(collection(db, 'emailQueue'), {
        clientName: contract.clientName,
        clientEmail: contract.clientEmail,
        documents: selectedDocs, 
        contractDate: contract.contractDate,
        senderName: currentUser,
        contractId: contract.id,
        emailType: type,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: authUser.uid
      });
 
      // Aktualizacja statusów w zależności od typu
      if (type === 'contract_only') {
        await updateDoc(doc(db, 'contracts', contract.id), {
          emailSent: true,
          emailSentAt: serverTimestamp(),
          emailSentCount: increment(1),
          lastContractEmailSentAt: serverTimestamp()
        });
      } else if (type === 'rodo_package') {
        await updateDoc(doc(db, 'contracts', contract.id), {
          rodoEmailSent: true, // Nowe pole
          rodoEmailSentAt: serverTimestamp(),
          rodoEmailSentCount: increment(1),
          lastRodoEmailSentAt: serverTimestamp()
        });
      }
 
      setTimeout(() => {
        setSendingEmailForContract(null);
        const msg = type === 'contract_only' ? 'Wysłano samą UMOWĘ.' : 'Wysłano RODO i Odstąpienie.';
        showToast('success', msg);
      }, 2000);
 
    } catch (error) {
      console.error('Błąd:', error);
      showToast('error', `Błąd wysyłki: ${error.message}`);
      setSendingEmailForContract(null);
    }
  };

  // Edycja istniejącej umowy – wczytuje dane do formularza i otwiera generator
  const handleEditContract = (contract) => {
    if (contract.status === 'podpisana_przez_klienta') {
      showToast('error', 'Nie można edytować umowy podpisanej przez klienta.');
      return;
    }

    setIsEditingExisting(true);
    setCurrentContractId(contract.id);

    setFormData((prev) => ({
      ...prev,
      clientName: contract.clientName || '',
      pesel: contract.clientPesel || '',
      idNumber: contract.clientIdNumber || '',
      address: contract.clientAddress || '',
      city: contract.clientCity || '',
      postalCode: contract.clientPostalCode || '',
      phone: contract.clientPhone || '',
      email: contract.clientEmail || '',
      serviceType: contract.serviceType === 'upadlosc_konsumencka' ? 'upadlosc' : (contract.serviceType || (department === 'negocjacje' ? 'negocjacje' : 'upadlosc')),
      servicePrice: contract.servicePrice?.toString() || '',
      debtAmount: contract.debtAmount != null ? contract.debtAmount.toString() : '',
      contractDate: contract.contractDate || new Date().toISOString().slice(0, 10),
      contractPlace: prev.contractPlace || (contract.serviceType === 'negocjacje' ? 'Warszawa' : 'Wrocław'),
      paymentMode: contract.payment?.mode || 'single',
      singlePaymentDate: contract.payment?.singlePaymentDate || contract.contractDate || new Date().toISOString().slice(0, 10),
      installmentsCount: contract.payment?.installmentsCount || 2,
      installmentPlanType: contract.payment?.planType || 'firstPayment',
      firstPaymentAmount: (contract.payment?.schedule?.[0]?.amount != null && contract.payment?.planType === 'firstPayment')
        ? String(contract.payment.schedule[0].amount)
        : '',
      installmentSchedule: contract.payment?.schedule || [],
      creditorsCount: contract.creditorsCount?.toString() || '',
      pricePerCreditor: contract.pricePerCreditor?.toString() || '700'
    }));

    setShowGenerator(true);
    setShowPreview(false);
  };

  // Otwarcie modala potwierdzenia usunięcia
  const handleDeleteClick = (contract) => {
    setContractToDelete(contract);
  };

  // Rzeczywiste usunięcie po potwierdzeniu w modalu
  const handleConfirmDelete = async () => {
    if (!contractToDelete) return;
    try {
      await deleteDoc(doc(db, 'contracts', contractToDelete.id));
      showToast('success', 'Umowa została usunięta z listy.');
      setContractToDelete(null);
    } catch (error) {
      console.error('Błąd usuwania umowy:', error);
      showToast('error', 'Nie udało się usunąć umowy: ' + error.message);
      setContractToDelete(null);
    }
  };

  const closeAndReset = () => {
    setShowPreview(false);
    setShowGenerator(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  const paymentSectionSingleNextNo = 2;
  const paymentSectionInstallmentsNextNo = 4;

  const nextNoAfterPayment =
    formData.paymentMode === 'single' ? paymentSectionSingleNextNo : paymentSectionInstallmentsNextNo;

  const num = (offset) => nextNoAfterPayment + offset;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Toast powiadomień */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-600'
                : toast.type === 'error'
                ? 'bg-red-600'
                : 'bg-stone-800'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia umowy */}
      {contractToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onMouseDown={() => setContractToDelete(null)} />
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div
              className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-stone-900">Usuń umowę?</h3>
                  <p className="text-stone-600 text-sm mt-2">
                    Czy na pewno chcesz usunąć umowę dla <strong>{contractToDelete.clientName}</strong>?
                    {contractToDelete.status === 'podpisana_przez_klienta' && (
                      <span className="block mt-1 text-red-600 font-medium">Ta umowa jest podpisana przez klienta!</span>
                    )}
                    {' '}Umowa zniknie z listy. Pliki PDF pozostaną w archiwum.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button
                  onClick={() => setContractToDelete(null)}
                  className="px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 font-medium"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Usuń umowę
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-stone-900">Umowy</h1>
          <p className="text-stone-500 mt-1 text-sm">Generuj umowy dla klientów</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsEditingExisting(false);
            setShowGenerator(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Generuj umowę</span>
        </button>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500 mb-1">Wygenerowanych umów</p>
          <p className="text-2xl font-semibold text-stone-900">{visibleContracts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500 mb-1">Podpisanych</p>
          <p className="text-2xl font-semibold text-emerald-600">
            {visibleContracts.filter(c => c.status === 'podpisana_przez_klienta').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500 mb-1">Oczekuje na podpis</p>
          <p className="text-2xl font-semibold text-amber-600">
            {visibleContracts.filter(c => c.emailSent && c.status !== 'podpisana_przez_klienta').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500 mb-1">Łączna wartość</p>
          <p className="text-2xl font-semibold text-stone-900">
            {formatPLN(visibleContracts.reduce((sum, c) => sum + (c.servicePrice || 0), 0))}
          </p>
        </div>
      </div>

      {/* Lista umów - ZAKTUALIZOWANA */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
            <h2 className="font-semibold text-stone-900">Historia wygenerowanych umów</h2>
            <span className="text-xs text-stone-400">Ostatnia aktualizacja: {new Date().toLocaleTimeString()}</span>
          </div>

          { visibleContracts.length === 0 ? (
            <div className="px-6 py-12 text-center text-stone-400">
              Brak wygenerowanych umów
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {visibleContracts.map((contract) => (
                <div key={contract.id} className="px-6 py-5 hover:bg-stone-50 transition-colors">
                  <div className="flex flex-col gap-4">
                    
                    {/* GÓRA: Dane klienta + Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Dane Klienta */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 text-stone-500">
                          <IconDocument className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-stone-900 text-lg">{contract.clientName}</p>
                            {contract.clientEmail && (
                               <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">
                                 {contract.clientEmail}
                               </span>
                            )}
                          </div>
                          <p className="text-sm text-stone-500 mt-1">
                            {SERVICE_TYPES[contract.serviceType]?.shortLabel || contract.serviceType}
                            {' • '}
                            <span className="font-medium text-stone-700">{formatPLN(contract.servicePrice)}</span>
                            {' • '}
                            {contract.contractDate}
                          </p>
                          <p className="text-xs text-stone-400 mt-1">
                            Gen: {contract.generatedBy}
                          </p>
                        </div>
                      </div>

                      {/* STATUSY WIZUALNE - SEPAROWANE */}
                      <div className="flex flex-col items-end gap-2">
                        {contract.status === 'podpisana_przez_klienta' ? (
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Podpisana przez klienta
                          </span>
                        ) : (
                            // Jeśli nie podpisana, pokazujemy statusy wysyłki
                            <>
                                {contract.emailSent ? (
                                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-blue-100 shadow-sm">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Umowa wysłana
                                  </span>
                                ) : (
                                    <span className="px-3 py-1.5 bg-stone-100 text-stone-500 rounded-full text-xs font-semibold border border-stone-200">
                                        Umowa niewysłana
                                    </span>
                                )}

                                {contract.rodoEmailSent ? (
                                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-sm">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    RODO wysłane
                                  </span>
                                ) : (
                                    <span className="px-3 py-1.5 bg-stone-100 text-stone-400 rounded-full text-xs font-semibold border border-stone-200 opacity-60">
                                        RODO niewysłane
                                    </span>
                                )}
                            </>
                        )}
                        
                        {/* Data wysyłki/podpisu (opcjonalne info) */}
                        {contract.emailSent && contract.emailSentAt && !contract.signedAt && (
                          <span className="text-[10px] text-stone-400">
                            Umowa wysłana: {formatDateTimeSafe(contract.emailSentAt)}
                          </span>
                        )}

                        {(contract.emailSentCount || contract.rodoEmailSentCount) && (
                          <div className="flex flex-col items-end text-[11px] text-stone-400">
                            {contract.emailSentCount > 0 && (
                              <span>
                                Umowa wysłana {contract.emailSentCount}×
                                {contract.lastContractEmailSentAt &&
                                  `, ostatnio: ${formatDateTimeSafe(contract.lastContractEmailSentAt)}`}
                              </span>
                            )}
                            {contract.rodoEmailSentCount > 0 && (
                              <span>
                                RODO wysłane {contract.rodoEmailSentCount}×
                                {contract.lastRodoEmailSentAt &&
                                  `, ostatnio: ${formatDateTimeSafe(contract.lastRodoEmailSentAt)}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DÓŁ: Linki do dokumentów + PRZYCISKI AKCJI */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 mt-2 border-t border-stone-50">
                      
                      {/* Lista plików */}
                      <div className="flex gap-2 flex-wrap">
                        {contract.documents?.contract && (
                          <a href={contract.documents.contract.url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1.5 text-stone-600 hover:text-blue-600 hover:underline">
                            <IconDocument className="w-4 h-4 text-stone-500" /> Umowa
                          </a>
                        )}
                        {contract.documents?.rodo && (
                          <a href={contract.documents.rodo.url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1.5 text-stone-600 hover:text-blue-600 hover:underline">
                            <IconLock className="w-4 h-4 text-stone-500" /> RODO
                          </a>
                        )}
                        {contract.documents?.withdrawal && (
                          <a href={contract.documents.withdrawal.url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1.5 text-stone-600 hover:text-blue-600 hover:underline">
                            <IconWithdrawal className="w-4 h-4 text-stone-500" /> Odstąpienie
                          </a>
                        )}
                      </div>

                      {/* --- SEKCJA PRZYCISKÓW --- */}
                      <div className="flex gap-2 justify-end">
                        {/* Edycja tylko dla niepodpisanych */}
                        {contract.status !== 'podpisana_przez_klienta' && (
                          <button
                            onClick={() => handleEditContract(contract)}
                            className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-50 transition-all"
                          >
                            Edytuj
                          </button>
                        )}
                        {/* Usuwanie dostępne zawsze */}
                        <button
                          onClick={() => handleDeleteClick(contract)}
                          className="px-3 py-1.5 border border-red-200 bg-red-50 rounded-lg text-xs font-medium text-red-700 hover:bg-red-100 transition-all"
                          title="Usuń umowę z listy"
                        >
                          Usuń
                        </button>

                        {/* Przycisk RODO + Odstąpienie */}
                        {contract.documents?.rodo && (
                            <button
                              onClick={() => handleSendSpecificEmail(contract, 'rodo_package')}
                              disabled={sendingEmailForContract === contract.id}
                              className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 ${
                                  contract.rodoEmailSent
                                  ? 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                                  : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400'
                              }`}
                              title="Wyślij tylko RODO i Formularz odstąpienia"
                            >
                              {sendingEmailForContract === contract.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-stone-600"></div>
                              ) : (
                                <IconLock className="w-3.5 h-3.5" />
                              )}
                              {contract.rodoEmailSent ? 'RODO (Wysłano)' : 'Wyślij RODO'}
                            </button>
                        )}

                        {/* Przycisk SAMA UMOWA */}
                        {contract.documents?.contract && contract.status !== 'podpisana_przez_klienta' && (
                            <button
                              onClick={() => handleSendSpecificEmail(contract, 'contract_only')}
                              disabled={sendingEmailForContract === contract.id}
                              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 shadow-sm ${
                                contract.emailSent 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' 
                                  : 'bg-stone-900 text-white hover:bg-stone-800'
                              } disabled:opacity-50`}
                              title="Wyślij samą Umowę do podpisu"
                            >
                              {sendingEmailForContract === contract.id ? (
                                <div className={`animate-spin rounded-full h-3 w-3 border-b-2 ${contract.emailSent ? 'border-blue-700' : 'border-white'}`}></div>
                              ) : (
                                <IconEnvelope className="w-3.5 h-3.5" />
                              )}
                              {contract.emailSent ? 'Umowa (Wysłano)' : 'Wyślij Umowę'}
                            </button>
                        )}

                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Modal generatora */}
      {showGenerator && !showPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onMouseDown={() => setShowGenerator(false)} aria-hidden="true" />
          <div className="relative min-h-full flex items-end md:items-center justify-center p-0 md:p-4" onMouseDown={() => setShowGenerator(false)}>
            <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    {isEditingExisting ? 'Edytuj umowę' : 'Generuj umowę'}
                  </h2>
                  <p className="text-sm text-stone-500">
                    {isEditingExisting ? 'Zmień dane i wygeneruj umowę ponownie' : 'Wypełnij dane klienta'}
                  </p>
                </div>
                <button onClick={() => setShowGenerator(false)} className="p-2 hover:bg-stone-100 rounded-lg">
                  <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6">
                {clients.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Wybierz istniejącego klienta</label>
                    <select
                      onChange={(e) => handleSelectClient(e.target.value)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white"
                    >
                      <option value="">— Wybierz klienta —</option>
                      {availableClients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-stone-900 mb-3">Dane klienta</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Imię i nazwisko *</label>
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="Jan Kowalski"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">PESEL *</label>
                      <input
                        type="text"
                        maxLength={11}
                        value={formData.pesel}
                        onChange={(e) => setFormData(prev => ({ ...prev, pesel: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="12345678901"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Nr dowodu</label>
                      <input
                        type="text"
                        value={formData.idNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="ABC123456"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Adres</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="ul. Przykładowa 1/2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Kod pocztowy</label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="00-000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Miasto</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="Wrocław"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Telefon</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="500 000 000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="jan@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-stone-900 mb-3">Dane umowy</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Typ usługi *</label>
                      <select
                        value={formData.serviceType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            serviceType: newType,
                            contractPlace: newType === 'negocjacje' ? 'Warszawa' : 'Wrocław',
                            // Reset creditor fields when switching away from negocjacje
                            ...(newType !== 'negocjacje' ? { creditorsCount: '', pricePerCreditor: '700', servicePrice: prev.servicePrice } : {})
                          }));
                        }}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white"
                      >
                        {Object.entries(SERVICE_TYPES)
                          .filter(([, value]) => value.department === department)
                          .map(([key, value]) => (
                            <option key={key} value={key}>{value.label}</option>
                          ))}
                      </select>
                    </div>

                    {formData.serviceType === 'negocjacje' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1.5">Ilość wierzycieli *</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.creditorsCount}
                            onChange={(e) => {
                              const count = e.target.value;
                              const price = Number(formData.pricePerCreditor || 700);
                              setFormData(prev => ({
                                ...prev,
                                creditorsCount: count,
                                servicePrice: count ? String(Number(count) * price) : ''
                              }));
                            }}
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                            placeholder="np. 5"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1.5">Cena za 1 wierzyciela (min. 700 zł) *</label>
                          <input
                            type="number"
                            min="700"
                            value={formData.pricePerCreditor}
                            onChange={(e) => {
                              const price = e.target.value;
                              const count = Number(formData.creditorsCount || 0);
                              setFormData(prev => ({
                                ...prev,
                                pricePerCreditor: price,
                                servicePrice: count && price ? String(count * Number(price)) : prev.servicePrice
                              }));
                            }}
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                            placeholder="700"
                          />
                          {Number(formData.pricePerCreditor) > 0 && Number(formData.pricePerCreditor) < 700 && (
                            <p className="text-xs text-red-500 mt-1">Minimalna cena to 700 zł za wierzyciela</p>
                          )}
                        </div>
                        {formData.creditorsCount && formData.pricePerCreditor && (
                          <div className="sm:col-span-2 p-3 bg-violet-50 rounded-lg border border-violet-200">
                            <p className="text-sm text-violet-800">
                              <span className="font-medium">{formData.creditorsCount} wierzycieli</span> × <span className="font-medium">{formatPLN(Number(formData.pricePerCreditor))}</span> = <span className="font-bold">{formatPLN(Number(formData.creditorsCount) * Number(formData.pricePerCreditor))}</span>
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Wartość usługi (PLN) *</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.servicePrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, servicePrice: e.target.value }))}
                        className={`w-full px-4 py-2.5 border border-stone-200 rounded-lg ${formData.serviceType === 'negocjacje' ? 'bg-stone-50 text-stone-500' : ''}`}
                        placeholder="5000"
                        readOnly={formData.serviceType === 'negocjacje'}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Sposób płatności</label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            paymentMode: 'single',
                            singlePaymentDate: prev.singlePaymentDate || prev.contractDate || new Date().toISOString().slice(0, 10)
                          }))}
                          className={`px-4 py-2 rounded-lg border ${
                            formData.paymentMode === 'single'
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-white border-stone-200'
                          }`}
                        >
                          Jednorazowo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => {
                              const count = Math.max(2, Math.min(24, Number(prev.installmentsCount || 2)));
                              const total = Number(prev.servicePrice || 0);
                              const schedule = Array.from({ length: count }, (_, i) => {
                                return prev.installmentSchedule?.[i] || { amount: '', date: prev.contractDate };
                              });
                              const autoFirst = total > 0 && count >= 2 ? round2(total / count) : '';
                              return {
                                ...prev,
                                paymentMode: 'installments',
                                installmentsCount: count,
                                installmentSchedule: schedule,
                                firstPaymentAmount: ''
                              };
                            });
                          }}
                          className={`px-4 py-2 rounded-lg border ${
                            formData.paymentMode === 'installments'
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-white border-stone-200'
                          }`}
                        >
                          Raty
                        </button>
                      </div>
                    </div>

                    {formData.paymentMode === 'single' && (
                      <div className="sm:col-span-2 border border-stone-200 rounded-xl p-4">
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">Data płatności (do kiedy zapłacić)</label>
                        <input
                          type="date"
                          value={formData.singlePaymentDate || formData.contractDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, singlePaymentDate: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        />
                      </div>
                    )}

                    {formData.paymentMode === 'installments' && (
                      <div className="sm:col-span-2 border border-stone-200 rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Liczba rat</label>
                            <input
                              type="number"
                              min={2}
                              max={24}
                              value={formData.installmentsCount}
                              onChange={(e) => ensureScheduleLength(e.target.value)}
                              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Tryb rat</label>
                            <select
                              value={formData.installmentPlanType}
                              onChange={(e) => setFormData(prev => ({ ...prev, installmentPlanType: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white"
                            >
                              <option value="firstPayment">Pierwsza wpłata + reszta miesięcznie</option>
                              <option value="schedule">Ręczny harmonogram (daty i kwoty)</option>
                            </select>
                          </div>
                        </div>

                        {formData.installmentPlanType === 'firstPayment' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-stone-700 mb-1.5">Kwota 1 wpłaty</label>
                              <input
                                type="number"
                                min={0}
                                value={formData.firstPaymentAmount}
                                onChange={(e) => setFormData(prev => ({ ...prev, firstPaymentAmount: e.target.value }))}
                                placeholder={formData.servicePrice && formData.installmentsCount >= 2 ? `Auto: ${formatPLN(round2(Number(formData.servicePrice) / formData.installmentsCount))}` : 'Auto (równe raty)'}
                                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                              />
                              {!formData.firstPaymentAmount && formData.servicePrice && formData.installmentsCount >= 2 && (
                                <p className="text-xs text-stone-500 mt-1">Równy podział: {formatPLN(round2(Number(formData.servicePrice) / formData.installmentsCount))} × {formData.installmentsCount}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-stone-700 mb-1.5">Data 1 wpłaty</label>
                              <input
                                type="date"
                                value={formData.firstPaymentDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, firstPaymentDate: e.target.value }))}
                                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                              />
                            </div>
                            <div className="text-sm text-stone-600 flex items-end">
                              Suma rat musi dać:
                              <span className="ml-2 font-semibold">
                                {formatPLN(Number(formData.servicePrice || 0))}
                              </span>
                            </div>
                          </div>
                        )}

                        {formData.installmentPlanType === 'schedule' && (
                          <div className="space-y-2">
                            {(formData.installmentSchedule || [])
                              .slice(0, formData.installmentsCount)
                              .map((row, idx) => (
                                <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="text-sm text-stone-700 flex items-center">Rata {idx + 1}</div>
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="Kwota"
                                    value={row.amount}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setFormData(prev => {
                                        const next = [...(prev.installmentSchedule || [])];
                                        next[idx] = { ...(next[idx] || { date: prev.contractDate }), amount: value };
                                        return { ...prev, installmentSchedule: next };
                                      });
                                    }}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                                  />
                                  <input
                                    type="date"
                                    value={row.date}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setFormData(prev => {
                                        const next = [...(prev.installmentSchedule || [])];
                                        next[idx] = { ...(next[idx] || { amount: '' }), date: value };
                                        return { ...prev, installmentSchedule: next };
                                      });
                                    }}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                                  />
                                </div>
                              ))}

                            <div className={`text-sm ${installmentsValid ? 'text-emerald-700' : 'text-red-600'}`}>
                              Suma rat: {formatPLN(installmentsTotal)} / {formatPLN(Number(formData.servicePrice || 0))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Kwota zadłużenia (PLN)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.debtAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, debtAmount: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Data umowy</label>
                      <input
                        type="date"
                        value={formData.contractDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, contractDate: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Miejsce zawarcia</label>
                      <input
                        type="text"
                        value={formData.contractPlace}
                        onChange={(e) => setFormData(prev => ({ ...prev, contractPlace: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                        placeholder="Wrocław"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-stone-200 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowGenerator(false)}
                  className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 font-medium"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleShowPreview}
                  className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-medium"
                >
                  Podgląd dokumentów →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal podglądu */}
      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onMouseDown={() => !generating && setShowPreview(false)}></div>
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
              <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    {generatedDocs ? 'Dokumenty wygenerowane' : 'Podgląd dokumentów'}
                  </h2>
                  <p className="text-sm text-stone-500">
                    {generatedDocs ? 'Pobierz dokumenty lub wyślij na email klienta' : 'Sprawdź dane przed wygenerowaniem'}
                  </p>
                </div>
                <button
                  onClick={() => !generating && setShowPreview(false)}
                  disabled={generating}
                  className="p-2 hover:bg-stone-100 rounded-lg disabled:opacity-50"
                >
                  <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {generatedDocs && (
                <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-emerald-700">Dokumenty gotowe:</span>
                    <button
                      onClick={() => downloadFile(generatedDocs.contract.url, generatedDocs.contract.fileName)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 inline-flex items-center gap-2"
                    >
                      <IconDocument className="w-4 h-4" /> Umowa
                    </button>
                    <button
                      onClick={() => downloadFile(generatedDocs.rodo.url, generatedDocs.rodo.fileName)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 inline-flex items-center gap-2"
                    >
                      <IconLock className="w-4 h-4" /> RODO
                    </button>
                    {generatedDocs.withdrawal && (
                    <button
                      onClick={() => downloadFile(generatedDocs.withdrawal.url, generatedDocs.withdrawal.fileName)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 inline-flex items-center gap-2"
                    >
                      <IconWithdrawal className="w-4 h-4" /> Odstąpienie
                    </button>
                    )}
                    <button
                      onClick={downloadAll}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                    >
                      Pobierz wszystkie
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="p-6 space-y-8">
                  {/* 1. UMOWA GŁÓWNA */}
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-stone-900 text-white rounded text-xs flex items-center justify-center">1</span>
                      Umowa na wykonanie usługi
                    </h3>
                    <div
                      ref={contractRef}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        fontFamily: 'Times New Roman, serif',
                        fontSize: '11pt',
                        lineHeight: '1.4',
                        textAlign: 'justify',
                        width: '100%',
                        maxWidth: '210mm',
                        boxSizing: 'border-box',
                        padding: '15mm',
                        margin: '0 auto'
                      }}
                    >
                      {(() => {
                        const cd = formData.serviceType === 'negocjacje' ? NEGOCJACJE_COMPANY_DATA : COMPANY_DATA;
                        return (
                          <>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                              <h1
                                style={{
                                  fontSize: '14pt',
                                  fontWeight: 'bold',
                                  margin: '0 0 10px 0',
                                  textTransform: 'uppercase'
                                }}
                              >
                                UMOWA NA WYKONANIE USŁUGI{formData.serviceType === 'negocjacje' ? ' PRAWNICZEJ' : ''}
                              </h1>
                              <p style={{ margin: 0 }}>
                                zawarta w {formData.contractPlace} w dniu {formatDate(formData.contractDate)} r. pomiędzy:
                              </p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                              {formData.serviceType === 'negocjacje' ? (
                                <p style={{ margin: '0 0 15px 0' }}>
                                  {cd.representationShort}, prowadzącą działalność gospodarczą pod nazwą „<strong>{cd.name}</strong>", NIP: {cd.nip}, {cd.address}, zwaną dalej <strong>Kancelarią</strong>,
                                </p>
                              ) : (
                                <p style={{ margin: '0 0 15px 0' }}>
                                  <strong>{cd.name}</strong> z siedzibą w: {cd.address}, NIP: {cd.nip}, REGON: {cd.regon},
                                  reprezentowaną przez {cd.representation}, zwaną dalej <strong>Kancelarią</strong>,
                                </p>
                              )}
                              <p style={{ margin: '0 0 15px 0', textAlign: 'center' }}>a</p>
                              {formData.serviceType === 'negocjacje' ? (
                                <p style={{ margin: 0 }}>
                                  Pan/Pani {formData.clientName}, nr PESEL {formData.pesel}, zamieszkały/a przy {formData.address}, {formData.postalCode} {formData.city}, zwany/a dalej <strong>Klientem</strong>.
                                </p>
                              ) : (
                                <>
                                  <p style={{ margin: 0 }}>
                                    {formData.clientName} posiadający numer PESEL {formData.pesel}, legitymujący się dowodem osobistym {formData.idNumber},
                                    zamieszkały {formData.address}, {formData.postalCode} {formData.city}, zwany dalej <strong>Klientem</strong>.
                                  </p>
                                  <p style={{ margin: '15px 0 0 0' }}>Zwane dalej Stronami lub każda osobna ze Stron.</p>
                                </>
                              )}
                            </div>
                          </>
                        );
                      })()}

                      {formData.serviceType === 'negocjacje' ? (
                        /* ====== WZÓR UMOWY — NEGOCJACJE Z WIERZYCIELAMI ====== */
                        <>
                          {/* §1 PRZEDMIOT ZLECENIA */}
                          <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>PRZEDMIOT ZLECENIA</div>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 1</div>
                            <p style={{ marginBottom: '10px' }}>
                              Klient zleca a Kancelaria przyjmuje wykonanie następującej usługi: negocjacji spłaty zadłużeń Klienta z maksymalnie <strong>{formData.creditorsCount || '___'}</strong> wierzycielami.
                            </p>
                          </div>
                          <p style={{ marginBottom: '5px' }}>W ramach usługi Kancelaria zobowiązuje się do:</p>
                          <p style={{ marginBottom: '5px', paddingLeft: '30px', textIndent: '-15px' }}>a. poprowadzenia trzech tur negocjacji.</p>
                          <p style={{ marginBottom: '5px', paddingLeft: '30px', textIndent: '-15px' }}>b. pierwsze pismo inicjujące negocjacje, w przypadku braku odpowiedzi ponaglenie lub w przypadku odpowiedzi negatywnej podjęcie dalszych negocjacji poprzez wysłanie dwóch kolejnych pism lub maila lub kontaktu telefonicznego co jest równoznaczne z jedną turą negocjacji.</p>
                          <p style={{ marginBottom: '5px', paddingLeft: '30px', textIndent: '-15px' }}>c. w przypadku konieczności wypełnienia wniosku o restrukturyzację, Kancelaria pomoże w jego wypełnieniu co będzie równoznaczne z wykonaniem jednej tury negocjacji i wypełnieniem warunków umowy.</p>
                          <p style={{ marginBottom: '10px' }}>
                            Niniejsza umowa jest Umową należytej staranności przez co należy rozumieć, że Kancelaria podejmuje starania, aby doprowadzić do obniżenia rat poprzez zawarcie ugody, jednakże nie może zagwarantować, że wierzyciel będzie chciał zawrzeć ugodę, a także czy warunki zaproponowane przez wierzyciela będą dla Klienta satysfakcjonujące.
                          </p>

                          {/* §2 WYNAGRODZENIE */}
                          <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>WYNAGRODZENIE KANCELARII</div>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 2</div>
                            {formData.paymentMode === 'single' ? (
                              <p style={{ marginBottom: '10px' }}>
                                1. Wynagrodzenie Kancelarii wynosi{' '}
                                <strong>{formatPLN(parseFloat(formData.servicePrice || 0))} brutto</strong>
                                , płatne przelewem do dnia{' '}
                                <strong>{formatDate(formData.singlePaymentDate || formData.contractDate)}</strong>.
                              </p>
                            ) : (
                              <p style={{ marginBottom: '10px' }}>
                                1. Wynagrodzenie Kancelarii wynosi{' '}
                                <strong>{formatPLN(parseFloat(formData.servicePrice || 0))} brutto</strong>
                                , płatne w <strong>{formData.installmentsCount}</strong> ratach wg następującego harmonogramu:
                              </p>
                            )}
                          </div>

                          {formData.paymentMode !== 'single' && (
                            <>
                              <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                                {installments.map((r) => (
                                  <li key={r.no}>
                                    Rata {r.no}: <strong>{formatPLN(r.amount)}</strong> płatna do dnia <strong>{formatDate(r.date)}</strong>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          <p style={{ marginBottom: '10px' }}>
                            2. W przypadku braku płatności pierwszej raty Kancelaria nie jest zobowiązana do podjęcia jakichkolwiek czynności, a umowę uważa się za niezawartą. W przypadku braku płatności pozostałych rat, Kancelaria uprawniona jest do wstrzymania czynności i wypowiedzenia Umowy bez konieczności zwrotu już zapłaconych rat.
                          </p>
                          <p style={{ marginBottom: '10px' }}>
                            3. Wynagrodzenie Kancelarii płatne będzie przelewem na rachunek bankowy nr <strong>{NEGOCJACJE_COMPANY_DATA.bankAccount}</strong>, {NEGOCJACJE_COMPANY_DATA.name}.
                          </p>
                          <p style={{ marginBottom: '10px' }}>
                            4. Każde dodatkowe pismo będzie indywidualnie wyceniane, a jego sporządzenie będzie uzależnione od akceptacji wyceny przez Klienta.
                          </p>
                          <p style={{ marginBottom: '10px' }}>
                            5. W przypadku rozwiązania niniejszej Umowy przez Klienta z przyczyn niezależnych od Kancelarii, wynagrodzenie nie podlega zwrotowi.
                          </p>
                          <p style={{ marginBottom: '10px' }}>
                            6. Rozpoczęcie wykonywania usługi po terminie odstąpienia od umowy oznacza, że Klientowi nie przysługuje roszczenie o zwrot wpłaconych rat.
                          </p>

                          {/* §3 POZOSTAŁE POSTANOWIENIA */}
                          <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>POZOSTAŁE POSTANOWIENIA</div>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 3</div>
                            <p style={{ marginBottom: '10px' }}>
                              1. Kancelaria oświadcza, że jej adres do korespondencji mailowej to: <strong>{NEGOCJACJE_COMPANY_DATA.email}</strong>
                            </p>
                          </div>
                          <p style={{ marginBottom: '10px' }}>
                            2. Klient oświadcza, że jego adres do korespondencji mailowej to: <strong>{formData.email}</strong>
                          </p>

                          {/* §4 */}
                          <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>POSTANOWIENIA KOŃCOWE</div>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 4</div>
                            <p style={{ marginBottom: '10px' }}>
                              1. Klient będący konsumentem, który zawarł niniejszą umowę poza lokalem Kancelarii lub na odległość, ma prawo do odstąpienia od umowy bez podania przyczyny i bez ponoszenia kosztów, składając stosowne oświadczenie na piśmie w terminie 14 dni od dnia zawarcia umowy.
                            </p>
                          </div>
                          <p style={{ marginBottom: '10px' }}>
                            2. W przypadku wyrażenia przez Klienta zgody na rozpoczęcie przez Kancelarię wykonywania usługi przed upływem terminu do odstąpienia od umowy, Klient traci prawo odstąpienia w zakresie, w jakim usługa została już wykonana.
                          </p>
                          <p style={{ marginBottom: '10px' }}>
                            3. Klient potwierdza, że został poinformowany o przysługującym mu prawie odstąpienia, a także że może skorzystać ze wzoru formularza odstąpienia stanowiącego załącznik nr 3 do niniejszej umowy, przy czym nie jest to obowiązkowe.
                          </p>

                          {/* §5 */}
                          <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>&nbsp;</div>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 5</div>
                            <p style={{ marginBottom: '10px' }}>
                              1. Zmiany do niniejszej Umowy wymagają formy pisemnej pod rygorem nieważności.
                            </p>
                          </div>
                          <p style={{ marginBottom: '10px' }}>
                            2. Załączniki „Polityka wewnętrzna" oraz „Klauzula informacyjna i zgoda na przetwarzanie danych osobowych" stanowią integralną część niniejszej umowy.
                          </p>
                          <p style={{ marginBottom: '10px' }}>
                            3. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.
                          </p>
                        </>
                      ) : (
                        /* ====== WZÓR UMOWY — UPADŁOŚĆ KONSUMENCKA ====== */
                        <>
                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>PRZEDMIOT ZLECENIA</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 1</div>
                        <p style={{ marginBottom: '10px' }}>
                          Kancelaria zobowiązuje się do przygotowania wniosku o ogłoszenie upadłości konsumenckiej Klienta, sporządzonego w oparciu o informacje
                          i dokumenty przekazane przez Klienta oraz dane pozyskane z publicznych i prywatnych rejestrów gospodarczych.
                        </p>
                      </div>
                      <p style={{ marginBottom: '5px' }}>W ramach usługi Kancelaria:</p>
                      <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                        <li>przeprowadzi wstępną analizę sytuacji prawnej i finansowej Klienta na podstawie udostępnionych dokumentów i informacji,</li>
                        <li>przygotuje wnioski o udzielenie informacji do Krajowego Rejestru Długów, Biura Informacji Kredytowej (BIK) oraz ERIF Biura Informacji Gospodarczej,</li>
                        <li>pomoże Klientowi w skompletowaniu dokumentacji niezbędnej do złożenia wniosku,</li>
                        <li>sporządzi wniosek o ogłoszenie upadłości zgodny z przepisami prawa, przeznaczony do podpisania i złożenia przez Klienta we właściwym sądzie,</li>
                        <li>przekaże Klientowi instrukcję złożenia wniosku wraz ze wskazaniem sądu właściwego i wysokości opłaty sądowej.</li>
                      </ul>
                      <p style={{ marginBottom: '10px' }}>
                        Klient zobowiązuje się do aktywnej współpracy z Kancelarią, w szczególności poprzez rzetelne i terminowe przekazywanie wszystkich wymaganych informacji i dokumentów.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        Klient przyjmuje do wiadomości, że bazy danych, o których mowa w ust. 2 pkt 2, mogą nie zawierać wszystkich jego zobowiązań ani wierzytelności,
                        a Kancelaria nie odpowiada za skutki wynikające z niepełnych lub nieaktualnych informacji ujawnionych w tych rejestrach.
                      </p>
                      <p style={{ marginBottom: '10px' }}>Klient samodzielnie składa wniosek do właściwego sądu i dokonuje stosownej opłaty sądowej.</p>

                      {/* §2 WYNAGRODZENIE */}
                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>WYNAGRODZENIE i KOSZTY KANCELARII</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 2</div>
                        {formData.paymentMode === 'single' ? (
                          <p style={{ marginBottom: '10px' }}>
                            1. Wynagrodzenie Kancelarii za usługę określoną w § 1 wynosi{' '}
                            <strong>{formatPLN(parseFloat(formData.servicePrice || 0))} brutto</strong> i płatne jest przelewem do dnia{' '}
                            <strong>{formatDate(formData.singlePaymentDate || formData.contractDate)}</strong>.
                          </p>
                        ) : (
                          <p style={{ marginBottom: '10px' }}>
                            1. Wynagrodzenie Kancelarii za usługę określoną w § 1 wynosi{' '}
                            <strong>{formatPLN(parseFloat(formData.servicePrice || 0))} brutto</strong>. Klient dokonuje zapłaty w{' '}
                            <strong>{formData.installmentsCount}</strong> ratach zgodnie z harmonogramem poniżej. Od wpłaty pierwszej raty uzależnione jest rozpoczęcie wykonania usługi.
                          </p>
                        )}
                        <p style={{ marginBottom: '10px' }}>
                          Zapłata następuje przelewem na rachunek bankowy Kancelarii nr <strong>{COMPANY_DATA.bankAccount}</strong>.
                        </p>
                      </div>

                      {formData.paymentMode !== 'single' && (
                        <>
                          <p style={{ marginBottom: '10px' }}>2. Harmonogram płatności:</p>
                          <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                            {installments.map((r) => (
                              <li key={r.no}>
                                Rata {r.no}: <strong>{formatPLN(r.amount)}</strong> płatna do dnia <strong>{formatDate(r.date)}</strong>
                              </li>
                            ))}
                          </ul>
                          <p style={{ marginBottom: '10px' }}>
                            3. Brak terminowej zapłaty którejkolwiek raty może skutkować wstrzymaniem wykonywania czynności przez Kancelarię do czasu uregulowania zaległości.
                          </p>
                        </>
                      )}

                      <p style={{ marginBottom: '10px' }}>
                        {num(0)}. Wynagrodzenie obejmuje czynności wskazane w § 1, z wyłączeniem kosztów pozyskania dokumentów i raportów z rejestrów oraz innych kosztów zewnętrznych, które pokrywa Klient zgodnie z ust. 4.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        {num(1)}. Wynagrodzenie, o którym mowa w ust. 1, ma charakter bezzwrotny w przypadku, gdy Kancelaria przystąpi do wykonywania czynności objętych niniejszą umową, w szczególności zamówi raporty, dokona analizy dokumentów lub rozpocznie sporządzanie wniosku.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        {num(2)}. Klient zobowiązuje się do pokrycia wszystkich kosztów związanych z pozyskaniem dokumentów niezbędnych do sporządzenia wniosku, w tym w szczególności:
                      </p>
                      <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                        <li>opłat za raporty Biura Informacji Kredytowej (BIK),</li>
                        <li>opłat za raporty Krajowego Rejestru Długów,</li>
                        <li>opłat za raporty ERIF Biura Informacji Gospodarczej,</li>
                        <li>opłat sądowych i administracyjnych związanych z uzyskaniem dokumentów.</li>
                      </ul>
                      <p style={{ marginBottom: '10px' }}>
                        {num(3)}. O wysokości kosztów, o których mowa w ust. 4, Klient zostanie poinformowany przed ich poniesieniem. Klient zobowiązuje się do ich uiszczenia w terminie 3 dni od wezwania.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        {num(4)}. W przypadku nieuiszczenia kosztów wskazanych w ust. 4 Kancelaria nie ponosi odpowiedzialności za niekompletność wniosku ani negatywne skutki procesowe z tym związane.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        {num(5)}. Sporządzenie dodatkowych pism, opinii, konsultacji lub reprezentacja Klienta w toku postępowania upadłościowego nie jest objęte niniejszą umową i wymaga odrębnej umowy oraz odrębnego wynagrodzenia.
                      </p>

                      {/* §3 ODPOWIEDZIALNOŚĆ KANCELARII */}
                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>ODPOWIEDZIALNOŚĆ KANCELARII</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 3</div>
                        <p style={{ marginBottom: '10px' }}>
                          1. Kancelaria zobowiązuje się do należytej staranności przy wykonywaniu czynności objętych niniejszą umową, zgodnie z obowiązującymi przepisami prawa i zasadami etyki zawodowej.
                        </p>
                      </div>
                      <p style={{ marginBottom: '10px' }}>
                        2. Kancelaria nie ponosi odpowiedzialności za wynik prowadzonych negocjacji albowiem o jego rozstrzygnięciu decyduje wyłącznie sąd.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        3. Kancelaria nie odpowiada za działania lub zaniechania organów wymiaru sprawiedliwości, syndyków ani wierzycieli Klienta.
                      </p>
                      <p style={{ marginBottom: '5px' }}>4. Kancelaria nie ponosi odpowiedzialności za skutki procesowe wynikające z:</p>
                      <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                        <li>podania przez Klienta niepełnych, nieprawdziwych lub wprowadzających w błąd informacji,</li>
                        <li>braku współpracy Klienta lub nieterminowego przekazywania dokumentów,</li>
                        <li>niekompletnych lub nieaktualnych danych ujawnionych w rejestrach gospodarczych, o których mowa w § 1 ust. 2,</li>
                        <li>braku podstaw ustawowych do ogłoszenia upadłości Klienta.</li>
                      </ul>
                      <p style={{ marginBottom: '10px' }}>
                        5. Skutki prawne związane z ogłoszeniem upadłości powstają dopiero z chwilą wydania przez sąd postanowienia o ogłoszeniu upadłości.
                      </p>

                      {/* §4 KOMPLETOWANIE DOKUMENTACJI */}
                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>KOMPLETOWANIE DOKUMENTACJI I CZAS WYKONYWANIA USŁUGI</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 4</div>
                        <p style={{ marginBottom: '10px' }}>
                          1. Strony zgodnie przyjmują, iż sporządzenie kompletnego i prawidłowego wniosku o ogłoszenie upadłości konsumenckiej wymaga uprzedniego zgromadzenia pełnej dokumentacji dotyczącej sytuacji majątkowej i finansowej Klienta oraz jego zobowiązań wobec wierzycieli.
                        </p>
                      </div>
                      <p style={{ marginBottom: '5px' }}>2. Proces kompletowania dokumentacji ma charakter czasochłonny i uzależniony jest w szczególności od:</p>
                      <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                        <li>uzyskania informacji z rejestrów gospodarczych, w tym Krajowego Rejestru Długów, Biura Informacji Kredytowej (BIK) oraz ERIF Biura Informacji Gospodarczej,</li>
                        <li>pozyskania zaświadczeń, odpisów i informacji z urzędów, banków oraz sądów,</li>
                        <li>uzyskania informacji od wierzycieli, którzy mogą dokonywać cesji lub sprzedaży wierzytelności, co może wpływać na czas oraz zakres gromadzonych danych.</li>
                      </ul>
                      <p style={{ marginBottom: '5px' }}>3. Klient przyjmuje do wiadomości, iż sporządzenie wniosku możliwe jest wyłącznie na podstawie:</p>
                      <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                        <li>pełnego i rzetelnego wywiadu przeprowadzonego z Klientem,</li>
                        <li>dokumentów i informacji dostarczonych przez Klienta,</li>
                        <li>danych pozyskanych z rejestrów, o których mowa w ust. 2 pkt 1,</li>
                        <li>informacji uzyskanych od wierzycieli.</li>
                      </ul>
                      <p style={{ marginBottom: '10px' }}>
                        4. Kancelaria zobowiązuje się do sporządzenia wniosku w terminie 14 (czternastu) dni roboczych od dnia otrzymania od Klienta pełnego zestawu dokumentów i informacji niezbędnych do jego przygotowania oraz zakończenia wstępnej weryfikacji w rejestrach wskazanych w ust. 2.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        5. W przypadku braku współpracy Klienta, w szczególności zwłoki w przekazywaniu dokumentów lub informacji, termin, o którym mowa w ust. 4, ulega odpowiedniemu przedłużeniu. Kancelaria nie ponosi odpowiedzialności za opóźnienia wynikające z okoliczności leżących po stronie Klienta, wierzycieli, instytucji lub rejestrów.
                      </p>

                      {/* §5 ODPOWIEDZIALNOŚĆ KLIENTA */}
                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>ODPOWIEDZIALNOŚĆ KLIENTA</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 5</div>
                        <p style={{ marginBottom: '5px' }}>
                          1. Klient zobowiązuje się do pełnej współpracy z Kancelarią przy wykonywaniu niniejszej umowy, w szczególności poprzez:
                        </p>
                      </div>
                      <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                        <li>udzielanie prawdziwych, kompletnych i aktualnych informacji dotyczących jego sytuacji majątkowej, finansowej oraz zobowiązań,</li>
                        <li>terminowe dostarczanie wszystkich wymaganych dokumentów i wyjaśnień,</li>
                        <li>niezwłoczne informowanie Kancelarii o wszelkich zmianach w zakresie sytuacji majątkowej, finansowej lub osobistej, które mogą mieć wpływ na treść wniosku o upadłość.</li>
                      </ul>
                      <p style={{ marginBottom: '10px' }}>
                        2. Klient ponosi pełną odpowiedzialność za prawdziwość, kompletność i aktualność przekazanych informacji i dokumentów.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        3. W przypadku podania informacji nieprawdziwych, niepełnych, nieaktualnych lub zatajania istotnych danych, Kancelaria nie ponosi odpowiedzialności za skutki procesowe, w szczególności za oddalenie bądź odrzucenie wniosku o upadłość przez sąd.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        4. Klient przyjmuje do wiadomości, że brak współpracy z Kancelarią, w tym zwłoka w przekazywaniu dokumentów lub informacji, może spowodować opóźnienie w sporządzeniu wniosku lub jego niekompletność.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        5. W razie rażącego naruszenia obowiązków, o których mowa w ust. 1–4, Kancelaria ma prawo odstąpić od umowy ze skutkiem natychmiastowym, zachowując otrzymane wynagrodzenie oraz żądając zwrotu poniesionych kosztów.
                      </p>

                      {/* §6 ZAKOŃCZENIE USŁUGI */}
                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>ZAKOŃCZENIE USŁUGI I CZYNNOŚCI WYŁĄCZONE Z WYNAGRODZENIA</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 6</div>
                        <p style={{ marginBottom: '10px' }}>
                          1. Obowiązki Kancelarii wynikające z niniejszej umowy kończą się w chwili sporządzenia i przekazania Klientowi kompletnego wniosku o ogłoszenie upadłości konsumenckiej, przygotowanego na podstawie informacji i dokumentów zgromadzonych zgodnie z § 1 oraz § 4.
                        </p>
                      </div>
                      <p style={{ marginBottom: '10px' }}>
                        2. Z chwilą przekazania wniosku Klient samodzielnie dokonuje jego podpisania, złożenia we właściwym sądzie oraz uiszczenia należnej opłaty sądowej.
                      </p>
                      <p style={{ marginBottom: '5px' }}>
                        3. Niniejsza umowa nie obejmuje czynności związanych z dalszym prowadzeniem postępowania upadłościowego. W szczególności poza zakresem wynagrodzenia ustalonego w § 2 pozostaje:
                      </p>
                      <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                        <li>opracowywanie projektów propozycji układowych lub harmonogramów spłat,</li>
                        <li>przygotowywanie odpowiedzi na wezwania i zarządzenia sądu,</li>
                        <li>usuwanie braków formalnych wniosku,</li>
                        <li>sporządzanie dodatkowych wyjaśnień i oświadczeń wymaganych w toku postępowania,</li>
                        <li>prowadzenie korespondencji lub kontaktów z wierzycielami, syndykiem bądź innymi instytucjami.</li>
                      </ul>
                      <p style={{ marginBottom: '10px' }}>
                        4. Czynności wskazane w ust. 3 mogą być wykonywane przez Kancelarię wyłącznie na podstawie odrębnego zlecenia i za dodatkowym wynagrodzeniem, uzgodnionym indywidualnie z Klientem.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        5. Klient przyjmuje do wiadomości, że usługa objęta niniejszą umową ma charakter zamknięty i dotyczy wyłącznie przygotowania wniosku, a wszelkie dalsze czynności w toku postępowania wymagają osobnych ustaleń umownych.
                      </p>

                      {/* §7 POZOSTAŁE POSTANOWIENIA */}
                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>POZOSTAŁE POSTANOWIENIA</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 7</div>
                        <p style={{ marginBottom: '10px' }}>
                          1. Klient w pełni rozumie i przyjmuje do wiadomości, że niniejsza umowa jest umową starannego działania w rozumieniu art. 355 Kodeksu cywilnego, a Kancelaria nie gwarantuje i nie ponosi odpowiedzialności za rozstrzygnięcie sądu w przedmiocie ogłoszenia upadłości, w szczególności za oddalenie bądź odrzucenie wniosku.
                        </p>
                      </div>
                      <p style={{ marginBottom: '10px' }}>
                        2. Klient został poinformowany, że skutki prawne związane z ogłoszeniem upadłości powstają dopiero z chwilą wydania przez sąd prawomocnego postanowienia w tym zakresie.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        3. Klient będący konsumentem, który zawarł niniejszą umowę poza lokalem Kancelarii lub na odległość, ma prawo do odstąpienia od umowy bez podania przyczyny i bez ponoszenia kosztów, składając stosowne oświadczenie na piśmie w terminie 14 dni od dnia zawarcia umowy.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        4. W przypadku wyrażenia przez Klienta zgody na rozpoczęcie przez Kancelarię wykonywania usługi przed upływem terminu do odstąpienia od umowy, Klient traci prawo odstąpienia w zakresie, w jakim usługa została już wykonana.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        5. Klient potwierdza, że został poinformowany o przysługującym mu prawie odstąpienia, a także że może skorzystać ze wzoru formularza odstąpienia stanowiącego załącznik nr 3 do niniejszej umowy, przy czym nie jest to obowiązkowe.
                      </p>

                      {/* §8 DANE KONTAKTOWE */}
                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>DANE KONTAKTOWE</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 8</div>
                        <p style={{ marginBottom: '10px' }}>
                          1. Kancelaria oświadcza, że jej adres do korespondencji mailowej to: <strong>{COMPANY_DATA.email}</strong>
                        </p>
                        <p style={{ marginBottom: '10px' }}>
                          2. Klient oświadcza, że jego adres do korespondencji mailowej to: <strong>{formData.email}</strong>
                        </p>
                      </div>

                      {/* §9 POSTANOWIENIA KOŃCOWE */}
                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0 10px 0' }}>POSTANOWIENIA KOŃCOWE</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 9</div>
                        <p style={{ marginBottom: '10px' }}>
                          1. Wszelkie czynności wykraczające poza zakres niniejszej umowy, w szczególności sporządzanie dodatkowych pism, wyjaśnień, odpowiedzi na wezwania sądu czy opracowywanie harmonogramu spłat, traktowane są jako odrębne zlecenia i wymagają indywidualnej wyceny. Ich wykonywanie nie stanowi zmiany niniejszej umowy i nie wymaga zachowania formy pisemnej przewidzianej dla jej zmian.
                        </p>
                      </div>
                      <p style={{ marginBottom: '10px' }}>2. Zmiany niniejszej umowy w pozostałym zakresie wymagają formy pisemnej pod rygorem nieważności.</p>
                      <p style={{ marginBottom: '10px' }}>
                        3. Klient zobowiązany jest o niezwłocznego informowania Kancelarii o każdej zmianie swojej sytuacji majątkowej, w szczególności o zmianach dotyczących wierzycieli, wysokości lub struktury zobowiązań, oraz do dostarczania zaktualizowanej dokumentacji.
                      </p>
                      <p style={{ marginBottom: '10px' }}>
                        4. Załączniki „Polityka wewnętrzna" oraz „Klauzula informacyjna i zgoda na przetwarzanie danych osobowych" stanowią integralną część niniejszej umowy.
                      </p>
                        </>
                      )}

                      {/* PODPISY */}
                      <div className="no-break" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', width: '45%' }}>
                          <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            {formData.serviceType !== 'negocjacje' && signatures.length > 0 ? (
                              signatures.map(sig => (
                                <img key={sig.id} src={sig.url} alt="Podpis" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                              ))
                            ) : (
                              <span>&nbsp;</span>
                            )}
                          </div>
                          <div style={{ borderTop: '1px solid #000', paddingTop: '5px', marginTop: '5px' }}>
                            {formData.serviceType === 'negocjacje' ? NEGOCJACJE_COMPANY_DATA.name : COMPANY_DATA.name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', width: '45%' }}>
                          <div style={{ height: '60px' }}></div>
                          <div style={{ borderTop: '1px solid #000', paddingTop: '5px', marginTop: '5px' }}>
                            Klient
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '40px', fontSize: '10pt' }}>
                        {formData.serviceType === 'negocjacje' ? (
                          <>
                            <p>Zał. 1 POLITYKA WEWNĘTRZNA KANCELARII PRAWNICZEJ {NEGOCJACJE_COMPANY_DATA.representationShort}</p>
                            <p>Zał. 2 KLAUZULA INFORMACYJNA I ZGODA NA PRZETWARZANIE DANYCH OSOBOWYCH</p>
                          </>
                        ) : (
                          <>
                            <p>Zał. 1 POLITYKA PRYWATNOŚCI i RODO</p>
                            <p>Zał. 2 KLAUZULA INFORMACYJNA I ZGODA NA PRZETWARZANIE DANYCH OSOBOWYCH</p>
                            <p>Zał. 3 – formularz odstąpienia od umowy zawartej na odległość lub poza siedzibą przedsiębiorcy.</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. RODO */}
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-stone-900 text-white rounded text-xs flex items-center justify-center">2</span>
                      Załącznik 1 i 2 - RODO
                    </h3>
                    <div
                      ref={rodoRef}
                      style={{
                        backgroundColor: '#ffffff',
                        padding: '40px',
                        fontSize: '11pt',
                        lineHeight: '1.4',
                        textAlign: 'justify',
                        fontFamily: 'Times New Roman, serif',
                        color: '#000000',
                        maxWidth: '210mm',
                        margin: '0 auto'
                      }}
                    >
                      {formData.serviceType === 'negocjacje' ? (
                        <>
                          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Zał. 1</p>
                          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>POLITYKA WEWNĘTRZNA KANCELARII PRAWNICZEJ {NEGOCJACJE_COMPANY_DATA.representationShort}</p>
                          <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 1</div>
                            <p style={{ marginBottom: '5px' }}>{NEGOCJACJE_COMPANY_DATA.representationShort} zobowiązuje się do:</p>
                            <ul style={{ margin: '0 0 10px 0', paddingLeft: '30px', listStyleType: 'disc' }}>
                              <li>prowadzenia sprawy z poszanowaniem najwyższych standardów wiedzy prawniczej i zgodnie z zasadami etyki radcowskiej;</li>
                              <li>informowania Klienta o statusie sprawy – w szczególności o czynnościach podejmowanych przez sądy i inne organy państwowe;</li>
                              <li>przesyłania Klientowi skanów pism procesowych przeciwnika (bez załączników) oraz skanów orzeczeń sądu;</li>
                              <li>sporządzania pism procesowych i udzielania Klientowi porad związanych z prowadzeniem powierzonej sprawy;</li>
                              <li>osobistego brania udziału w rozprawach sądowych, za wyjątkiem uzasadnionych wypadków, kiedy dopuszczalne będzie wyznaczenie zastępstwa, m.in. w wypadku choroby lub kolizji terminów. Kancelaria bezzwłocznie poinformuje Klienta o niemożności brania udziału w rozprawie przez {NEGOCJACJE_COMPANY_DATA.representationShort} oraz o wyznaczeniu pełnomocnika zastępującego.</li>
                            </ul>
                          </div>
                          <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>§ 2</div>
                            <p style={{ marginBottom: '10px' }}>Klient udzieli radcy prawnemu Paulinie Ewie Zdziech-Pośpieszczyk stosownego pełnomocnictwa do prowadzenia zleconej sprawy. Pełnomocnictwo obejmuje prawo do substytucji. Pełnomocnik może udzielić dalszego pełnomocnictwa wedle własnego uznania.</p>
                            <p style={{ marginBottom: '10px' }}>Klient powinien dostarczyć Kancelarii dokumenty i informacje niezbędne do wykonania zlecenia.</p>
                            <p style={{ marginBottom: '10px' }}>Klient nie powinien samodzielnie i bez konsultacji z Kancelarią składać pism.</p>
                          </div>
                          <p style={{ marginTop: '30px' }}>{formData.contractPlace}, dnia {formatDate(formData.contractDate)}</p>
                          <div style={{ marginTop: '30px', borderTop: '1px dotted #000', width: '250px' }}>
                            <p style={{ textAlign: 'center', fontSize: '10pt', paddingTop: '5px' }}>…………………………………………………</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Zał. 1</p>
                          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>POLITYKA RODO</p>
                          <p style={{ marginBottom: '20px' }}>Może zostać udostępniona do wglądu na stronie</p>
                        </>
                      )}

                      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Zał. 2</p>
                      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>KLAUZULA INFORMACYJNA I ZGODA NA PRZETWARZANIE DANYCH OSOBOWYCH</p>

                      <p style={{ marginBottom: '10px' }}>
                        Zgodnie z art. 13 ust. 1-2 Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WE (ogólne rozporządzenie o ochronie danych) (dalej „RODO") informuję, że:
                      </p>

                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Administrator danych</p>
                        <p style={{ marginBottom: '10px' }}>
                          {formData.serviceType === 'negocjacje'
                            ? <>Administratorem Pani/Pana danych osobowych jest {NEGOCJACJE_COMPANY_DATA.representationShort} prowadzący działalność gospodarczą pod firmą „<strong>{NEGOCJACJE_COMPANY_DATA.name}</strong>" ({NEGOCJACJE_COMPANY_DATA.address}) zwany dalej Kancelarią.</>
                            : <>Administratorem Pani/Pana danych osobowych jest <strong>{COMPANY_DATA.name}</strong> z siedzibą w: {COMPANY_DATA.address}, zwana dalej Kancelarią.</>}
                        </p>
                      </div>

                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Cel przetwarzania</p>
                        <p style={{ marginBottom: '10px' }}>
                          {formData.serviceType === 'negocjacje'
                            ? 'Kancelaria przetwarzać będzie Pani/Pana dane wyłącznie w celu wykonania umowy o udzielenie pomocy prawnej, objętej udzielonym pełnomocnictwem/zleceniem, zgodnie z zasadami wymienionymi w art. 5 RODO. Niedopuszczalne jest przetwarzanie Pani/Pana danych w celu marketingu bezpośredniego.'
                            : 'Dane osobowe będą przetwarzane w celu wykonania umowy o świadczenie pomocy prawnej, w tym przygotowania wniosku o ogłoszenie upadłości konsumenckiej oraz innych czynności związanych z realizacją umowy, na podstawie art. 6 ust. 1 lit. b RODO (wykonanie umowy) oraz art. 6 ust. 1 lit. c RODO (obowiązek prawny ciążący na administratorze).'}
                        </p>
                      </div>
                      {formData.serviceType !== 'negocjacje' && (
                        <p style={{ marginBottom: '10px' }}>
                          W zakresie, w jakim przetwarzane dane mogą obejmować szczególne kategorie danych osobowych (np. dane dotyczące zdrowia, sytuacji rodzinnej lub socjalnej), podstawą przetwarzania jest art. 9 ust. 2 lit. f RODO – przetwarzanie niezbędne do ustalenia, dochodzenia lub obrony roszczeń.
                        </p>
                      )}

                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Prawo do sprzeciwu</p>
                        <p style={{ marginBottom: '10px' }}>
                          W każdej chwili przysługuje Pani/Panu prawo do wniesienia sprzeciwu wobec przetwarzania Pani/Pana danych, przetwarzanych w celu i na podstawie wskazanych powyżej. Kancelaria przestanie przetwarzać Pani/Pana dane w tych celach, chyba że będzie w stanie wykazać, że istnieją ważne, prawnie uzasadnione podstawy, które są nadrzędne wobec Pani/Pana interesów, praw i wolności lub Pani/Pana dane będą niezbędne do ewentualnego ustalenia, dochodzenia lub obrony roszczeń.
                        </p>
                      </div>

                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Okres przetwarzania danych</p>
                        <p style={{ marginBottom: '10px' }}>
                          Kancelaria będzie przechowywać dane przez okres niezbędny dla prawidłowego wykonania umowy/zlecenia, nie dłużej jednak niż do przedawnienia dochodzenia roszczenia lub zatarcia skazania.
                        </p>
                      </div>

                      {formData.serviceType === 'negocjacje' ? (
                        <p style={{ marginBottom: '10px' }}>
                          Pani/Pana dane osobowe mogą zostać przekazywane wyłącznie prawnikom, na których przepisy nakładają obowiązek zachowania tajemnicy – tylko w celu umożliwienia zastępstwa radcy prawnego prowadzącego Pani/Pana sprawę lub pracownikom kancelarii, którym powierzono przetwarzanie danych osobowych i którzy ponoszą odpowiedzialność za naruszenie zasad przetwarzania.
                        </p>
                      ) : (
                        <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Odbiorcy danych</p>
                          <p style={{ marginBottom: '10px' }}>
                            Pani/Pana dane mogą być przekazywane wyłącznie osobom współpracującym z Kancelarią na podstawie umów powierzenia, w szczególności radcom prawnym, adwokatom i pracownikom kancelarii zobowiązanym do zachowania tajemnicy zawodowej i odpowiedzialnym za przestrzeganie zasad ochrony danych.
                          </p>
                        </div>
                      )}

                      <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Inne prawa</p>
                        <p style={{ marginBottom: '5px' }}>Zgodnie z RODO, przysługuje Pani/Panu prawo do:</p>
                        <p style={{ marginBottom: '0', paddingLeft: '20px' }}>a) dostępu do swoich danych oraz otrzymania ich kopii,</p>
                        <p style={{ marginBottom: '0', paddingLeft: '20px' }}>b) sprostowania (poprawiania) swoich danych,</p>
                        <p style={{ marginBottom: '0', paddingLeft: '20px' }}>c) żądania usunięcia, ograniczenia lub wniesienia sprzeciwu wobec ich przetwarzania,</p>
                        <p style={{ marginBottom: '0', paddingLeft: '20px' }}>d) przenoszenia danych,</p>
                        <p style={{ marginBottom: '10px', paddingLeft: '20px' }}>e) wniesienia skargi do organu nadzorczego.</p>
                      </div>

                      <p style={{ marginBottom: '10px' }}>
                        Podanie danych jest dobrowolne z tym, że odmowa ich podania może utrudnić albo uniemożliwić wykonanie umowy/usługi i należytą pomoc prawną.
                      </p>
                      <p style={{ marginBottom: '10px' }}>Kancelaria nie podejmuje decyzji w sposób zautomatyzowany i Pani/Pana dane nie są profilowane.</p>
                      <p style={{ marginBottom: '10px' }}>
                        W każdej chwili przysługuje Pani/Panu prawo do wycofania zgody na przetwarzanie Pani/Pana danych osobowych, (w tym należących do szczególnej kategorii), ale cofnięcie zgody nie wpływa na zgodność z prawem przetwarzania, którego dokonano zgodnie z prawem, przed jej wycofaniem.
                      </p>

                      <p style={{ marginTop: '30px' }}>{formData.contractPlace}, dnia {formatDate(formData.contractDate)}</p>
                      <div style={{ marginTop: '30px', borderTop: '1px dotted #000', width: '250px' }}>
                        <p style={{ textAlign: 'center', fontSize: '10pt', paddingTop: '5px' }}>…………………………………………………</p>
                      </div>

                      <p style={{ marginTop: '30px' }}>
                        Wyrażam zgodę na przetwarzanie moich danych osobowych, przez Kancelarię w celu udzielenia mi pomocy prawnej, wykonania umowy/usługi.
                      </p>

                      <p style={{ marginTop: '30px' }}>{formData.contractPlace}, dnia {formatDate(formData.contractDate)}</p>
                      <div style={{ marginTop: '30px', borderTop: '1px dotted #000', width: '250px' }}>
                        <p style={{ textAlign: 'center', fontSize: '10pt', paddingTop: '5px' }}>…………………………………………………</p>
                      </div>
                    </div>
                  </div>

                  {/* 3. ODSTĄPIENIE — tylko dla upadłości */}
                  {formData.serviceType !== 'negocjacje' && (
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-stone-900 text-white rounded text-xs flex items-center justify-center">3</span>
                      Formularz odstąpienia
                    </h3>
                    <div
                      ref={withdrawalRef}
                      style={{
                        backgroundColor: '#ffffff',
                        padding: '40px',
                        fontSize: '11pt',
                        lineHeight: '1.6',
                        textAlign: 'justify',
                        fontFamily: 'Times New Roman, serif',
                        color: '#000000',
                        maxWidth: '210mm',
                        margin: '0 auto'
                      }}
                    >
                      <p style={{ fontWeight: 'bold' }}>
                        Zał. 3 – formularz odstąpienia od umowy zawartej na odległość lub poza siedzibą przedsiębiorcy
                      </p>

                      <div style={{ marginTop: '30px' }}>
                        <p>................................................</p>
                        <p>................................................</p>
                        <p>................................................</p>
                        <p>(imię, nazwisko i adres konsumenta/-ów)</p>
                      </div>

                      <div style={{ marginTop: '20px' }}>
                        <p><strong>{COMPANY_DATA.name}</strong></p>
                        <p>{COMPANY_DATA.address}</p>
                        <p>{COMPANY_DATA.email}</p>
                      </div>

                      <div style={{ textAlign: 'center', margin: '30px 0', fontWeight: 'bold' }}>
                        <p>Formularz</p>
                        <p>odstąpienia od umowy zawartej na odległość lub poza siedzibą przedsiębiorcy</p>
                        <p style={{ fontWeight: 'normal', fontSize: '10pt' }}>
                          (formularz ten należy wypełnić i przesłać do Kancelarii tylko w przypadku chęci odstąpienia od Umowy)
                        </p>
                      </div>

                      <p style={{ marginBottom: '20px' }}>
                        Niniejszym informujmy o naszym odstąpieniu od umowy na zastępstwo procesowe z dnia {formatDate(formData.contractDate)}
                      </p>

                      <p>Zwrot wynagrodzenia powinien nastąpić na numer rachunku</p>
                      <p>…………………………………………………………………</p>
                      <p>bądź poprzez</p>
                      <p>……….…………………………………………………………………………………………………</p>

                      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <p>…………………………………………………….….	</p>
                          <p>(data złożenia oświadczenia)</p>
                        </div>
                      </div>

                      <div style={{ marginTop: '40px' }}>
                        <p>……………………………………………….……….	</p>
                        <p>(Podpis konsumenta/-ów wymagany jest tylko, jeżeli formularz jest przesyłany w wersji papierowej)</p>
                      </div>
                    </div>
                  </div>
                  )}

                </div>
              </div>

              <div className="px-6 py-4 border-t border-stone-200 flex flex-wrap gap-3 flex-shrink-0">
                {!generatedDocs ? (
                  <>
                    <button
                      onClick={() => setShowPreview(false)}
                      disabled={generating}
                      className="flex-1 min-w-[120px] px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 font-medium disabled:opacity-50"
                    >
                      ← Wróć
                    </button>
                    <button
                      onClick={handleGenerateAll}
                      disabled={generating}
                      className="flex-1 min-w-[200px] px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Generowanie...
                        </>
                      ) : 'Generuj dokumenty'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={closeAndReset}
                      className="flex-1 min-w-[120px] px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 font-medium"
                    >
                      Zamknij
                    </button>
                    {/* PRZYCISK WYSYŁAJĄCY TYLKO UMOWĘ Z MODALA */}
                    <button
                      onClick={handleSendEmail}
                      disabled={sendingEmail || !formData.email}
                      className="flex-1 min-w-[200px] px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {sendingEmail ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Wysyłanie...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Wyślij UMOWĘ ({formData.email || 'brak'})
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;