"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { IMAGE_SIZES, imageSrcSet, imageUrl } from "@/lib/images";
import type { PropertyImage } from "@/lib/types";

interface Props {
  image: PropertyImage | null | undefined;
  /** Clave de IMAGE_SIZES o un string `sizes` propio */
  sizes?: keyof typeof IMAGE_SIZES | (string & {});
  alt?: string;
  /** true para la primera imagen visible (portada / galería principal) */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Relación de aspecto del contenedor, ej. "4 / 3". Si no se indica, el contenedor manda. */
  aspectRatio?: string;
}

/**
 * Foto de propiedad: srcset con las variantes comprimidas (640/1280/2048), placeholder borroso
 * mientras carga y aparición con fundido. Sin foto, muestra un paisaje abstracto.
 */
export function PropertyPhoto({ image, sizes = "card", alt, priority, className, style, aspectRatio }: Props) {
  // Las fotos prioritarias (portada, galería principal) se pintan sin fundido: definen el LCP
  // y deben verse aunque el JavaScript aún no haya cargado.
  const [loaded, setLoaded] = useState(Boolean(priority));
  const ref = useRef<HTMLImageElement>(null);

  // Si la imagen ya estaba en caché, onLoad puede dispararse antes de hidratar.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, [image?.id]);

  const sizesValue = sizes in IMAGE_SIZES ? IMAGE_SIZES[sizes as keyof typeof IMAGE_SIZES] : sizes;

  if (!image) {
    return (
      <div
        className={["photo photo--empty", className].filter(Boolean).join(" ")}
        style={{ aspectRatio, ...style }}
        role="img"
        aria-label={alt ?? "Propiedad sin fotografía"}
      />
    );
  }

  return (
    <div
      className={["photo", className].filter(Boolean).join(" ")}
      data-loaded={loaded}
      style={{
        aspectRatio,
        backgroundImage: image.placeholder ? `url(${image.placeholder})` : undefined,
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- variantes propias ya optimizadas */}
      <img
        ref={ref}
        src={imageUrl(image, "md")}
        srcSet={imageSrcSet(image)}
        sizes={sizesValue}
        width={image.width}
        height={image.height}
        alt={alt ?? image.alt ?? ""}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
