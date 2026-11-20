import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Expense } from "@/features/trip/types";
import { calculateSettlements, splitAmountEqually } from "./utils";

function createExpense(
  id: string,
  paidBy: string,
  amount: number,
  splitAmong: string[],
  customShares: Record<string, number>,
): Expense {
  return {
    id,
    description: id,
    place: "",
    category: "Other",
    amount,
    date: "2026-01-01",
    paidBy,
    splitType: "custom",
    splitAmong,
    customShares,
  };
}

describe("calculateSettlements", () => {
  it("cancels reciprocal debts for a participant pair", () => {
    const expenses = [
      createExpense("paid-by-mansi", "Mansi", 100, ["Nikhil"], { Nikhil: 100 }),
      createExpense("paid-by-nikhil", "Nikhil", 35, ["Mansi"], { Mansi: 35 }),
    ];

    assert.deepEqual(calculateSettlements(expenses, ["Mansi", "Nikhil"]), [
      { from: "Nikhil", to: "Mansi", amountInCents: 6500 },
    ]);
  });

  it("keeps each pairwise debt instead of netting through a third participant", () => {
    const expenses = [
      createExpense("a-paid", "A", 10, ["B"], { B: 10 }),
      createExpense("b-paid", "B", 6, ["C"], { C: 6 }),
      createExpense("c-paid", "C", 2, ["A"], { A: 2 }),
    ];

    assert.deepEqual(calculateSettlements(expenses, ["A", "B", "C"]), [
      { from: "B", to: "A", amountInCents: 1000 },
      { from: "C", to: "B", amountInCents: 600 },
      { from: "A", to: "C", amountInCents: 200 },
    ]);
  });

  it("uses integer cents when recorded equal shares include a remainder cent", () => {
    const shares = splitAmountEqually(1001, ["Mansi", "Nikhil", "Me"]);
    const expense = createExpense(
      "odd-cent-expense",
      "Mansi",
      10.01,
      ["Mansi", "Nikhil", "Me"],
      shares,
    );

    assert.deepEqual(calculateSettlements([expense], ["Mansi", "Nikhil", "Me"]), [
      { from: "Nikhil", to: "Mansi", amountInCents: 334 },
      { from: "Me", to: "Mansi", amountInCents: 333 },
    ]);
  });
});
