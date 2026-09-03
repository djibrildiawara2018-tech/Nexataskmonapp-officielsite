import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-extrabold text-emerald-600">404</p>
      <p className="text-slate-500">Page introuvable · Page not found · Página no encontrada</p>
      <Link href="/" className={buttonClass("primary", "md")}>NexaTask</Link>
    </main>
  );
}
