import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import { Button } from '../ui/Button';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    // Blokuj scroll body gdy menu mobilne jest otwarte
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const navLinks = [
        { to: "/", label: "Strona główna" },
        { to: "/uslugi", label: "Usługi" },
        { to: "/o-nas", label: "O nas" },
        { to: "/kontakt", label: "Kontakt" },
    ];

    return (
        <>
            <nav className={`fixed w-full z-50 transition-all duration-500 ${
                isScrolled 
                    ? 'bg-slate-900/95 backdrop-blur-md shadow-xl shadow-slate-900/10 py-2 sm:py-3' 
                    : 'bg-transparent py-3 sm:py-5'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">

                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                            <img 
                                src="/logo.png" 
                                alt="Wyjście z Długów" 
                                className="h-9 w-9 sm:h-10 sm:w-10 object-contain transition-transform group-hover:scale-105"
                            />
                            <div className="flex flex-col">
                                <span className="font-bold text-base sm:text-lg text-white leading-tight tracking-tight">
                                    Kancelaria Wyjście z Długów
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest hidden xs:block">
                                    Kancelaria Oddłużeniowa
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden lg:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link 
                                    key={link.to}
                                    to={link.to} 
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                                        location.pathname === link.to
                                            ? 'text-amber-400 bg-amber-500/10'
                                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="hidden lg:flex items-center gap-4">
                            <a href="tel:+48795767711" className="flex items-center gap-2 text-slate-300 hover:text-amber-400 transition-colors">
                                <Phone size={18} />
                                <span className="text-sm font-medium">795 767 711</span>
                            </a>
                            <Link to="/kontakt">
                                <Button size="sm">
                                    Bezpłatna konsultacja
                                </Button>
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button 
                            className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label={isMobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <div className={`fixed inset-0 z-40 lg:hidden transition-all duration-500 ${
                isMobileMenuOpen ? 'visible' : 'invisible pointer-events-none'
            }`}>
                <div 
                    className={`absolute inset-0 bg-slate-900/90 backdrop-blur-md transition-opacity duration-500 ${
                        isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                />
                
                <div className={`absolute right-0 top-0 h-full w-full max-w-sm bg-slate-900 shadow-2xl transition-transform duration-500 ease-out ${
                    isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                    <div className="p-6 pt-20 h-full overflow-y-auto">
                        <div className="flex flex-col gap-2">
                            {navLinks.map((link) => (
                                <Link 
                                    key={link.to}
                                    to={link.to} 
                                    className={`px-4 py-4 text-base font-medium rounded-xl transition-all duration-300 ${
                                        location.pathname === link.to
                                            ? 'text-amber-400 bg-amber-500/10'
                                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                        
                        <div className="mt-8 pt-8 border-t border-slate-800">
                            <a href="tel:+48795767711" className="flex items-center gap-3 text-slate-300 hover:text-amber-400 transition-colors mb-6">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                    <Phone size={22} className="text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Zadzwoń teraz</p>
                                    <p className="font-semibold text-lg">795 767 711</p>
                                </div>
                            </a>
                            <Link to="/kontakt" className="block" onClick={() => setIsMobileMenuOpen(false)}>
                                <Button className="w-full py-4">
                                    Bezpłatna konsultacja
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Navbar;