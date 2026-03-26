import React from 'react';
import { Scale, Handshake, FileCheck, ArrowRight, CheckCircle2, Phone, Shield, Clock, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Link } from 'react-router-dom';
import SEO from '../../../components/SEO';

const Services = () => {
    const mainServices = [
        {
            icon: <Scale className="w-7 h-7 sm:w-8 sm:h-8" />,
            title: "Upadłość Konsumencka",
            subtitle: "Nasza główna specjalizacja",
            description: "Upadłość konsumencka to legalna droga do całkowitego oddłużenia. Prowadzimy Cię przez cały proces — od złożenia wniosku, przez postępowanie sądowe, aż do umorzenia długów.",
            features: [
                "Przygotowanie kompletnego wniosku",
                "Reprezentacja przed sądem",
                "Pomoc w sporządzeniu planu spłaty",
                "Wsparcie na każdym etapie postępowania",
            ],
            highlight: true,
        },
        {
            icon: <Handshake className="w-7 h-7 sm:w-8 sm:h-8" />,
            title: "Negocjacje z Wierzycielami",
            subtitle: "Polubowne rozwiązania",
            description: "Nie każda sprawa wymaga drogi sądowej. Pomagamy wynegocjować korzystne warunki spłaty bezpośrednio z bankami i firmami windykacyjnymi.",
            features: [
                "Umorzenie części odsetek",
                "Rozłożenie długu na raty",
                "Wynegocjowanie ugody",
                "Zatrzymanie działań windykacyjnych",
            ],
            highlight: false,
        },
        {
            icon: <FileCheck className="w-7 h-7 sm:w-8 sm:h-8" />,
            title: "Restrukturyzacja Zadłużenia",
            subtitle: "Uporządkowanie finansów",
            description: "Gdy sytuacja jest skomplikowana i wymaga kompleksowego podejścia, pomagamy opracować plan wyjścia z zadłużenia dostosowany do Twoich możliwości.",
            features: [
                "Analiza całości zobowiązań",
                "Opracowanie strategii spłaty",
                "Konsolidacja zadłużenia",
                "Planowanie budżetu",
            ],
            highlight: false,
        },
    ];

    const whyUs = [
        {
            icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6" />,
            title: "Pełna dyskrecja",
            description: "Twoja sprawa jest poufna. Gwarantujemy pełną dyskrecję na każdym etapie współpracy.",
        },
        {
            icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />,
            title: "Szybka reakcja",
            description: "Rozumiemy, że w sprawach finansowych liczy się czas. Działamy sprawnie i terminowo.",
        },
        {
            icon: <Users className="w-5 h-5 sm:w-6 sm:h-6" />,
            title: "Indywidualne podejście",
            description: "Każda sytuacja jest inna. Dobieramy rozwiązania do Twoich konkretnych potrzeb.",
        },
    ];

    return (
        <>
            <SEO
                title="Nasze Usługi - Upadłość Konsumencka, Negocjacje, Restrukturyzacja"
                description="Specjalizujemy się w kompleksowym oddłużaniu osób fizycznych. Oferujemy upadłość konsumencką, negocjacje z wierzycielami i restrukturyzację zadłużenia. Bezpłatna konsultacja."
                keywords="upadłość konsumencka, negocjacje z wierzycielami, restrukturyzacja zadłużenia, umorzenie odsetek, ugoda z bankiem, plan spłaty, oddłużenie"
                image="/logo.png"
                url={typeof window !== 'undefined' ? `${window.location.origin}/uslugi` : 'https://wyjscie-z-dlugow.pl/uslugi'}
            />
            <div className="overflow-hidden">
            {/* HERO */}
            <section className="relative py-20 sm:py-24 lg:py-32 bg-slate-900 pt-28 sm:pt-32">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    <div className="absolute top-1/3 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6 sm:mb-8">
                            <span className="text-amber-400 text-xs sm:text-sm font-medium">Co oferujemy</span>
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6">
                            Nasze usługi
                        </h1>
                        
                        <p className="text-base sm:text-lg lg:text-xl text-slate-400 leading-relaxed">
                            Specjalizujemy się w pomocy osobom zadłużonym. Oferujemy kompleksowe wsparcie 
                            w procesie oddłużania — od konsultacji po pełną reprezentację.
                        </p>
                    </div>
                </div>
            </section>

            {/* MAIN SERVICES */}
            <section className="py-16 sm:py-20 lg:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="space-y-6 sm:space-y-8">
                        {mainServices.map((service, index) => (
                            <div 
                                key={index} 
                                className={`relative rounded-2xl sm:rounded-3xl overflow-hidden ${
                                    service.highlight 
                                        ? 'bg-gradient-to-br from-slate-900 to-slate-800' 
                                        : 'bg-slate-50 border border-slate-100'
                                }`}
                            >
                                {service.highlight && (
                                    <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                )}
                                
                                <div className="relative p-6 sm:p-8 lg:p-12">
                                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                                        <div>
                                            {service.highlight && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 mb-4 sm:mb-6">
                                                    <span className="text-amber-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                                                        {service.subtitle}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {!service.highlight && (
                                                <p className="text-amber-600 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-3 sm:mb-4">
                                                    {service.subtitle}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                                    service.highlight 
                                                        ? 'bg-amber-500/20 text-amber-400' 
                                                        : 'bg-amber-500/10 text-amber-600'
                                                }`}>
                                                    {service.icon}
                                                </div>
                                                <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${
                                                    service.highlight ? 'text-white' : 'text-slate-900'
                                                }`}>
                                                    {service.title}
                                                </h2>
                                            </div>
                                            
                                            <p className={`text-sm sm:text-base lg:text-lg leading-relaxed mb-6 sm:mb-8 ${
                                                service.highlight ? 'text-slate-300' : 'text-slate-600'
                                            }`}>
                                                {service.description}
                                            </p>

                                            <Link to="/kontakt" className="inline-block">
                                                <Button 
                                                    variant={service.highlight ? "primary" : "secondary"}
                                                    className="group"
                                                >
                                                    Zapytaj o szczegóły
                                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </Link>
                                        </div>

                                        <div className={`rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 ${
                                            service.highlight ? 'bg-slate-800/50' : 'bg-white shadow-lg'
                                        }`}>
                                            <h3 className={`font-semibold mb-4 sm:mb-6 text-sm sm:text-base ${
                                                service.highlight ? 'text-white' : 'text-slate-900'
                                            }`}>
                                                Co obejmuje usługa:
                                            </h3>
                                            <ul className="space-y-3 sm:space-y-4">
                                                {service.features.map((feature, fIndex) => (
                                                    <li key={fIndex} className="flex items-start gap-3">
                                                        <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 ${
                                                            service.highlight ? 'text-amber-400' : 'text-amber-500'
                                                        }`} />
                                                        <span className={`text-sm sm:text-base ${service.highlight ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            {feature}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* WHY US */}
            <section className="py-16 sm:py-20 lg:py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                            Dlaczego warto nam zaufać?
                        </h2>
                        <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
                            Wiemy, jak trudna jest sytuacja zadłużenia. Dlatego podchodzimy do każdej sprawy z pełnym zaangażowaniem i zrozumieniem.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                        {whyUs.map((item, index) => (
                            <div key={index} className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-slate-100 hover:shadow-xl transition-shadow duration-300">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-500/10 rounded-lg sm:rounded-xl flex items-center justify-center text-amber-600 mb-4 sm:mb-6">
                                    {item.icon}
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">{item.title}</h3>
                                <p className="text-slate-600 text-sm sm:text-base">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 sm:py-20 lg:py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl sm:rounded-3xl p-8 sm:p-10 lg:p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-amber-500/10 rounded-full blur-3xl" />
                        
                        <div className="relative">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">
                                Nie wiesz, które rozwiązanie jest dla Ciebie?
                            </h2>
                            <p className="text-slate-400 mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base">
                                Podczas bezpłatnej konsultacji przeanalizujemy Twoją sytuację i podpowiemy najlepszą drogę.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                                <Link to="/kontakt" className="w-full sm:w-auto">
                                    <Button size="lg" className="w-full sm:w-auto">
                                        Umów konsultację
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                                <a href="tel:+48795767711" className="w-full sm:w-auto">
                                    <Button variant="light" size="lg" className="w-full sm:w-auto">
                                        <Phone className="mr-2 h-5 w-5" />
                                        795 767 711
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
        </>
    );
};

export default Services;