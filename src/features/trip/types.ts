export type TripStep = "home" | "form" | "dashboard" | "trips";

export type SplitType = "equal" | "custom";
export type SettlementStatus = "pending" | "paid";

export type TripDetails = {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: string[];
  budget: string;
  currency: string;
  travelStyle: string;
};

export type Expense = {
  id: string;
  description: string;
  place: string;
  category: string;
  amount: number;
  date: string;
  paidBy: string;
  splitType: SplitType;
  splitAmong: string[];
  customShares: Record<string, number>;
  receipt?: {
    name: string;
    dataUrl: string;
    storagePath?: string;
  };
};

export type ExpenseFormState = {
  description: string;
  place: string;
  category: string;
  amount: string;
  date: string;
  payer: string;
  splitType: SplitType;
  splitAmong: string[];
  customShares: Record<string, string>;
  receipt?: Expense["receipt"];
};
