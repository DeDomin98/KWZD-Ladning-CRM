import React from 'react';
import { CheckCircle2, Users, Target, Handshake, ArrowRight, Phone, Award, Heart } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Link } from 'react-router-dom';
import SEO from '../../../components/SEO';

const About = () => {
    // OPCJA 1: Bez zdjęć (gradientowe awatary)
    // OPCJA 2: Ze zdjęciami - zmień image na ścieżkę do zdjęcia np. "/images/agnieszka.jpg"
    const teamMembers = [
        {
            name: "Agnieszka",
            role: "Specjalista ds. Oddłużania",
            experience: "3 lata doświadczenia",
            description: "Od trzech lat pomaga osobom zadłużonym odzyskać kontrolę nad finansami. Zna branżę od podszewki i wie, jak skutecznie prowadzić sprawy oddłużeniowe.",
            color: "from-rose-500 to-pink-600",
            image: null, // Zmień na "/images/agnieszka.jpg" jeśli masz zdjęcie
        },
        {
            name: "Jarosław",
            role: "Ekspert ds. Upadłości Konsumenckiej",
            experience: "3 lata doświadczenia",
            description: "Doświadczony specjalista z wieloletnim stażem zawodowym. Wcześniej pracował w jednej z wiodących kancelarii oddłużeniowych, gdzie zdobył praktyczną wiedzę w prowadzeniu spraw upadłościowych.",
            color: "from-slate-600 to-slate-700",
            image: null, // Zmień na "/images/jaroslaw.jpg" jeśli masz zdjęcie
        },
    ];

    const values = [
        {
            icon: <Heart className="w-5 h-5 sm:w-6 sm:h-6" />,
            title: "Zrozumienie sytuacji",
            description: "Wiemy, że zadłużenie to trudny temat. Podchodzimy do każdej osoby z empatią i bez osądzania.",
        },
        {
            icon: <Target className="w-5 h-5 sm:w-6 sm:h-6" />,
            title: "Skuteczność działania",
            description: "Koncentrujemy się na osiągnięciu najlepszego możliwego rezultatu dla naszych klientów.",
        },
        {
            icon: <Handshake className="w-5 h-5 sm:w-6 sm:h-6" />,
            title: "Jasne zasady",
            description: "Od początku mówimy wprost o kosztach i możliwościach. Żadnych ukrytych opłat.",
        },
    ];

    const principles = [
        "Szczera ocena sytuacji — nie obiecujemy rzeczy niemożliwych",
        "Przejrzyste warunki współpracy ustalone na starcie",
        "Stały kontakt i informowanie o postępach",
        "Pełna dyskrecja w prowadzeniu spraw",
    ];

    return (
        <>
            <SEO
                title="O Nas - Zespół Specjalistów ds. Oddłużania | Wyjście z Długów"
                description="Poznaj nasz zespół specjalistów ds. oddłużania. Doświadczeni eksperci z wieloletnim stażem w branży oddłużeniowej. Indywidualne podejście do każdej sprawy."
                keywords="o nas, zespół, specjaliści oddłużania, doświadczenie, kancelaria, eksperci upadłości konsumenckiej"
                image="/logo.png"
                url={typeof window !== 'undefined' ? `${window.location.origin}/o-nas` : 'https://wyjscie-z-dlugow.pl/o-nas'}
            />
            <div className="overflow-hidden">
            {/* HERO */}
            <section className="relative py-20 sm:py-24 lg:py-32 bg-slate-900 pt-28 sm:pt-32">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    <div className="absolute top-1/3 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6 sm:mb-8">
                            <span className="text-amber-400 text-xs sm:text-sm font-medium">Kim jesteśmy</span>
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6">
                            Poznaj nasz zespół
                        </h1>
                        
                        <p className="text-base sm:text-lg lg:text-xl text-slate-400 leading-relaxed">
                            Wyjście z Długów to zespół specjalistów, którzy pomagają osobom zadłużonym 
                            odzyskać spokój i kontrolę nad swoimi finansami.
                        </p>
                    </div>
                </div>
            </section>

            {/* TEAM SECTION */}
            <section className="py-16 sm:py-20 lg:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                            Ludzie, którzy Ci pomogą
                        </h2>
                        <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
                            Nasz zespół łączy doświadczenie w branży oddłużeniowej z indywidualnym 
                            podejściem do każdej sprawy.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
                        {teamMembers.map((member, index) => (
                            <div 
                                key={index} 
                                className="group relative bg-slate-50 rounded-2xl sm:rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-500"
                            >
                                {/* Color Bar */}
                                <div className={`h-1.5 sm:h-2 bg-gradient-to-r ${member.color}`} />
                                
                                <div className="p-6 sm:p-8">
                                    {/* Avatar */}
                                    <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
                                        {member.image ? (
                                            <img 
                                                src={member.image} 
                                                alt={member.name}
                                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover shadow-lg"
                                            />
                                        ) : (
                                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg`}>
                                                {member.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-bold text-slate-900">{member.name}</h3>
                                            <p className="text-amber-600 font-medium text-sm sm:text-base">{member.role}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                        <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm text-slate-500 font-medium">{member.experience}</span>
                                    </div>

                                    <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                                        {member.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Team summary */}
                    <div className="mt-12 sm:mt-16 bg-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-white">Nasz zespół</h3>
                                <p className="text-slate-400 text-sm">Razem dla Twojego sukcesu</p>
                            </div>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                            Nasi specjaliści mają praktyczne doświadczenie w prowadzeniu spraw oddłużeniowych. 
                            Wiedzą, jak działają banki i firmy windykacyjne, bo wcześniej pracowali po drugiej stronie. 
                            Teraz wykorzystują tę wiedzę, aby pomagać osobom zadłużonym.
                        </p>
                    </div>
                </div>
            </section>

            {/* VALUES */}
            <section className="py-16 sm:py-20 lg:py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <div>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 sm:mb-6">
                                Zasady, którymi<br />
                                <span className="text-amber-600">się kierujemy</span>
                            </h2>
                            <p className="text-slate-600 mb-6 sm:mb-8 text-sm sm:text-base">
                                Budujemy zaufanie poprzez uczciwość i transparentność. 
                                Wiemy, że decyzja o podjęciu współpracy nie jest łatwa — dlatego 
                                działamy tak, jak sami chcielibyśmy być traktowani.
                            </p>

                            <ul className="space-y-3 sm:space-y-4">
                                {principles.map((principle, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-slate-700 text-sm sm:text-base">{principle}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="grid gap-4 sm:gap-6">
                            {values.map((value, index) => (
                                <div 
                                    key={index}
                                    className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow duration-300"
                                >
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-lg sm:rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                                            {value.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 mb-1 text-sm sm:text-base">{value.title}</h3>
                                            <p className="text-slate-600 text-xs sm:text-sm">{value.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 sm:py-20 lg:py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 sm:mb-6">
                        Chcesz z nami porozmawiać?
                    </h2>
                    <p className="text-slate-600 mb-8 sm:mb-10 max-w-2xl mx-auto text-sm sm:text-base">
                        Pierwsza rozmowa jest bezpłatna i niezobowiązująca. Opowiedz nam o swojej sytuacji, 
                        a my powiemy Ci szczerze, czy i jak możemy pomóc.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        <Link to="/kontakt" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto">
                                Skontaktuj się z nami
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <a href="tel:+48795767711" className="w-full sm:w-auto">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto">
                                <Phone className="mr-2 h-5 w-5" />
                                795 767 711
                            </Button>
                        </a>
                    </div>
                </div>
            </section>
        </div>
        </>
    );
};

export default About;