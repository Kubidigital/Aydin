import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-brand-400">404</p>
      <h1 className="mt-4 text-xl font-semibold text-white">Page introuvable</h1>
      <p className="mt-2 text-sm text-slate-400">Ce document n&apos;existe pas ou n&apos;est plus disponible.</p>
      <Link href="/" className="btn-secondary mt-6">Retour au tableau de bord</Link>
    </main>
  );
}
