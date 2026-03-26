import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ArrowUpRight, Shield } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative bg-slate-950 text-white overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-800/50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            
            <div className="relative">
                {/* Main Footer */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
                        
                        {/* Brand */}
                        <div className="sm:col-span-2">
                            <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
                                <img 
                                    src="/logo.png" 
                                    alt="Wyjście z Długów" 
                                    className="h-11 w-11 sm:h-12 sm:w-12 object-contain"
                                />
                                <div>
                                    <span className="font-bold text-lg sm:text-xl block">Wyjście z Długów</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-widest">Kancelaria Oddłużeniowa</span>
                                </div>
                            </Link>
                            <p className="text-slate-400 max-w-md leading-relaxed mb-6 text-sm sm:text-base">
                                Pomagamy osobom zadłużonym odzyskać kontrolę nad finansami. 
                                Specjalizujemy się w upadłości konsumenckiej i profesjonalnym oddłużaniu.
                            </p>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Shield size={16} className="text-amber-500 flex-shrink-0" />
                                <span>Pełna poufność i dyskrecja</span>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h3 className="font-semibold text-white mb-4 sm:mb-6 text-sm uppercase tracking-wider">Nawigacja</h3>
                            <ul className="space-y-2 sm:space-y-3">
                                {[
                                    { to: "/", label: "Strona główna" },
                                    { to: "/uslugi", label: "Nasze usługi" },
                                    { to: "/o-nas", label: "O kancelarii" },
                                    { to: "/kontakt", label: "Kontakt" },
                                ].map((link) => (
                                    <li key={link.to}>
                                        <Link 
                                            to={link.to} 
                                            className="text-slate-400 hover:text-amber-400 transition-colors duration-300 flex items-center gap-1 group text-sm sm:text-base"
                                        >
                                            {link.label}
                                            <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h3 className="font-semibold text-white mb-4 sm:mb-6 text-sm uppercase tracking-wider">Kontakt</h3>
                            <ul className="space-y-3 sm:space-y-4">
                                <li>
                                    <a href="tel:+48795767711" className="flex items-start gap-3 text-slate-400 hover:text-amber-400 transition-colors group">
                                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800/50 rounded-lg flex items-center justify-center group-hover:bg-amber-500/10 transition-colors flex-shrink-0">
                                            <Phone size={16} className="sm:w-[18px] sm:h-[18px]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-600 mb-0.5">Telefon</p>
                                            <p className="font-medium text-white text-sm sm:text-base">+48 795 767 711</p>
                                        </div>
                                    </a>
                                </li>
                                <li>
                                    <a href="mailto:kontakt@wyjscie-z-dlugow.pl" className="flex items-start gap-3 text-slate-400 hover:text-amber-400 transition-colors group">
                                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800/50 rounded-lg flex items-center justify-center group-hover:bg-amber-500/10 transition-colors flex-shrink-0">
                                            <Mail size={16} className="sm:w-[18px] sm:h-[18px]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-600 mb-0.5">Email</p>
                                            <p className="font-medium text-white text-sm break-all">kontakt@wyjscie-z-dlugow.pl</p>
                                        </div>
                                    </a>
                                </li>
                                <li className="flex items-start gap-3 text-slate-400">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin size={16} className="sm:w-[18px] sm:h-[18px]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-600 mb-0.5">Biuro</p>
                                        <p className="font-medium text-white text-sm">Polska</p>
                                        <p className="text-xs text-slate-500">Obsługa zdalna w całym kraju</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-slate-800/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-slate-500">
                            <p className="text-center sm:text-left">&copy; {currentYear} Wyjście z Długów. Wszelkie prawa zastrzeżone.</p>
                            <div className="flex items-center gap-4 sm:gap-6">
                                <Link to="/polityka-prywatnosci" className="hover:text-amber-400 transition-colors">
                                    Polityka prywatności
                                </Link>
                                <Link to="/regulamin" className="hover:text-amber-400 transition-colors">
                                    Regulamin
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;