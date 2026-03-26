import React from 'react';
import { FileText, CheckCircle2, Settings, Shield, AlertCircle, Mail } from 'lucide-react';
import SEO from '../../../components/SEO';

const TermsOfService = () => {
    return (
        <>
            <SEO
                title="Regulamin - Zasady Korzystania ze Strony | Wyjście z Długów"
                description="Regulamin świadczenia usług drogą elektroniczną. Zasady korzystania ze strony internetowej i formularza kontaktowego."
                keywords="regulamin, zasady korzystania, usługi elektroniczne, formularz kontaktowy"
                image="/logo.png"
                url={typeof window !== 'undefined' ? `${window.location.origin}/regulamin` : 'https://wyjscie-z-dlugow.pl/regulamin'}
            />
            <div className="overflow-hidden">
            {/* HERO SECTION */}
            <section className="relative py-20 sm:py-24 lg:py-32 bg-slate-900 pt-28 sm:pt-32">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    <div className="absolute top-1/3 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6 sm:mb-8">
                            <FileText className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 text-xs sm:text-sm font-medium">Regulamin usług</span>
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6">
                            Regulamin Świadczenia Usług Drogą Elektroniczną
                        </h1>
                        
                        <p className="text-base sm:text-lg lg:text-xl text-slate-400 leading-relaxed">
                            Poniżej znajdziesz szczegółowe zasady korzystania z naszej strony internetowej 
                            oraz świadczenia usług drogą elektroniczną.
                        </p>
                    </div>
                </div>
            </section>

            {/* MAIN CONTENT */}
            <section className="py-16 sm:py-20 lg:py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="prose prose-slate max-w-none">
                        
                        {/* § 1 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 1. Postanowienia ogólne
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Niniejszy Regulamin określa zasady korzystania ze strony internetowej dostępnej pod adresem 
                                    <span className="font-semibold text-slate-900"> wyjscie-z-dlugow.pl</span> oraz zasady świadczenia usług drogą elektroniczną.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Właścicielem serwisu i Usługodawcą jest: 
                                    <span className="font-semibold text-slate-900"> KWZD SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</span> z siedzibą w 
                                    <span className="font-semibold text-slate-900"> Wrocławiu</span>, adres: 
                                    <span className="font-semibold text-slate-900"> Św. Mikołaja 8/11 / 208, 50-125 Wrocław, Polska</span>, wpisana do KRS pod numerem: 
                                    <span className="font-semibold text-slate-900"> 0001217909</span>, NIP: 
                                    <span className="font-semibold text-slate-900"> 8971965477</span>, REGON: 
                                    <span className="font-semibold text-slate-900"> w trakcie uzyskiwania</span>, kapitał zakładowy: 
                                    <span className="font-semibold text-slate-900"> 5 000</span> zł.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                    Kontakt z Usługodawcą możliwy jest pod adresem e-mail: 
                                    <span className="font-semibold text-slate-900"> kontakt@wyjscie-z-dlugow.pl</span>.
                                </p>
                            </div>
                        </div>

                        {/* § 2 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 2. Rodzaje i zakres usług
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Usługodawca świadczy za pośrednictwem serwisu następujące usługi elektroniczne:
                                </p>
                                
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">a)</span>
                                        <span>Udostępnianie treści informacyjnych dotyczących oferty oddłużeniowej i prawnej Kancelarii.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">b)</span>
                                        <span>Udostępnianie interaktywnego formularza kontaktowego umożliwiającego przesłanie zapytania lub prośby o kontakt.</span>
                                    </li>
                                </ul>
                                
                                <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 mb-4">
                                    <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                        <span className="font-semibold text-slate-900">Korzystanie z wyżej wymienionych usług jest bezpłatne.</span>
                                    </p>
                                </div>
                                
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                    Umowa o świadczenie usługi polegającej na udostępnieniu formularza kontaktowego zawierana jest na czas oznaczony 
                                    i ulega rozwiązaniu z chwilą wysłania wiadomości lub zaprzestania ich wysyłania przez Użytkownika.
                                </p>
                            </div>
                        </div>

                        {/* § 3 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 3. Warunki techniczne
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Do prawidłowego korzystania z serwisu niezbędne jest:
                                </p>
                                
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">a)</span>
                                        <span>Posiadanie urządzenia z dostępem do sieci Internet.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">b)</span>
                                        <span>Posiadanie przeglądarki internetowej obsługującej pliki cookies (np. Chrome, Firefox, Opera, Safari).</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">c)</span>
                                        <span>Posiadanie aktywnego adresu e-mail (w przypadku chęci skorzystania z formularza kontaktowego).</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* § 4 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 4. Obowiązki Użytkownika
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Użytkownik zobowiązany jest do korzystania z serwisu w sposób zgodny z prawem i dobrymi obyczajami.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Zakazane jest dostarczanie przez Użytkownika treści o charakterze bezprawnym, w szczególności:
                                </p>
                                
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">a)</span>
                                        <span>Danych naruszających dobra osobiste osób trzecich.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">b)</span>
                                        <span>Treści wulgarnych, obraźliwych lub promujących nielegalne działania.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">c)</span>
                                        <span>Oprogramowania złośliwego lub spamu.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* § 5 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 5. Tryb postępowania reklamacyjnego
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    W przypadku nieprawidłowego działania formularza lub innych usług serwisu, Użytkownik ma prawo złożyć reklamację.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Reklamacje należy zgłaszać drogą elektroniczną na adres: 
                                    <span className="font-semibold text-slate-900"> kontakt@wyjscie-z-dlugow.pl</span>.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Zgłoszenie powinno zawierać opis problemu oraz datę jego wystąpienia.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                    Usługodawca rozpatrzy reklamację w terminie 14 dni od daty jej otrzymania i poinformuje Użytkownika 
                                    o wyniku postępowania na adres e-mail nadawcy.
                                </p>
                            </div>
                        </div>

                        {/* § 6 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 6. Postanowienia końcowe
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Administratorem danych osobowych przetwarzanych w związku z realizacją usług jest Usługodawca. 
                                    Szczegóły zawarte są w Polityce Prywatności dostępnej w serwisie.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                    W sprawach nieuregulowanych w niniejszym Regulaminie mają zastosowanie przepisy Kodeksu Cywilnego 
                                    oraz Ustawy o świadczeniu usług drogą elektroniczną.
                                </p>
                            </div>
                        </div>

                        {/* Contact Info Box */}
                        <div className="bg-slate-900 rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-amber-500/10 rounded-full blur-2xl" />
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                                    <h3 className="text-lg sm:text-xl font-bold text-white">Masz pytania?</h3>
                                </div>
                                <p className="text-slate-300 leading-relaxed mb-4 text-sm sm:text-base">
                                    Jeśli masz jakiekolwiek pytania dotyczące regulaminu lub chcesz złożyć reklamację, 
                                    skontaktuj się z nami.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <a 
                                        href="mailto:kontakt@wyjscie-z-dlugow.pl" 
                                        className="inline-flex items-center justify-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors text-sm sm:text-base"
                                    >
                                        Napisz do nas
                                    </a>
                                    <a 
                                        href="tel:+48795767711" 
                                        className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm sm:text-base"
                                    >
                                        Zadzwoń
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </div>
        </>
    );
};

export default TermsOfService;
