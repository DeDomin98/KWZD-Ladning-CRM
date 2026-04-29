// src/phone/Icons.jsx
// Profesjonalne ikony SVG (linia, 1.75px) – zastępują emoji w module telefonicznym.
// Wszystkie ikony przyjmują className i size, dziedziczą currentColor.

import React from "react";

const Svg = ({ children, size = 18, className = "", strokeWidth = 1.75, ...rest }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...rest}
    >
        {children}
    </svg>
);

export const IconPhone = (p) => (
    <Svg {...p}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
    </Svg>
);

export const IconPhoneIncoming = (p) => (
    <Svg {...p}>
        <polyline points="16 2 16 8 22 8" />
        <line x1="22" y1="2" x2="16" y2="8" />
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
    </Svg>
);

export const IconPhoneOutgoing = (p) => (
    <Svg {...p}>
        <polyline points="22 8 22 2 16 2" />
        <line x1="16" y1="8" x2="22" y2="2" />
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
    </Svg>
);

export const IconPhoneMissed = (p) => (
    <Svg {...p}>
        <line x1="22" y1="2" x2="16" y2="8" />
        <line x1="16" y1="2" x2="22" y2="8" />
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
    </Svg>
);

export const IconPhoneOff = (p) => (
    <Svg {...p}>
        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
        <line x1="23" y1="1" x2="1" y2="23" />
    </Svg>
);

export const IconMic = (p) => (
    <Svg {...p}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </Svg>
);

export const IconMicOff = (p) => (
    <Svg {...p}>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </Svg>
);

export const IconKeypad = (p) => (
    <Svg {...p}>
        <circle cx="6" cy="6" r="1" />
        <circle cx="12" cy="6" r="1" />
        <circle cx="18" cy="6" r="1" />
        <circle cx="6" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="18" cy="12" r="1" />
        <circle cx="6" cy="18" r="1" />
        <circle cx="12" cy="18" r="1" />
        <circle cx="18" cy="18" r="1" />
    </Svg>
);

export const IconClose = (p) => (
    <Svg {...p}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
);

export const IconCheck = (p) => (
    <Svg {...p}>
        <polyline points="20 6 9 17 4 12" />
    </Svg>
);

export const IconMessage = (p) => (
    <Svg {...p}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
);

export const IconHistory = (p) => (
    <Svg {...p}>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <polyline points="3 3 3 8 8 8" />
        <polyline points="12 7 12 12 15 14" />
    </Svg>
);

export const IconHelp = (p) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
);

export const IconUser = (p) => (
    <Svg {...p}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </Svg>
);

export const IconSearch = (p) => (
    <Svg {...p}>
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
);

export const IconSend = (p) => (
    <Svg {...p}>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
);

export const IconBackspace = (p) => (
    <Svg {...p}>
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
        <line x1="18" y1="9" x2="12" y2="15" />
        <line x1="12" y1="9" x2="18" y2="15" />
    </Svg>
);

export const IconAlert = (p) => (
    <Svg {...p}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
);

export const IconInfo = (p) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </Svg>
);

export const IconRefresh = (p) => (
    <Svg {...p}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Svg>
);

export const IconLaptop = (p) => (
    <Svg {...p}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <line x1="2" y1="20" x2="22" y2="20" />
    </Svg>
);

export const IconSmartphone = (p) => (
    <Svg {...p}>
        <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
    </Svg>
);

export const IconHeadphones = (p) => (
    <Svg {...p}>
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </Svg>
);

export const IconChevronLeft = (p) => (
    <Svg {...p}>
        <polyline points="15 18 9 12 15 6" />
    </Svg>
);

export const IconChevronRight = (p) => (
    <Svg {...p}>
        <polyline points="9 18 15 12 9 6" />
    </Svg>
);

export const IconExternal = (p) => (
    <Svg {...p}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </Svg>
);

export const IconBookOpen = (p) => (
    <Svg {...p}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
);

export const IconWave = (p) => (
    <Svg {...p}>
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </Svg>
);

export const IconBuilding = (p) => (
    <Svg {...p}>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="9" y1="6" x2="9" y2="6" />
        <line x1="15" y1="6" x2="15" y2="6" />
        <line x1="9" y1="10" x2="9" y2="10" />
        <line x1="15" y1="10" x2="15" y2="10" />
        <line x1="9" y1="14" x2="9" y2="14" />
        <line x1="15" y1="14" x2="15" y2="14" />
        <path d="M10 22v-4h4v4" />
    </Svg>
);

export const IconClock = (p) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </Svg>
);

export const IconArrowRight = (p) => (
    <Svg {...p}>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </Svg>
);

export const IconArrowLeft = (p) => (
    <Svg {...p}>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 19 19 12" />
    </Svg>
);

export const IconPlus = (p) => (
    <Svg {...p}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
);

export default {
    IconPhone, IconPhoneIncoming, IconPhoneOutgoing, IconPhoneMissed, IconPhoneOff,
    IconMic, IconMicOff, IconKeypad, IconClose, IconCheck, IconMessage, IconHistory,
    IconHelp, IconUser, IconSearch, IconSend, IconBackspace, IconAlert, IconInfo,
    IconRefresh, IconLaptop, IconSmartphone, IconHeadphones, IconChevronLeft,
    IconChevronRight, IconExternal, IconBookOpen, IconWave, IconBuilding, IconClock,
    IconArrowRight, IconArrowLeft, IconPlus,
};
