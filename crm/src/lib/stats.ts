import { STAGES } from "./constants";
import { invoiceDisplayStatus, today } from "./format";
import type { Contact, Invoice, Quote } from "./types";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function computeDashboard(contacts: Contact[], quotes: Quote[], invoices: Invoice[], monthlyGoal: number) {
  const now = new Date();
  const year = String(now.getFullYear());
  const monthKey = today().slice(0, 7);

  const liveInvoices = invoices.filter((i) => i.status !== "annulee" && i.status !== "brouillon");
  const paid = liveInvoices.filter((i) => i.status === "payee");
  const paidDate = (i: Invoice) => i.paid_at ?? i.issue_date;

  const revenueYear = sum(paid.filter((i) => paidDate(i).startsWith(year)));
  const revenueMonth = sum(paid.filter((i) => paidDate(i).startsWith(monthKey)));

  const accepted = quotes.filter((q) => q.status === "accepte");
  const signedDate = (q: Quote) => (q.signed_at ?? q.issue_date).slice(0, 10);
  const signedYear = sum(accepted.filter((q) => signedDate(q).startsWith(year)));

  const pendingQuotes = quotes.filter((q) => q.status === "envoye");
  const decided = quotes.filter((q) => ["accepte", "refuse", "expire"].includes(q.status));
  const conversionRate = decided.length ? Math.round((accepted.length / decided.length) * 100) : 0;
  const averageDeal = accepted.length ? sum(accepted) / accepted.length : 0;

  const unpaid = liveInvoices.filter((i) => i.status === "envoyee");
  const overdue = unpaid.filter((i) => invoiceDisplayStatus(i) === "en_retard");

  const newContactsMonth = contacts.filter((c) => c.created_at.slice(0, 7) === monthKey).length;
  const clients = contacts.filter((c) => c.type === "client").length;

  // 12 derniers mois : encaissé vs signé
  const monthly = Array.from({ length: 12 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + idx, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: `${MONTHS[d.getMonth()]}${d.getMonth() === 0 || idx === 0 ? " " + String(d.getFullYear()).slice(2) : ""}`,
      encaisse: sum(paid.filter((i) => paidDate(i).startsWith(key))),
      signe: sum(accepted.filter((q) => signedDate(q).startsWith(key))),
    };
  });

  const pipeline = STAGES.map((s) => {
    const inStage = contacts.filter((c) => c.stage === s.value);
    return {
      stage: s.value,
      label: s.label,
      count: inStage.length,
      value: inStage.reduce((acc, c) => acc + Number(c.estimated_value || 0), 0),
    };
  });
  const openPipelineValue = pipeline
    .filter((p) => STAGES.find((s) => s.value === p.stage)?.open)
    .reduce((acc, p) => acc + p.value, 0);

  const upcomingActions = contacts
    .filter((c) => c.next_action_date && c.stage !== "perdu")
    .sort((a, b) => (a.next_action_date! < b.next_action_date! ? -1 : 1))
    .slice(0, 6);

  return {
    revenueYear,
    revenueMonth,
    monthlyGoal,
    goalProgress: monthlyGoal > 0 ? Math.min(100, Math.round((revenueMonth / monthlyGoal) * 100)) : null,
    signedYear,
    pendingQuotesCount: pendingQuotes.length,
    pendingQuotesValue: sum(pendingQuotes),
    conversionRate,
    decidedCount: decided.length,
    averageDeal,
    unpaidValue: sum(unpaid),
    overdueCount: overdue.length,
    overdueValue: sum(overdue),
    contactsCount: contacts.length,
    newContactsMonth,
    clients,
    monthly,
    pipeline,
    openPipelineValue,
    upcomingActions,
    pendingQuotes: pendingQuotes.slice(0, 5),
    unpaidInvoices: unpaid.sort((a, b) => ((a.due_date ?? "") < (b.due_date ?? "") ? -1 : 1)).slice(0, 5),
  };
}

function sum(rows: { total: number }[]) {
  return rows.reduce((acc, r) => acc + Number(r.total || 0), 0);
}

export type DashboardData = ReturnType<typeof computeDashboard>;
