import type { Expense, TripDetails } from "@/features/trip/types";

export function splitAmountEqually(
  amountInCents: number,
  travelers: string[],
): Record<string, number> {
  if (travelers.length === 0) {
    return {};
  }

  const baseShare = Math.floor(amountInCents / travelers.length);
  let remainder = amountInCents % travelers.length;

  return Object.fromEntries(
    travelers.map((traveler) => {
      const shareAmount = baseShare + (remainder > 0 ? 1 : 0);
      remainder -= remainder > 0 ? 1 : 0;
      return [traveler, shareAmount / 100];
    }),
  );
}

export function formatDate(date: string): string {
  if (!date) {
    return "";
  }

  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export type Settlement = {
  from: string;
  to: string;
  amountInCents: number;
};

export function calculateSettlements(
  expenses: Expense[],
  travelers: string[],
): Settlement[] {
  const travelerOrder = new Map(
    travelers.map((traveler, index) => [traveler, index]),
  );
  const pairBalances = new Map<
    string,
    { first: string; second: string; firstOwesSecondInCents: number }
  >();

  for (const expense of expenses) {
    for (const traveler of expense.splitAmong) {
      if (traveler === expense.paidBy) {
        continue;
      }

      const shareInCents = Math.round(
        (expense.customShares[traveler] ?? 0) * 100,
      );
      const payerOrder = travelerOrder.get(expense.paidBy) ?? Number.MAX_SAFE_INTEGER;
      const participantOrder = travelerOrder.get(traveler) ?? Number.MAX_SAFE_INTEGER;
      const [first, second] =
        payerOrder < participantOrder ||
        (payerOrder === participantOrder && expense.paidBy < traveler)
          ? [expense.paidBy, traveler]
          : [traveler, expense.paidBy];
      const key = JSON.stringify([first, second]);
      const pair = pairBalances.get(key) ?? {
        first,
        second,
        firstOwesSecondInCents: 0,
      };

      pair.firstOwesSecondInCents +=
        traveler === first ? shareInCents : -shareInCents;
      pairBalances.set(key, pair);
    }
  }

  return [...pairBalances.values()]
    .filter((pair) => pair.firstOwesSecondInCents !== 0)
    .map((pair) =>
      pair.firstOwesSecondInCents > 0
        ? {
            from: pair.first,
            to: pair.second,
            amountInCents: pair.firstOwesSecondInCents,
          }
        : {
            from: pair.second,
            to: pair.first,
            amountInCents: -pair.firstOwesSecondInCents,
          },
    );
}

export function getSettlementKey(from: string, to: string): string {
  return JSON.stringify([from, to]);
}

export function getTravelersForSubmission(travelers: string[]): string[] {
  return travelers.map((traveler) => traveler.trim());
}

export function containsDuplicateTravelers(travelers: string[]): boolean {
  const normalized = travelers.map((traveler) => traveler.toLocaleLowerCase());
  return new Set(normalized).size !== travelers.length;
}

export function buildCustomSharePreview(
  amountText: string,
  splitAmong: string[],
  currentShares: Record<string, string>,
): Record<string, string> {
  const parsedAmount = Number(amountText);
  if (!Number.isFinite(parsedAmount) || splitAmong.length === 0) {
    return {};
  }

  const amountInCents = Math.round(parsedAmount * 100);
  const equalShares = splitAmountEqually(amountInCents, splitAmong);

  return {
    ...Object.fromEntries(
      Object.entries(equalShares).map(([traveler, share]) => [
        traveler,
        share.toFixed(2),
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(currentShares).filter(
        ([traveler]) => !splitAmong.includes(traveler),
      ),
    ),
  };
}

export function getTripSummary(trip: TripDetails, expenses: Expense[]) {
  const budgetPerTraveler = Number(trip.budget) || 0;
  const budget = budgetPerTraveler * trip.travelers.length;
  const totalSpent = expenses.reduce((total, expense) => total + expense.amount, 0);
  const remainingBudget = budget - totalSpent;

  return {
    budget,
    totalSpent,
    remainingBudget,
  };
}
