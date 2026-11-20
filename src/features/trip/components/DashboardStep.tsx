import { useState, type FormEvent } from "react";

import { budgetCategories } from "@/features/trip/constants";
import { ExpenseForm } from "@/features/trip/components/ExpenseForm";
import type {
  Expense,
  ExpenseFormState,
  SettlementStatus,
  TripDetails,
} from "@/features/trip/types";
import {
  calculateSettlements,
  formatCurrency,
  formatDate,
  getSettlementKey,
  type Settlement,
} from "@/features/trip/utils";

type DashboardStepProps = {
  trip: TripDetails;
  expenses: Expense[];
  expensesByDate: Record<string, Expense[]>;
  expenseForm: ExpenseFormState;
  expenseError: string;
  totalSpent: number;
  remainingBudget: number;
  budget: number;
  isTripEnded: boolean;
  isSaving: boolean;
  settlementStatuses: Record<string, SettlementStatus>;
  onEditTrip: () => void;
  onEndTrip: () => void;
  onSettlementStatusChange: (settlement: Settlement) => void;
  onExpenseDelete: (id: string) => void;
  onReceiptChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveReceipt: () => void;
  onSubmitExpense: (event: FormEvent<HTMLFormElement>) => void;
  onExpenseFieldChange: (
    field: keyof ExpenseFormState,
    value: ExpenseFormState[keyof ExpenseFormState],
  ) => void;
};

export function DashboardStep({
  trip,
  expenses,
  expensesByDate,
  expenseForm,
  expenseError,
  totalSpent,
  remainingBudget,
  budget,
  isTripEnded,
  isSaving,
  settlementStatuses,
  onEditTrip,
  onEndTrip,
  onSettlementStatusChange,
  onExpenseDelete,
  onReceiptChange,
  onRemoveReceipt,
  onSubmitExpense,
  onExpenseFieldChange,
}: DashboardStepProps) {
  const [activeExpenseDate, setActiveExpenseDate] = useState("");
  const [activeView, setActiveView] = useState<"log" | "logged" | "details">(
    "log",
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: trip.currency,
  });
  const settlements = calculateSettlements(expenses, trip.travelers);
  const outstandingInCents = settlements.reduce(
    (total, settlement) =>
      settlementStatuses[getSettlementKey(settlement.from, settlement.to)] === "paid"
        ? total
        : total + settlement.amountInCents,
    0,
  );
  const paidInCents = settlements.reduce(
    (total, settlement) =>
      settlementStatuses[getSettlementKey(settlement.from, settlement.to)] === "paid"
        ? total + settlement.amountInCents
        : total,
    0,
  );

  return (
    <section className="mx-auto flex max-w-6xl flex-col px-6 pb-28 pt-6 sm:px-10 md:pb-16">
      <div className="mb-9">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
          Your trip dashboard
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {trip.destination}
        </h1>
        <p className="mt-3 text-slate-600">
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          <span className="mx-2 text-slate-300">•</span>
          {trip.travelStyle} trip
        </p>
      </div>

      <nav aria-label="Trip dashboard views" className="fixed bottom-4 right-4 z-50 md:hidden">
        {isMobileMenuOpen && (
          <div className="menu-actions absolute bottom-16 right-0 w-52 origin-bottom-right rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_36px_rgba(15,23,42,0.18)] [animation:menu-enter_180ms_ease-out]">
            <button
              type="button"
              disabled={isTripEnded}
              onClick={() => {
                setActiveView("log");
                setIsMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                activeView === "log"
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-700"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="text-lg" aria-hidden="true">＋</span>
              Log expense
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView("logged");
                setIsMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                activeView === "logged"
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-700"
              }`}
            >
              <span className="text-lg" aria-hidden="true">≡</span>
              Logged expenses
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView("details");
                setIsMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                activeView === "details"
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-700"
              }`}
            >
              <span className="text-lg" aria-hidden="true">i</span>
              Trip details
            </button>
          </div>
        )}
        <button
          type="button"
          aria-label={isMobileMenuOpen ? "Close dashboard menu" : "Open dashboard menu"}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="flex size-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-[0_8px_24px_rgba(4,120,87,0.35)] transition duration-200 active:scale-90"
        >
          <span className="relative block h-4 w-5" aria-hidden="true">
            <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-white transition ${isMobileMenuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-white transition ${isMobileMenuOpen ? "opacity-0" : ""}`} />
            <span className={`absolute left-0 bottom-0 h-0.5 w-5 rounded-full bg-white transition ${isMobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </span>
        </button>
      </nav>

      <div className={`${activeView === "details" ? "grid" : "hidden"} gap-4 sm:grid-cols-2 md:grid lg:grid-cols-3 xl:grid-cols-5 [animation:view-enter_220ms_ease-out] md:[animation:none]`}>
        <StatCard label="Travelers" value={trip.travelers.length} helper="people going" />
        <StatCard
          label="Trip budget"
          value={formatCurrency(budget, trip.currency)}
          helper="Combined budget for everyone"
        />
        <StatCard
          label="Spent so far"
          value={formatCurrency(totalSpent, trip.currency)}
          helper={`${expenses.length} logged ${expenses.length === 1 ? "expense" : "expenses"}`}
        />
        <StatCard
          label={remainingBudget < 0 ? "Over budget" : "Budget remaining"}
          value={formatCurrency(Math.abs(remainingBudget), trip.currency)}
          helper={
            remainingBudget < 0 ? "above your trip budget" : "available to spend"
          }
          accent={remainingBudget < 0 ? "text-red-600" : undefined}
        />
        <StatCard
          label="Per traveler"
          value={formatCurrency(Number(trip.budget) || 0, trip.currency)}
          helper="Individual spending target"
        />
      </div>

      {!isTripEnded && (
        <div className={`${activeView === "log" ? "block" : "hidden"} mx-auto w-full max-w-2xl [animation:view-enter_220ms_ease-out] md:block md:mt-7 md:max-w-none md:rounded-2xl md:border md:border-slate-200/80 md:p-6 md:sm:p-8 md:[animation:none]`}>
          <ExpenseForm
            trip={trip}
            expenseForm={expenseForm}
            expenseError={expenseError}
            isSaving={isSaving}
            currencyFormatter={currencyFormatter}
            onExpenseFieldChange={onExpenseFieldChange}
            onReceiptChange={onReceiptChange}
            onRemoveReceipt={onRemoveReceipt}
            onSubmit={onSubmitExpense}
          />
        </div>
      )}

      <div className={`${activeView === "logged" ? "grid" : "hidden"} gap-5 [animation:view-enter_220ms_ease-out] md:grid md:mt-7 md:[animation:none]`}>
        {isTripEnded ? (
          <div className="h-fit rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
              Trip closed
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              Your trip summary
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Expense tracking and trip edits are now locked. This action cannot be undone.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SummaryMetric label="Budget" value={formatCurrency(budget, trip.currency)} />
              <SummaryMetric label="Spent" value={formatCurrency(totalSpent, trip.currency)} />
              <SummaryMetric
                label="Remaining"
                value={formatCurrency(Math.abs(remainingBudget), trip.currency)}
                tone={remainingBudget < 0 ? "danger" : "neutral"}
              />
              <SummaryMetric label="Expenses" value={String(expenses.length)} />
            </div>
            <div className="mt-7 border-t border-emerald-200 pt-5">
              <h3 className="text-lg font-semibold text-slate-900">Settle up</h3>
              <p className="mt-1 text-sm text-slate-600">
                Based on who paid and each traveler&apos;s share of the expenses.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SummaryMetric
                  label="Outstanding"
                  value={formatCurrency(outstandingInCents / 100, trip.currency)}
                />
                <SummaryMetric
                  label="Marked paid"
                  value={formatCurrency(paidInCents / 100, trip.currency)}
                />
              </div>
              {settlements.length === 0 ? (
                <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm font-medium text-emerald-900">
                  No pairwise balances to settle.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {settlements.map((settlement) => {
                    const status =
                      settlementStatuses[
                        getSettlementKey(settlement.from, settlement.to)
                      ] ?? "pending";

                    return (
                    <li
                      key={getSettlementKey(settlement.from, settlement.to)}
                      className="rounded-xl bg-white/70 px-4 py-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Payer
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {settlement.from}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Receiver
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {settlement.to}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Amount
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatCurrency(
                              settlement.amountInCents / 100,
                              trip.currency,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {status === "paid" ? "Paid" : "Pending"}
                        </span>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => onSettlementStatusChange(settlement)}
                          className="text-sm font-semibold text-emerald-800 underline underline-offset-2 disabled:cursor-wait disabled:opacity-50"
                        >
                          {status === "paid" ? "Mark pending" : "Mark paid"}
                        </button>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">Daily spending</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your expenses grouped by day
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-600">
              Total: {formatCurrency(totalSpent, trip.currency)}
            </p>
          </div>
          {expenses.length === 0 ? (
            <div className="mt-6 rounded-xl bg-[#f7f8f6] px-5 py-8 text-center">
              <p className="font-medium">No expenses logged yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add your first expense to start tracking your trip spend.
              </p>
            </div>
          ) : (
            (() => {
              const expenseDates = Object.keys(expensesByDate).sort(
                (dateA, dateB) => dateB.localeCompare(dateA),
              );
              const selectedDate =
                expenseDates.includes(activeExpenseDate)
                  ? activeExpenseDate
                  : expenseDates[0];
              const dailyExpenses = selectedDate
                ? expensesByDate[selectedDate] ?? []
                : [];
              const dailyTotal = dailyExpenses.reduce(
                (total, expense) => total + expense.amount,
                0,
              );

              return (
                <div className="mt-6">
                  <div
                    role="tablist"
                    aria-label="Expenses by date"
                    className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3"
                  >
                    {expenseDates.map((date) => {
                      const dateTotal = expensesByDate[date].reduce(
                        (total, expense) => total + expense.amount,
                        0,
                      );
                      const isActive = date === selectedDate;

                      return (
                        <button
                          key={date}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          aria-controls="daily-expense-panel"
                          onClick={() => setActiveExpenseDate(date)}
                          className={`shrink-0 rounded-xl px-3 py-2 text-left transition ${
                            isActive
                              ? "bg-emerald-700 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-emerald-50"
                          }`}
                        >
                          <span className="block text-xs font-semibold">
                            {formatDate(date)}
                          </span>
                          <span className="mt-0.5 block text-sm font-bold">
                            {formatCurrency(dateTotal, trip.currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <section
                    id="daily-expense-panel"
                    role="tabpanel"
                    aria-label={`Expenses for ${selectedDate}`}
                    className="pt-2"
                  >
                    <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {formatDate(selectedDate)}
                      </h3>
                      <span className="text-sm font-semibold">
                        {formatCurrency(dailyTotal, trip.currency)}
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {dailyExpenses.map((expense) => (
                        <li
                          key={expense.id}
                          className="flex items-start justify-between gap-4 py-4"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{expense.description}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {expense.category} · {expense.place}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Paid by {expense.paidBy} · {expense.splitType === "equal" ? "Equal split" : "Custom split"}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {expense.splitAmong
                                .map(
                                  (traveler) =>
                                    `${traveler}: ${formatCurrency(expense.customShares[traveler] ?? 0, trip.currency)}`,
                                )
                                .join(" · ")}
                            </p>
                            {expense.receipt && (
                              <a
                                href={expense.receipt.dataUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block text-sm font-semibold text-emerald-800 underline underline-offset-2"
                              >
                                View receipt
                              </a>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-semibold">
                              {formatCurrency(expense.amount, trip.currency)}
                            </span>
                            {!isTripEnded && (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => onExpenseDelete(expense.id)}
                                aria-label={`Delete ${expense.description}`}
                                className="flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              );
            })()
          )}
        </div>
      </div>
      <div className={`${activeView === "details" ? "mt-7 grid" : "hidden"} gap-5 [animation:view-enter_220ms_ease-out] md:mt-7 md:grid lg:grid-cols-[1.15fr_0.85fr] md:[animation:none]`}>
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
            <div>
              <h2 className="text-xl font-semibold">Suggested budget split</h2>
              <p className="mt-1 text-sm text-slate-500">
                Suggested amounts based on the combined trip budget
              </p>
            </div>
            <div className="mt-7 flex h-3 overflow-hidden rounded-full bg-slate-100">
              {budgetCategories.map((category) => (
                <div
                  key={category.name}
                  className={category.color}
                  style={{ width: `${category.share}%` }}
                  title={`${category.name}: ${category.share}%`}
                />
              ))}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {budgetCategories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`size-2.5 rounded-full ${category.color}`} />
                    <span className="text-sm text-slate-600">{category.name}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency((budget * category.share) / 100, trip.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Who&apos;s coming</h2>
            <p className="mt-1 text-sm text-slate-500">
              {trip.travelers.length} {trip.travelers.length === 1 ? "traveler" : "travelers"} on this trip
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {trip.travelers.map((traveler, index) => (
                <li
                  key={`${traveler}-${index}`}
                  className="flex items-center gap-3 rounded-xl bg-[#f7f8f6] px-4 py-3"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                    {traveler.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium">
                    {traveler}
                    {traveler === "Me" && (
                      <span className="ml-2 text-sm font-normal text-slate-500">(you)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-emerald-800 p-6 text-white sm:p-8">
          <div>
            <p className="text-sm font-semibold text-emerald-100">
              {isTripEnded ? "Trip complete" : "You&apos;re off to a great start"}
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-snug">
              {isTripEnded
                ? "Everything is wrapped up. Your trip is now closed."
                : "The best trips are made one good plan at a time."}
            </h2>
          </div>
          {!isTripEnded ? (
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={isSaving}
                onClick={onEditTrip}
                className="self-start rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
              >
                Update trip details
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={onEndTrip}
                className="self-start rounded-full border border-white/40 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
              >
                End trip
              </button>
            </div>
          ) : (
            <div className="mt-8 inline-flex self-start rounded-full border border-emerald-300/40 bg-emerald-900/40 px-5 py-3 text-sm font-semibold text-emerald-50">
              Trip ended
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  helper: string;
  accent?: string;
};

function StatCard({ label, value, helper, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${accent ?? ""}`}>{String(value)}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

type SummaryMetricProps = {
  label: string;
  value: string;
  tone?: "neutral" | "danger";
};

function SummaryMetric({ label, value, tone = "neutral" }: SummaryMetricProps) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-lg font-semibold ${
          tone === "danger" ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
