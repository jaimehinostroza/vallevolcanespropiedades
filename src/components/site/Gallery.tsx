"use client";

import { useEffect, useRef, useState } from "react";
import { PropertyPhoto } from "@/components/PropertyPhoto";
import type { PropertyImage } from "@/lib/types";
import { GridIcon } from "./icons";
import { Lightbox, useLightbox } from "./Lightbox";
import styles from "./Gallery.module.css";

interface Props {
  images: PropertyImage[];
  title: string;
}

/**
 * Una sola lista de fotos con dos presentaciones por CSS: carrusel con scroll-snap en móvil y
 * mosaico (1 grande + 4 miniaturas) en escritorio. Así la primera foto sirve a ambos y se carga una vez.
 */
export function Gallery({ images, title }: Props) {
  const box = useLightbox();
  const track = useRef<HTMLUListElement>(null);
  const [slide, setSlide] = useState(0);
  const n = images.length;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setSlide(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (n === 0) {
    return (
      <div className={styles.empty}>
        <PropertyPhoto image={null} alt={`${title} (sin fotografía)`} aspectRatio="16 / 9" className={styles.emptyPhoto} />
      </div>
    );
  }

  return (
    <div className={styles.gallery} data-count={Math.min(n, 5)}>
      <ul ref={track} className={styles.track} aria-label={`Fotografías de ${title}`}>
        {images.map((img, i) => (
          <li key={img.id} className={styles.item} data-i={i}>
            <button
              type="button"
              className={styles.tile}
              onClick={() => box.open(i)}
              aria-label={`Ampliar foto ${i + 1} de ${n}`}
            >
              <PropertyPhoto
                image={img}
                sizes={i === 0 ? "gallery" : "(min-width: 1024px) 20vw, 100vw"}
                priority={i === 0}
                alt={img.alt ?? `${title}, foto ${i + 1}`}
                className={styles.photo}
              />
            </button>
          </li>
        ))}
      </ul>

      {n > 1 && (
        <p className={`${styles.counter} tabular`} aria-hidden="true">
          {Math.min(slide + 1, n)} / {n}
        </p>
      )}

      {n > 1 && (
        <button type="button" className={styles.all} onClick={() => box.open(0)}>
          <GridIcon width={18} height={18} /> Ver las {n} fotos
        </button>
      )}

      {box.index !== null && (
        <Lightbox images={images} index={box.index} title={title} onIndexChange={box.setIndex} onClose={box.close} />
      )}
    </div>
  );
}
