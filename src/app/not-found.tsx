import Link from "next/link";
import styles from "./not-found.module.css";

// 404 global (URLs que no coinciden con ninguna ruta). Vive fuera del layout (site):
// sin cabecera ni pie, por eso lleva su propia marca y enlaces.
export default function NotFound() {
  return (
    <main id="contenido" className={`container ${styles.wrap}`} aria-labelledby="nf-titulo">
      <Link href="/" className={styles.brand}>
        Valle Volcanes Propiedades
      </Link>
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
    </main>
  );
}
