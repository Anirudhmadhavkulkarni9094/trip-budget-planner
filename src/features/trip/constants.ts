import type { ExpenseFormState, TripDetails } from "@/features/trip/types";

export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;

export const initialTrip: TripDetails = {
  destination: "",
  startDate: "",
  endDate: "",
  travelers: ["Me"],
  budget: "",
  currency: "USD",
  travelStyle: "Balanced",
};

export const budgetCategories = [
  { name: "Stay", share: 40, color: "bg-sky-500" },
  { name: "Food", share: 25, color: "bg-amber-400" },
  { name: "Activities", share: 20, color: "bg-violet-500" },
  { name: "Transport", share: 15, color: "bg-emerald-500" },
] as const;

export const expenseCategories = [
  "Food",
  "Stay",
  "Transport",
  "Activities",
  "Other",
] as const;

export const currencyOptions = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "JPY", label: "JPY" },
  { value: "INR", label: "INR" },
  { value: "GBP", label: "GBP" },
  { value: "CAD", label: "CAD" },
  { value: "AUD", label: "AUD" },
] as const;

export function createEmptyExpenseForm(startDate: string): ExpenseFormState {
  return {
    description: "",
    place: "",
    category: "Food",
    amount: "",
    date: startDate,
    payer: "me",
    splitType: "equal",
    splitAmong: [],
    customShares: {},
    receipt: undefined,
  };
}
