"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eraser, Loader2, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ErrorText, Field } from "@/components/ui";

export default function SignaturePanel({ token, total }: { token: string; total: string }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");

  // Canvas net sur les écrans haute densité
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e1b4b";
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  async function sign() {
    setError(null);
    if (!name.trim()) return setError("Indiquez vos nom et prénom.");
    if (!hasInk) return setError("Dessinez votre signature dans le cadre.");
    if (!agree) return setError("Cochez la case « Bon pour accord ».");
    setBusy(true);
    const signature = canvasRef.current!.toDataURL("image/png");
    const { data, error } = await createClient().rpc("sign_quote", { p_token: token, p_signer_name: name.trim(), p_signature: signature });
    setBusy(false);
    if (error || !data) return setError(error?.message ?? "Ce devis ne peut plus être signé (déjà traité ou expiré).");
    router.refresh();
  }

  async function refuse() {
    setBusy(true);
    const { data, error } = await createClient().rpc("refuse_quote", { p_token: token, p_reason: reason.trim() });
    setBusy(false);
    if (error || !data) return setError(error?.message ?? "Action impossible.");
    router.refresh();
  }

  return (
    <section className="card card-pad">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><PenLine className="h-5 w-5 text-brand-300" /> Signer le devis</h2>
      <p className="mt-1 text-sm text-slate-400">En signant, vous acceptez ce devis d&apos;un montant de {total} et ses conditions.</p>

      <div className="mt-5 grid gap-4">
        <Field label="Nom et prénom du signataire">
          <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">Signature</span>
            <button type="button" className="btn-ghost btn-sm" onClick={clear}><Eraser className="h-3.5 w-3.5" /> Effacer</button>
          </div>
          <canvas
            ref={canvasRef}
            className="h-44 w-full touch-none rounded-xl bg-white"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={() => (drawing.current = false)}
            onPointerLeave={() => (drawing.current = false)}
            aria-label="Zone de signature"
          />
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0B4FD8]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          Bon pour accord. J&apos;ai lu et j&apos;accepte le devis, ses conditions et, le cas échéant, le versement de l&apos;acompte prévu.
        </label>
        <ErrorText error={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-ghost text-slate-500" onClick={() => setRefusing((r) => !r)}>Décliner le devis</button>
          <button type="button" className="btn-primary px-6" onClick={sign} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Signer et accepter
          </button>
        </div>
        {refusing && (
          <div className="space-y-3 rounded-xl border border-white/10 p-4">
            <Field label="Motif (facultatif)">
              <textarea rows={2} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="flex justify-end">
              <button type="button" className="btn-danger" onClick={refuse} disabled={busy}>Confirmer le refus</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
