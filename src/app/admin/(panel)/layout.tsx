import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";
import { getAdminStatus } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../admin.module.css";

// El panel es 100 % dinámico (depende de la sesión): no se valida como navegación instantánea.
export const instant = false;

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <PanelGate>{children}</PanelGate>
    </Suspense>
  );
}

async function PanelGate({ children }: { children: React.ReactNode }) {
  const status = await getAdminStatus();
  if (status.state === "anon") redirect("/admin/login");

  if (status.state === "denied") {
    return (
      <div className={styles.denied}>
        <div className={styles.deniedCard}>
          <h1>Tu cuenta no tiene permisos</h1>
          <p>
            Entraste con <strong>{status.email}</strong>, pero este correo no está autorizado para administrar el
            sitio. Si crees que es un error, contacta al administrador del sitio.
          </p>
          <form action={logoutAction}>
            <button type="submit" className="btn btn--forest">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("read", false);

  return (
    <div className={styles.shell}>
      <AdminNav unread={count ?? 0} email={status.email} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className={styles.shell}>
      <main className={styles.main} aria-busy="true">
        <div className={styles.skeleton}>
          <div className={styles.skeletonBar} style={{ width: "40%", height: 36 }} />
          <div className={styles.skeletonBar} style={{ width: "100%", height: 96 }} />
          <div className={styles.skeletonBar} style={{ width: "100%", height: 96 }} />
        </div>
      </main>
    </div>
  );
}
