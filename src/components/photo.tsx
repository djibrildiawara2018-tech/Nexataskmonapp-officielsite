import Image from "next/image";
import { cn } from "./ui";

/**
 * Image de couverture (parent en `relative`).
 * - chemin local (/images/…) → next/image : redimensionnement + WebP automatiques ;
 * - URL externe saisie par l'admin → <img> classique (aucune config de domaine requise).
 */
export function Photo({
  src,
  alt = "",
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src.startsWith("/")) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className={cn("absolute inset-0 h-full w-full object-cover", className)} />;
}
