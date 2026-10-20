import type { Metadata } from "next";
import { ToastProvider } from "@/components/admin/Toast";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel · Valle Volcanes" },
  robots: { index: false, follow: false },
};

// Sin lectura de sesión aquí: la sesión se resuelve dentro de <Suspense> en (panel)/layout.tsx.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
