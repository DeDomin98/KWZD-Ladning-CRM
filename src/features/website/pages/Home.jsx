import React from 'react';
import { ArrowRight, CheckCircle2, Phone, FileCheck, Scale, Shield, Handshake, Users, Clock, Star, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Link } from 'react-router-dom';
import SEO from '../../../components/SEO';

const Home = () => {
    const services = [
        {
            icon: <Scale className="w-6 h-6 sm:w-7 sm:h-7" />,
            title: "Upadłość Konsumencka",
            description: "Całkowite oddłużenie na drodze sądowej. Prowadzimy sprawę od początku do końca.",
            highlight: true,
        },
        {
            icon: <Handshake className="w-6 h-6 sm:w-7 sm:h-7" />,
            title: "Negocjacje z Wierzycielami",
            description: "Wynegocjujemy umorzenie odsetek, rozłożenie na raty lub ugodę z bankiem.",
            highlight: false,
        },
        {
            icon: <FileCheck className="w-6 h-6 sm:w-7 sm:h-7" />,
            title: "Restrukturyzacja Zadłużenia",
            description: "Kompleksowe uporządkowanie Twojej sytuacji finansowej i plan wyjścia z długów.",
            highlight: false,
        },
    ];

    const processSteps = [
        {
            number: "01",
            title: "Bezpłatna rozmowa",
            description: "Zadzwoń do nas. Wysłuchamy Twojej sytuacji i ocenimy możliwości.",
        },
        {
            number: "02",
            title: "Analiza dokumentów",
            description: "Przeanalizujemy Twoje zadłużenie i zaproponujemy najlepsze rozwiązanie.",
        },
        {
            number: "03",
            title: "Działanie",
            description: "Przejmujemy kontakt z wierzycielami. Ty odzyskujesz spokój.",
        },
    ];

    const benefits = [
        "Bezpłatna wstępna konsultacja",
        "Pełna dyskrecja i poufność",
        "Jasne zasady współpracy",
        "Stały kontakt z opiekunem",
    ];

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "LegalService",
        "name": "Kancelaria Wyjście z Długów",
        "description": "Specjalizujemy się w upadłości konsumenckiej, negocjacjach z wierzycielami i restrukturyzacji zadłużenia. Pomagamy osobom zadłużonym w całej Polsce.",
        "url": typeof window !== 'undefined' ? window.location.origin : 'https://wyjscie-z-dlugow.pl',
        "telephone": "+48795767711",
        "email": "kontakt@wyjscie-z-dlugow.pl",
        "areaServed": {
            "@type": "Country",
            "name": "Poland"
        },
        "serviceType": [
            "Upadłość konsumencka",
            "Negocjacje z wierzycielami",
            "Restrukturyzacja zadłużenia"
        ],
        "priceRange": "$$",
        "address": {
            "@type": "PostalAddress",
            "addressCountry": "PL"
        }
    };

    return (
        <>
            <SEO
                title="Wyjście z Długów - Upadłość Konsumencka | Oddłużenie | Pomoc w Długach"
                description="Przestań odbierać telefony od windykacji. Zajmiemy się Twoją sprawą, wynegocjujemy warunki i przeprowadzimy Cię przez proces oddłużenia. Bezpłatna konsultacja. Cała Polska."
                keywords="upadłość konsumencka, oddłużenie, negocjacje z wierzycielami, restrukturyzacja zadłużenia, pomoc w długach, kancelaria oddłużeniowa, umorzenie długów, wyjście z długów"
                image="/logo.png"
                url={typeof window !== 'undefined' ? window.location.origin : 'https://wyjscie-z-dlugow.pl'}
                structuredData={structuredData}
            />
            <div className="overflow-hidden">
            {/* HERO SECTION */}
            <section className="relative min-h-screen flex items-center bg-slate-900 pt-16 sm:pt-20">
                {/* Background Effects */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-slate-700/30 rounded-full blur-3xl" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        
                        {/* Left Content */}
                        <div className="text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6 sm:mb-8">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-amber-400 text-xs sm:text-sm font-medium">Specjaliści od oddłużania</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6">
                                Uwolnij się od
                                <span className="block mt-2 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                                    ciężaru długów
                                </span>
                            </h1>

                            <p className="text-base sm:text-lg text-slate-400 mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                                Przestań odbierać telefony od windykacji. Zajmiemy się Twoją sprawą, 
                                wynegocjujemy warunki i przeprowadzimy Cię przez proces oddłużenia.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-10 sm:mb-12">
                                <Link to="/kontakt" className="w-full sm:w-auto">
                                    <Button size="lg" className="w-full sm:w-auto group">
                                        Bezpłatna konsultacja
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <a href="tel:+48795767711" className="w-full sm:w-auto">
                                    <Button variant="light" size="lg" className="w-full sm:w-auto">
                                        <Phone className="mr-2 h-5 w-5" />
                                        795 767 711
                                    </Button>
                                </a>
                            </div>

                            {/* Benefits */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        <span>{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right - Stats Card */}
                        <div className="relative mt-8 lg:mt-0">
                            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-transparent rounded-3xl blur-2xl" />
                            
                            <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-700/50 p-6 sm:p-8 lg:p-10">
                                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                        <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-sm sm:text-base">Kancelaria Wyjście z Długów</h3>
                                        <p className="text-slate-500 text-xs sm:text-sm">Zaufaj specjalistom</p>
                                    </div>
                                </div>

                                <div className="space-y-4 sm:space-y-6">
                                    <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                            <span className="text-slate-400 text-sm">Zespół</span>
                                        </div>
                                        <span className="text-white font-semibold text-sm sm:text-base">Doświadczeni eksperci</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                            <span className="text-slate-400 text-sm">Doświadczenie</span>
                                        </div>
                                        <span className="text-white font-semibold text-sm sm:text-base">3+ lata w branży</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                            <span className="text-slate-400 text-sm">Specjalizacja</span>
                                        </div>
                                        <span className="text-white font-semibold text-sm sm:text-base">Upadłość konsumencka</span>
                                    </div>
                                </div>

                                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-700/50">
                                    <p className="text-slate-400 text-xs sm:text-sm text-center">
                                        Pomagamy osobom zadłużonym w całej Polsce
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator - hidden on mobile */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 text-slate-500">
                    <span className="text-xs uppercase tracking-widest">Przewiń</span>
                    <div className="w-6 h-10 border-2 border-slate-700 rounded-full flex justify-center">
                        <div className="w-1 h-2 bg-amber-500 rounded-full mt-2 animate-bounce" />
                    </div>
                </div>
            </section>

            {/* SERVICES SECTION */}
            <section className="py-16 sm:py-20 lg:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                            W czym możemy Ci pomóc?
                        </h2>
                        <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
                            Specjalizujemy się w kompleksowym oddłużaniu osób fizycznych. 
                            Wybierz rozwiązanie dopasowane do Twojej sytuacji.
                        </p>
                    </div>

                    {/* Services Grid - Equal Height Cards */}
                    <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
                        {services.map((service, index) => (
                            <div 
                                key={index} 
                                className={`group relative flex flex-col p-6 sm:p-8 rounded-2xl transition-all duration-500 h-full ${
                                    service.highlight 
                                        ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl shadow-slate-900/20 md:scale-105 md:-my-4 z-10' 
                                        : 'bg-slate-50 hover:bg-white hover:shadow-xl border border-slate-100'
                                }`}
                            >
                                {service.highlight && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-3 sm:px-4 py-1 bg-amber-500 text-white text-[10px] sm:text-xs font-semibold rounded-full uppercase tracking-wider whitespace-nowrap">
                                            Nasza specjalizacja
                                        </span>
                                    </div>
                                )}
                                
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-5 sm:mb-6 ${
                                    service.highlight 
                                        ? 'bg-amber-500/20 text-amber-400' 
                                        : 'bg-slate-100 text-slate-600 group-hover:bg-amber-500/10 group-hover:text-amber-600'
                                } transition-colors`}>
                                    {service.icon}
                                </div>
                                
                                <h3 className={`text-lg sm:text-xl font-bold mb-3 ${service.highlight ? 'text-white' : 'text-slate-900'}`}>
                                    {service.title}
                                </h3>
                                
                                <p className={`mb-6 flex-grow text-sm sm:text-base ${service.highlight ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {service.description}
                                </p>
                                
                                <Link 
                                    to="/uslugi" 
                                    className={`inline-flex items-center gap-1 font-medium text-sm sm:text-base mt-auto ${
                                        service.highlight ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
                                    } transition-colors`}
                                >
                                    Dowiedz się więcej
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PROCESS SECTION */}
            <section className="py-16 sm:py-20 lg:py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <div>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 sm:mb-6">
                                Jak wygląda<br />
                                <span className="text-amber-600">współpraca z nami?</span>
                            </h2>
                            <p className="text-slate-600 mb-8 sm:mb-12 text-sm sm:text-base">
                                Proces oddłużania może wydawać się skomplikowany. 
                                Dlatego my zajmujemy się wszystkim — Ty tylko podejmujesz decyzje.
                            </p>

                            <div className="space-y-6 sm:space-y-8">
                                {processSteps.map((step, index) => (
                                    <div key={index} className="flex gap-4 sm:gap-6">
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg shadow-amber-500/30">
                                                {step.number}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">{step.title}</h3>
                                            <p className="text-slate-600 text-sm sm:text-base">{step.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visual Element */}
                        <div className="relative mt-8 lg:mt-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-slate-100 rounded-2xl sm:rounded-3xl transform rotate-3" />
                            <div className="relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl">
                                <div className="text-center">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                        <Phone className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-4">
                                        Zadzwoń teraz
                                    </h3>
                                    <p className="text-slate-600 mb-5 sm:mb-6 text-sm sm:text-base">
                                        Pierwsza rozmowa jest bezpłatna i niezobowiązująca. 
                                        Opowiedz nam o swojej sytuacji.
                                    </p>
                                    <a href="tel:+48795767711" className="inline-block w-full sm:w-auto">
                                        <Button size="lg" className="w-full sm:w-auto">
                                            <Phone className="mr-2 h-5 w-5" />
                                            795 767 711
                                        </Button>
                                    </a>
                                    <p className="text-xs sm:text-sm text-slate-500 mt-4">
                                        Pn-Pt: 9:00 - 17:00
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="py-16 sm:py-20 lg:py-24 bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-slate-800/50 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
                        Nie czekaj, aż sytuacja się pogorszy
                    </h2>
                    <p className="text-slate-400 text-base sm:text-lg mb-8 sm:mb-10 max-w-2xl mx-auto">
                        Im szybciej podejmiesz działanie, tym więcej opcji będziesz mieć. 
                        Porozmawiaj z nami o swoich możliwościach.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        <Link to="/kontakt" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto">
                                Umów bezpłatną konsultację
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link to="/uslugi" className="w-full sm:w-auto">
                            <Button variant="light" size="lg" className="w-full sm:w-auto">
                                Zobacz nasze usługi
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
        </>
    );
};

export default Home;