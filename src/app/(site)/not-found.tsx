import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <section className={`container ${styles.wrap}`} aria-labelledby="nf-titulo">
      <p className="eyebrow">Error 404</p>
      <h1 id="nf-titulo" className={styles.title}>
        No encontramos esta página
      </h1>
      <p className={styles.text}>
        Puede que la propiedad ya no esté publicada o que el enlace haya cambiado. Revisa nuestro catálogo: seguramente
        hay algo que te interese.
      </p>
      <div className={styles.actions}>
        <Link href="/propiedades" className="btn btn--forest">
          Ver propiedades
        </Link>
        <Link href="/" className="btn btn--ghost">
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
