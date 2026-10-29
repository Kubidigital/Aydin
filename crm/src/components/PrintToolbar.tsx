"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export default function PrintToolbar({ fileName, autoPrint = false }: { fileName: string; autoPrint?: boolean }) {
  useEffect(() => {
    // Le titre de la page devient le nom proposé pour le fichier PDF.
    const previous = document.title;
    document.title = fileName;
    const timer = autoPrint ? setTimeout(() => window.print(), 600) : undefined;
    return () => {
      document.title = previous;
      if (timer) clearTimeout(timer);
    };
  }, [fileName, autoPrint]);

  return (
    <div className="no-print sticky top-0 z-10 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-ink-950/90 px-4 py-3 backdrop-blur">
      <p className="text-sm text-slate-400">
        Choisissez <strong className="text-slate-200">« Enregistrer au format PDF »</strong> comme imprimante pour obtenir le fichier.
      </p>
      <button className="btn-primary" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Imprimer / PDF
      </button>
    </div>
  );
}
