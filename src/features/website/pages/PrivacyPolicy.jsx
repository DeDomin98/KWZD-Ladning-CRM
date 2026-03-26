import React from 'react';
import { Shield, FileText, Lock, Eye, UserCheck, Cookie } from 'lucide-react';
import SEO from '../../../components/SEO';

const PrivacyPolicy = () => {
    return (
        <>
            <SEO
                title="Polityka Prywatności - Ochrona Danych Osobowych | Wyjście z Długów"
                description="Polityka prywatności i plików cookies. Dowiedz się, jak przetwarzamy Twoje dane osobowe. Pełna transparentność i zgodność z RODO."
                keywords="polityka prywatności, RODO, ochrona danych osobowych, cookies, ciasteczka, dane osobowe"
                image="/logo.png"
                url={typeof window !== 'undefined' ? `${window.location.origin}/polityka-prywatnosci` : 'https://wyjscie-z-dlugow.pl/polityka-prywatnosci'}
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
                            <Shield className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 text-xs sm:text-sm font-medium">Ochrona danych</span>
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6">
                            Polityka Prywatności i Plików Cookies
                        </h1>
                        
                        <p className="text-base sm:text-lg lg:text-xl text-slate-400 leading-relaxed">
                            Szanujemy Twoją prywatność. Poniżej znajdziesz szczegółowe informacje o tym, 
                            jak przetwarzamy Twoje dane osobowe.
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
                                    Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych 
                                    przekazywanych przez Użytkowników w związku z korzystaniem przez nich ze strony internetowej 
                                    <span className="font-semibold text-slate-900"> wyjscie-z-dlugow.pl</span>.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Administratorem danych osobowych zawartych w serwisie jest: 
                                    <span className="font-semibold text-slate-900"> KWZD SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</span> z siedzibą w 
                                    <span className="font-semibold text-slate-900"> Wrocławiu</span>, przy ul. 
                                    <span className="font-semibold text-slate-900"> Św. Mikołaja 8/11 / 208</span>, kod pocztowy 
                                    <span className="font-semibold text-slate-900"> 50-125</span>, wpisana do rejestru przedsiębiorców 
                                    Krajowego Rejestru Sądowego prowadzonego przez Sąd Rejonowy dla Wrocławia-Śródmieścia we Wrocławiu, pod numerem KRS: 
                                    <span className="font-semibold text-slate-900"> 0001217909</span>, NIP: 
                                    <span className="font-semibold text-slate-900"> 8971965477</span>, REGON: 
                                    <span className="font-semibold text-slate-900"> w trakcie uzyskiwania</span>, o kapitale zakładowym w wysokości 
                                    <span className="font-semibold text-slate-900"> 5 000</span> zł (dalej: „Administrator").
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Kontakt z Administratorem odbywa się poprzez adres e-mail: 
                                    <span className="font-semibold text-slate-900"> kontakt@wyjscie-z-dlugow.pl</span> lub telefonicznie pod numerem: 
                                    <span className="font-semibold text-slate-900"> +48 795 767 711</span>.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                    Dane osobowe przetwarzane są zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 
                                    z dnia 27 kwietnia 2016 r. (RODO).
                                </p>
                            </div>
                        </div>

                        {/* § 2 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 2. Cele i podstawy przetwarzania danych
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-6 text-sm sm:text-base">
                                    Administrator przetwarza dane osobowe Użytkowników (takie jak: imię, nazwisko, numer telefonu, adres e-mail) 
                                    w następujących celach:
                                </p>
                                
                                <div className="space-y-4">
                                    <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200">
                                        <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">
                                            Obsługa formularza kontaktowego
                                        </h3>
                                        <p className="text-slate-600 text-sm sm:text-base">
                                            Udzielenie odpowiedzi na zapytanie przesłane przez formularz, co stanowi prawnie uzasadniony 
                                            interes Administratora (art. 6 ust. 1 lit. f RODO).
                                        </p>
                                    </div>
                                    
                                    <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200">
                                        <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">
                                            Przedstawienie oferty
                                        </h3>
                                        <p className="text-slate-600 text-sm sm:text-base">
                                            Podjęcie działań na żądanie osoby, której dane dotyczą, przed zawarciem umowy o świadczenie 
                                            usług prawnych/oddłużeniowych (art. 6 ust. 1 lit. b RODO).
                                        </p>
                                    </div>
                                    
                                    <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200">
                                        <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">
                                            Marketing bezpośredni
                                        </h3>
                                        <p className="text-slate-600 text-sm sm:text-base">
                                            Przesyłanie informacji handlowych drogą elektroniczną lub kontakt telefoniczny w celu marketingu 
                                            własnych usług – wyłącznie na podstawie dobrowolnie udzielonej zgody (art. 6 ust. 1 lit. a RODO).
                                        </p>
                                    </div>
                                    
                                    <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200">
                                        <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">
                                            Cele analityczne i statystyczne
                                        </h3>
                                        <p className="text-slate-600 text-sm sm:text-base">
                                            Ulepszanie struktury strony internetowej i dopasowywanie treści do potrzeb użytkowników 
                                            (art. 6 ust. 1 lit. f RODO).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* § 3 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 3. Odbiorcy danych
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Dane osobowe Użytkowników mogą być przekazywane podmiotom współpracującym z Administratorem, 
                                    wyłącznie w zakresie niezbędnym do realizacji celów przetwarzania. Należą do nich:
                                </p>
                                
                                <ul className="space-y-3 mb-4">
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">a)</span>
                                        <span>Firmy świadczące usługi hostingowe i informatyczne (utrzymanie strony www, serwery pocztowe).</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">b)</span>
                                        <span>Podmioty świadczące obsługę prawną i księgową Administratora.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">c)</span>
                                        <span>Upoważnieni pracownicy i współpracownicy Administratora.</span>
                                    </li>
                                </ul>
                                
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                    Dane nie będą przekazywane do państw trzecich (poza Europejski Obszar Gospodarczy).
                                </p>
                            </div>
                        </div>

                        {/* § 4 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 4. Prawa Użytkownika
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Każdemu Użytkownikowi przysługuje prawo do:
                                </p>
                                
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">a)</span>
                                        <span>Dostępu do treści swoich danych.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">b)</span>
                                        <span>Sprostowania (poprawiania) danych.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">c)</span>
                                        <span>Usunięcia danych ("prawo do bycia zapomnianym").</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">d)</span>
                                        <span>Ograniczenia przetwarzania.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">e)</span>
                                        <span>Przenoszenia danych.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">f)</span>
                                        <span>Wniesienia sprzeciwu wobec przetwarzania.</span>
                                    </li>
                                </ul>
                                
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    W przypadku, gdy przetwarzanie odbywa się na podstawie zgody, Użytkownik ma prawo do jej cofnięcia 
                                    w dowolnym momencie.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                    Użytkownik ma prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych, jeśli uzna, 
                                    że przetwarzanie narusza przepisy RODO.
                                </p>
                            </div>
                        </div>

                        {/* § 5 */}
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Cookie className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                                        § 5. Pliki Cookies (Ciasteczka)
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-slate-100">
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Strona internetowa wykorzystuje pliki cookies. Są to niewielkie pliki tekstowe wysyłane przez serwer www 
                                    i przechowywane przez oprogramowanie komputera przeglądarki.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed mb-4 text-sm sm:text-base">
                                    Cookies wykorzystywane są w celu:
                                </p>
                                
                                <ul className="space-y-3 mb-4">
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">a)</span>
                                        <span>Dostosowania zawartości strony do preferencji Użytkownika.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">b)</span>
                                        <span>Tworzenia statystyk, które pomagają zrozumieć, w jaki sposób Użytkownicy korzystają ze strony 
                                        (np. Google Analytics).</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 text-sm sm:text-base">
                                        <span className="text-amber-600 font-bold mt-1">c)</span>
                                        <span>Marketingowym (np. w celu kierowania reklam do osób, które odwiedziły stronę – tzw. remarketing).</span>
                                    </li>
                                </ul>
                                
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                    Użytkownik może w każdej chwili wyłączyć lub przywrócić opcję gromadzenia cookies poprzez zmianę ustawień 
                                    w przeglądarce internetowej.
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
                                    Administrator stosuje środki techniczne i organizacyjne zapewniające ochronę przetwarzanych danych osobowych 
                                    odpowiednią do zagrożeń oraz kategorii danych objętych ochroną.
                                </p>
                                
                                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                                    Polityka Prywatności może ulec zmianie, o czym Administrator poinformuje poprzez opublikowanie nowej treści 
                                    na stronie internetowej.
                                </p>
                            </div>
                        </div>

                        {/* Contact Info Box */}
                        <div className="bg-slate-900 rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-amber-500/10 rounded-full blur-2xl" />
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                                    <h3 className="text-lg sm:text-xl font-bold text-white">Masz pytania?</h3>
                                </div>
                                <p className="text-slate-300 leading-relaxed mb-4 text-sm sm:text-base">
                                    Jeśli masz jakiekolwiek pytania dotyczące przetwarzania Twoich danych osobowych, 
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

export default PrivacyPolicy;
