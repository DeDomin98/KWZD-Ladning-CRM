import React from 'react';
import { cn } from "../../lib/utils.js";

export const Button = ({ children, variant = "primary", size = "md", className, ...props }) => {
    const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-900/20 border border-amber-500/20",
        secondary: "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700",
        outline: "border-2 border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-400",
        ghost: "text-amber-700 hover:bg-amber-50 hover:text-amber-800",
        light: "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20",
    };

    const sizes = {
        sm: "px-4 py-2 text-sm rounded-lg",
        md: "px-6 py-3 rounded-xl text-base",
        lg: "px-8 py-4 rounded-xl text-lg",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
};