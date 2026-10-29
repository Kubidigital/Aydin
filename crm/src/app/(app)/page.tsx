import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  CalendarClock,
  Euro,
  FileSignature,
  Percent,
  Receipt,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { computeDashboard } from "@/lib/stats";
import { contactName, formatDate, formatEuro, formatEuroShort, today } from "@/lib/format";
import { ACTIVITY_KINDS, labelOf } from "@/lib/constants";
import type { Activity, Contact, Invoice, Quote } from "@/lib/types";
import { Avatar, PageHeader } from "@/components/ui";
import { PipelineChart, RevenueChart } from "@/components/DashboardCharts";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, user } = await getUser();
  const [{ data: contacts }, { data: quotes }, { data: invoices }, { data: activities }, { data: profile }] = await Promise.all([
    supabase.from("contacts").select("*").order("created_at", { ascending: false }),
    supabase.from("quotes").select("*").order("issue_date", { ascending: false }),
    supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
    supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("profiles").select("first_name, monthly_revenue_goal").eq("id", user!.id).maybeSingle(),
  ]);

  const allContacts = (contacts ?? []) as Contact[];
  const byId = new Map(allContacts.map((c) => [c.id, c]));
  const d = computeDashboard(allContacts, (quotes ?? []) as Quote[], (invoices ?? []) as Invoice[], Number(profile?.monthly_revenue_goal ?? 0));

  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Bonjour${profile?.first_name ? " " + profile.first_name : ""} 👋`}
        subtitle={<span className="capitalize">{dateLabel}</span>}
        actions={
          <>
            <Link href="/contacts?nouveau=1" className="btn-secondary">Nouveau contact</Link>
            <Link href="/devis/nouveau" className="btn-primary">Nouveau devis</Link>
          </>
        }
      />

      {/* Indicateurs clés */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Euro}
          gradient="from-emerald-500 to-teal-500"
          label={`CA encaissé ${new Date().getFullYear()}`}
          value={formatEuroShort(d.revenueYear)}
          hint={`${formatEuroShort(d.revenueMonth)} ce mois-ci`}
        />
        <KpiCard
          icon={FileSignature}
          gradient="from-brand-500 to-indigo-500"
          label="CA signé (devis acceptés)"
          value={formatEuroShort(d.signedYear)}
          hint={`Panier moyen ${formatEuroShort(d.averageDeal)}`}
        />
        <KpiCard
          icon={Receipt}
          gradient="from-sky-500 to-blue-500"
          label="À encaisser"
          value={formatEuroShort(d.unpaidValue)}
          hint={d.overdueCount ? `${d.overdueCount} facture(s) en retard · ${formatEuroShort(d.overdueValue)}` : "Aucun retard"}
          alert={d.overdueCount > 0}
        />
        <KpiCard
          icon={Percent}
          gradient="from-amber-500 to-orange-500"
          label="Taux de transformation"
          value={`${d.conversionRate} %`}
          hint={`${d.pendingQuotesCount} devis en attente · ${formatEuroShort(d.pendingQuotesValue)}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat icon={Users} label="Contacts" value={String(d.contactsCount)} hint={`+${d.newContactsMonth} ce mois · ${d.clients} clients`} />
        <MiniStat icon={TrendingUp} label="Pipeline ouvert" value={formatEuroShort(d.openPipelineValue)} hint="Valeur estimée des opportunités en cours" />
        <GoalStat revenue={d.revenueMonth} goal={d.monthlyGoal} progress={d.goalProgress} />
      </div>

      {/* Graphiques */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <section className="card card-pad xl:col-span-3">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-semibold text-white">Chiffre d&apos;affaires</h3>
            <span className="text-xs text-slate-500">12 derniers mois</span>
          </div>
          <RevenueChart data={d.monthly} />
        </section>
        <section className="card card-pad xl:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-semibold text-white">Pipeline commercial</h3>
            <Link href="/pipeline" className="text-xs text-brand-300 hover:text-brand-200">Ouvrir</Link>
          </div>
          <PipelineChart data={d.pipeline} />
        </section>
      </div>

      {/* Listes d'action */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ListCard title="Devis en attente de signature" href="/devis" empty="Aucun devis en attente.">
          {d.pendingQuotes.map((q) => (
            <Row key={q.id} href={`/devis/${q.id}`} title={q.number} subtitle={contactName(byId.get(q.contact_id ?? ""))} right={formatEuro(q.total)}
              meta={q.valid_until ? `Valide jusqu'au ${formatDate(q.valid_until)}` : undefined} />
          ))}
        </ListCard>
        <ListCard title="Factures à encaisser" href="/factures" empty="Tout est encaissé. 🎉">
          {d.unpaidInvoices.map((i) => {
            const late = i.due_date && i.due_date < today();
            return (
              <Row key={i.id} href={`/factures/${i.id}`} title={i.number} subtitle={contactName(byId.get(i.contact_id ?? ""))} right={formatEuro(i.total)}
                meta={i.due_date ? `${late ? "En retard depuis le" : "Échéance le"} ${formatDate(i.due_date)}` : undefined} alert={!!late} />
            );
          })}
        </ListCard>
        <ListCard title="Prochaines actions" href="/contacts" empty="Aucune relance planifiée.">
          {d.upcomingActions.map((c) => {
            const late = c.next_action_date! < today();
            return (
              <Row key={c.id} href={`/contacts/${c.id}`} title={contactName(c)} subtitle={c.next_action || "Relancer"}
                right={<span className={cn("inline-flex items-center gap-1 text-xs", late ? "text-rose-300" : "text-slate-400")}>
                  {late ? <AlarmClock className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                  {formatDate(c.next_action_date, { day: "numeric", month: "short" })}
                </span>} />
            );
          })}
        </ListCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListCard title="Contacts récents" href="/contacts" empty="Aucun contact pour l'instant.">
          {allContacts.slice(0, 5).map((c) => (
            <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
              <Avatar text={contactName(c).slice(0, 2).toUpperCase()} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{contactName(c)}</p>
                <p className="truncate text-xs text-slate-500">{c.company || c.email || "—"}</p>
              </div>
              <span className="text-xs text-slate-500">{formatDate(c.created_at, { day: "numeric", month: "short" })}</span>
            </Link>
          ))}
        </ListCard>
        <ListCard title="Activité récente" empty="Aucune activité enregistrée.">
          {((activities ?? []) as Activity[]).map((a) => (
            <div key={a.id} className="flex gap-3 px-2 py-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-200">{a.content}</p>
                <p className="text-xs text-slate-500">
                  {labelOf(ACTIVITY_KINDS, a.kind)} · {formatDate(a.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {a.contact_id && byId.get(a.contact_id) && <> · {contactName(byId.get(a.contact_id))}</>}
                </p>
              </div>
            </div>
          ))}
        </ListCard>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, gradient, label, value, hint, alert }: {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
}) {
  return (
    <div className="card card-pad relative overflow-hidden">
      <div className={cn("mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", gradient)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
      <p className={cn("mt-3 text-xs", alert ? "text-rose-300" : "text-slate-500")}>{hint}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string }) {
  return (
    <div className="card flex items-center gap-4 px-5 py-4">
      <Icon className="h-5 w-5 shrink-0 text-slate-500" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
        <p className="truncate text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function GoalStat({ revenue, goal, progress }: { revenue: number; goal: number; progress: number | null }) {
  return (
    <div className="card flex items-center gap-4 px-5 py-4">
      <Target className="h-5 w-5 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">Objectif du mois</p>
        {progress === null ? (
          <p className="text-sm text-slate-400">
            <Link href="/parametres" className="text-brand-300 hover:text-brand-200">Définir un objectif mensuel</Link>
          </p>
        ) : (
          <>
            <p className="text-lg font-semibold text-white">
              {progress} % <span className="text-xs font-normal text-slate-500">· {formatEuroShort(revenue)} / {formatEuroShort(goal)}</span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-400" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ListCard({ title, href, empty, children }: { title: string; href?: string; empty: string; children: React.ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <section className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {hasItems ? <div className="-mx-2 space-y-0.5">{children}</div> : <p className="py-6 text-center text-sm text-slate-500">{empty}</p>}
    </section>
  );
}

function Row({ href, title, subtitle, right, meta, alert }: {
  href: string;
  title: string;
  subtitle: string;
  right: React.ReactNode;
  meta?: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">{title}</p>
        <p className="truncate text-xs text-slate-500">
          {subtitle}
          {meta && <span className={alert ? "text-rose-300" : undefined}> · {meta}</span>}
        </p>
      </div>
      <div className="shrink-0 text-sm font-medium text-slate-200">{right}</div>
    </Link>
  );
}
