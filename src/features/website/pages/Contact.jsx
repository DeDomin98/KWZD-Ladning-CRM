import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import SEO from '../../../components/SEO';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        topic: 'Upadłość konsumencka',
        amount: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    'form-name': 'contact',
                    ...formData,
                }).toString(),
            });
            
            if (response.ok) {
                setSubmitStatus('success');
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            console.error('Błąd wysyłania:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const contactInfo = [
        {
            icon: <Phone className="w-5 h-5 sm:w-6 sm:h-6" />,
            label: "Telefon",
            value: "+48 795 767 711",
            href: "tel:+48795767711",
            note: "Pn-Pt: 9:00 - 17:00",
        },
        {
            icon: <Mail className="w-5 h-5 sm:w-6 sm:h-6" />,
            label: "Email",
            value: "kontakt@wyjscie-z-dlugow.pl",
            href: "mailto:kontakt@wyjscie-z-dlugow.pl",
            note: "Odpowiadamy w ciągu 24h",
        },
        {
            icon: <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />,
            label: "Obsługa",
            value: "Cała Polska",
            href: null,
            note: "Pracujemy zdalnie",
        },
    ];

    const topics = [
        "Upadłość konsumencka",
        "Negocjacje z wierzycielami",
        "Restrukturyzacja zadłużenia",
        "Mam komornika",
        "Inne",
    ];

    return (
        <>
            <SEO
                title="Kontakt - Bezpłatna Konsultacja | Wyjście z Długów"
                description="Umów bezpłatną konsultację. Pierwsza rozmowa jest niezobowiązująca. Zadzwoń 795 767 711 lub wypełnij formularz kontaktowy. Odpowiadamy w ciągu 24h."
                keywords="kontakt, bezpłatna konsultacja, telefon, email, formularz kontaktowy, oddłużenie, upadłość konsumencka"
                image="/logo.png"
                url={typeof window !== 'undefined' ? `${window.location.origin}/kontakt` : 'https://wyjscie-z-dlugow.pl/kontakt'}
            />
            <div className="overflow-hidden">
            {/* HERO */}
            <section className="relative py-20 sm:py-24 lg:py-32 bg-slate-900 pt-28 sm:pt-32">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6 sm:mb-8">
                        <span className="text-amber-400 text-xs sm:text-sm font-medium">Bezpłatna konsultacja</span>
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6">
                        Porozmawiajmy
                    </h1>
                    
                    <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto">
                        Pierwsza rozmowa jest bezpłatna i niezobowiązująca. 
                        Opisz swoją sytuację — pomożemy Ci znaleźć rozwiązanie.
                    </p>
                </div>
            </section>

            {/* MAIN CONTENT */}
            <section className="py-16 sm:py-20 lg:py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
                        
                        {/* LEFT - Contact Info */}
                        <div className="lg:col-span-5 space-y-6 sm:space-y-8">
                            {/* Contact Cards */}
                            <div className="space-y-4">
                                {contactInfo.map((item, index) => (
                                    <div 
                                        key={index}
                                        className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow duration-300"
                                    >
                                        {item.href ? (
                                            <a href={item.href} className="flex items-start gap-3 sm:gap-4 group">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-lg sm:rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors flex-shrink-0">
                                                    {item.icon}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs sm:text-sm text-slate-500 mb-1">{item.label}</p>
                                                    <p className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors text-sm sm:text-base break-all">
                                                        {item.value}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">{item.note}</p>
                                                </div>
                                            </a>
                                        ) : (
                                            <div className="flex items-start gap-3 sm:gap-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-lg sm:rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                                                    {item.icon}
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm text-slate-500 mb-1">{item.label}</p>
                                                    <p className="font-semibold text-slate-900 text-sm sm:text-base">{item.value}</p>
                                                    <p className="text-xs text-slate-400 mt-1">{item.note}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Urgent Cases */}
                            <div className="bg-slate-900 p-6 sm:p-8 rounded-xl sm:rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-amber-500/10 rounded-full blur-2xl" />
                                <div className="relative">
                                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                                        <h3 className="font-bold text-base sm:text-lg text-white">Pilna sprawa?</h3>
                                    </div>
                                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6">
                                        Jeśli masz sprawę pilną — np. zbliża się licytacja lub zajęcie konta — 
                                        zadzwoń bezpośrednio. W takich sytuacjach liczy się każdy dzień.
                                    </p>
                                    <a 
                                        href="tel:+48795767711" 
                                        className="inline-flex items-center gap-2 text-amber-400 font-semibold hover:text-amber-300 transition-colors text-sm sm:text-base"
                                    >
                                        <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                                        Zadzwoń teraz
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>

                            {/* Trust badges */}
                            <div className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100">
                                <h4 className="font-semibold text-slate-900 mb-3 sm:mb-4 text-sm sm:text-base">Gwarancje</h4>
                                <ul className="space-y-2 sm:space-y-3">
                                    {[
                                        "Pełna poufność rozmowy",
                                        "Bezpłatna wstępna konsultacja",
                                        "Szczera ocena możliwości",
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-center gap-2 text-slate-600 text-xs sm:text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* RIGHT - Form */}
                        <div className="lg:col-span-7">
                            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100">
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                                    Opisz swoją sytuację
                                </h2>
                                <p className="text-slate-600 mb-6 sm:mb-8 text-sm sm:text-base">
                                    Wypełnij formularz, a oddzwonimy do Ciebie w ciągu 24 godzin.
                                </p>

                                {submitStatus === 'success' ? (
                                    <div className="text-center py-8 sm:py-12">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                                            Dziękujemy za wiadomość!
                                        </h3>
                                        <p className="text-slate-600 mb-6 text-sm sm:text-base">
                                            Odezwiemy się do Ciebie najszybciej jak to możliwe.
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => {
                                                setSubmitStatus(null);
                                                setFormData({ name: '', phone: '', topic: 'Upadłość konsumencka', amount: '', message: '' });
                                            }}
                                        >
                                            Wyślij kolejne zgłoszenie
                                        </Button>
                                    </div>
                                ) : submitStatus === 'error' ? (
                                    <div className="text-center py-8 sm:py-12">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                                            Wystąpił błąd
                                        </h3>
                                        <p className="text-slate-600 mb-6 text-sm sm:text-base">
                                            Nie udało się wysłać wiadomości. Spróbuj ponownie lub zadzwoń do nas.
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => setSubmitStatus(null)}
                                        >
                                            Spróbuj ponownie
                                        </Button>
                                    </div>
                                ) : (
                                    <form 
                                        name="contact" 
                                        method="POST" 
                                        data-netlify="true"
                                        netlify-honeypot="bot-field"
                                        onSubmit={handleSubmit} 
                                        className="space-y-5 sm:space-y-6"
                                    >
                                        {/* Ukryte pole dla Netlify */}
                                        <input type="hidden" name="form-name" value="contact" />
                                        
                                        {/* Honeypot - ukryte pole antyspamowe */}
                                        <p className="hidden">
                                            <label>
                                                Nie wypełniaj tego pola: <input name="bot-field" />
                                            </label>
                                        </p>

                                        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                                                    Imię <span className="text-red-500">*</span>
                                                </label>
                                                <input 
                                                    type="text" 
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition bg-slate-50 focus:bg-white text-sm sm:text-base" 
                                                    placeholder="Twoje imię"
                                                    required 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                                                    Telefon <span className="text-red-500">*</span>
                                                </label>
                                                <input 
                                                    type="tel" 
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition bg-slate-50 focus:bg-white text-sm sm:text-base" 
                                                    placeholder="123 456 789"
                                                    required 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                                                Czego dotyczy sprawa?
                                            </label>
                                            <select 
                                                name="topic"
                                                value={formData.topic}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition bg-slate-50 focus:bg-white text-sm sm:text-base"
                                            >
                                                {topics.map((topic) => (
                                                    <option key={topic} value={topic}>{topic}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                                                Przybliżona kwota zadłużenia
                                            </label>
                                            <input 
                                                type="text" 
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition bg-slate-50 focus:bg-white text-sm sm:text-base" 
                                                placeholder="np. 50 000 zł"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                                                Opisz krótko swoją sytuację
                                            </label>
                                            <textarea 
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                rows="4" 
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition resize-none bg-slate-50 focus:bg-white text-sm sm:text-base"
                                                placeholder="Co Cię martwi? Jakie masz długi? Czy masz już sprawę w sądzie lub u komornika?"
                                            />
                                        </div>

                                        <Button 
                                            type="submit" 
                                            className="w-full" 
                                            size="lg"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                    Wysyłanie...
                                                </>
                                            ) : (
                                                <>
                                                    Wyślij zgłoszenie
                                                    <Send className="ml-2 h-5 w-5" />
                                                </>
                                            )}
                                        </Button>
                                        
                                        <p className="text-[10px] sm:text-xs text-center text-slate-500">
                                            Twoje dane są chronione i traktowane jako poufne. 
                                            Nie udostępniamy ich osobom trzecim.
                                        </p>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
        </>
    );
};

export default Contact;