import type { ReactNode, SVGProps } from "react";

/** Íconos de línea fina (1.5 px), propios. Decorativos por defecto: llevar el texto al lado o aria-label en el botón. */
function Svg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const BedIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 18V6" />
    <path d="M3 14h18v4" />
    <path d="M21 14v-2a3 3 0 0 0-3-3h-7v5" />
    <circle cx="7" cy="11" r="1.6" />
  </Svg>
);

export const BathIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-2Z" />
    <path d="M6 12V6.5A2.5 2.5 0 0 1 8.5 4c1 0 1.8.5 2.2 1.2" />
    <path d="M7 19l-1 2M17 19l1 2" />
  </Svg>
);

export const HomeAreaIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5h4v5" />
  </Svg>
);

export const LandIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Z" />
    <path d="M4 7.5 12 11l8-3.5M12 11v9" />
  </Svg>
);

export const CarIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 16V11l1.7-4.2A2 2 0 0 1 8.6 5.5h6.8a2 2 0 0 1 1.9 1.3L19 11v5" />
    <path d="M3.5 16h17v2.5h-17z" />
    <circle cx="8" cy="13.2" r=".6" />
    <circle cx="16" cy="13.2" r=".6" />
  </Svg>
);

export const CalendarIcon = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="5.5" width="16" height="14" rx="2" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </Svg>
);

export const PinIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
);

export const PhoneIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 4h3l1.5 4-2 1.4a11 11 0 0 0 5.6 5.6L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" />
  </Svg>
);

export const MailIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4 7.5 8 6 8-6" />
  </Svg>
);

export const InstagramIcon = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="16.8" cy="7.2" r=".6" />
  </Svg>
);

export const WhatsAppIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8L4 20Z" />
    <path d="M9.2 8.6c.2-.4.6-.4.8 0l.8 1.6c.1.3 0 .5-.2.7l-.5.6c.7 1.3 1.8 2.3 3.2 2.9l.6-.6c.2-.2.5-.3.7-.1l1.6.8c.4.2.4.6.1 1-.5.7-1.3 1-2.2.8-3-.7-5.2-3-5.9-6-.1-.7.1-1.2.5-1.7Z" />
  </Svg>
);

export const ArrowRightIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const ChevronLeftIcon = (p: P) => (
  <Svg {...p}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
  </Svg>
);

export const ChevronRightIcon = (p: P) => (
  <Svg {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Svg>
);

export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const MenuIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h16M4 16h16" />
  </Svg>
);

export const GridIcon = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
  </Svg>
);

export const CheckIcon = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
