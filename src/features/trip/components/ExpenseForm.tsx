import type { ChangeEvent, FormEvent } from "react";

import { expenseCategories } from "@/features/trip/constants";
import type { ExpenseFormState, TripDetails } from "@/features/trip/types";

type ExpenseFormProps = {
  trip: TripDetails;
  expenseForm: ExpenseFormState;
  expenseError: string;
  currencyFormatter: Intl.NumberFormat;
  isSaving: boolean;
  onExpenseFieldChange: (
    field: keyof ExpenseFormState,
    value: ExpenseFormState[keyof ExpenseFormState],
  ) => void;
  onReceiptChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveReceipt: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ExpenseForm({
  trip,
  expenseForm,
  expenseError,
  currencyFormatter,
  isSaving,
  onExpenseFieldChange,
  onReceiptChange,
  onRemoveReceipt,
  onSubmit,
}: ExpenseFormProps) {
  return (
    <div className="h-fit rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
      <h2 className="text-xl font-semibold">Log an expense</h2>
      <p className="mt-1 text-sm text-slate-500">
        Keep track of what you spend each day.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="expenseDescription" className="mb-2 block text-sm font-semibold">
            What did you spend on?
          </label>
          <input
            id="expenseDescription"
            type="text"
            placeholder="e.g. Lunch at the market"
            required
            value={expenseForm.description}
            onChange={(event) => onExpenseFieldChange("description", event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
          />
        </div>

        <div>
          <label htmlFor="expensePlace" className="mb-2 block text-sm font-semibold">
            Where did you spend it?
          </label>
          <input
            id="expensePlace"
            type="text"
            placeholder="e.g. Cafe name or shop"
            value={expenseForm.place}
            onChange={(event) => onExpenseFieldChange("place", event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="expenseCategory" className="mb-2 block text-sm font-semibold">
              Category
            </label>
            <select
              id="expenseCategory"
              value={expenseForm.category}
              onChange={(event) => onExpenseFieldChange("category", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            >
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expenseDate" className="mb-2 block text-sm font-semibold">
              Date
            </label>
            <input
              id="expenseDate"
              type="date"
              required
              value={expenseForm.date}
              onChange={(event) => onExpenseFieldChange("date", event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="expenseAmount" className="mb-2 block text-sm font-semibold">
              Amount
            </label>
            <input
              id="expenseAmount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
              value={expenseForm.amount}
              onChange={(event) => {
                const nextAmount = event.target.value;
                onExpenseFieldChange("amount", nextAmount);
                if (expenseForm.splitType === "custom") {
                  const nextShares = Object.fromEntries(
                    Object.entries(expenseForm.customShares).filter(
                      ([traveler]) => !expenseForm.splitAmong.includes(traveler),
                    ),
                  );

                  const averageShare = Object.fromEntries(
                    expenseForm.splitAmong.map((traveler) => [
                      traveler,
                      ((Number(nextAmount) || 0) / Math.max(expenseForm.splitAmong.length, 1))
                        .toFixed(2),
                    ]),
                  );

                  onExpenseFieldChange("customShares", {
                    ...nextShares,
                    ...averageShare,
                  });
                }
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            />
          </div>
          <div>
            <label htmlFor="expensePayer" className="mb-2 block text-sm font-semibold">
              Who paid?
            </label>
            <select
              id="expensePayer"
              required
              value={expenseForm.payer}
              onChange={(event) => onExpenseFieldChange("payer", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            >
              <option value="me">Me</option>
              {trip.travelers
                .filter((traveler) => traveler !== "Me")
                .map((traveler, index) => (
                  <option key={`${traveler}-${index}`} value={traveler}>
                    {traveler}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Split this expense</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm">
              <input
                type="radio"
                name="splitType"
                value="equal"
                checked={expenseForm.splitType === "equal"}
                onChange={() => onExpenseFieldChange("splitType", "equal")}
                className="accent-emerald-700"
              />
              Split equally
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm">
              <input
                type="radio"
                name="splitType"
                value="custom"
                checked={expenseForm.splitType === "custom"}
                onChange={() => onExpenseFieldChange("splitType", "custom")}
                className="accent-emerald-700"
              />
              Custom amounts
            </label>
          </div>
          <p className="mb-2 mt-4 text-sm text-slate-600">Who should share it?</p>
          <div className="space-y-2">
            {trip.travelers.map((traveler, index) => {
              const selected = expenseForm.splitAmong.includes(traveler);
              return (
                <div key={`${traveler}-${index}`} className="flex items-center gap-3">
                  <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-[#f7f8f6] px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => {
                        const nextTravelers = event.target.checked
                          ? [...expenseForm.splitAmong, traveler]
                          : expenseForm.splitAmong.filter((name) => name !== traveler);
                        onExpenseFieldChange("splitAmong", nextTravelers);
                      }}
                      className="size-4 accent-emerald-700"
                    />
                    <span className="truncate">{traveler}</span>
                  </label>
                  {expenseForm.splitType === "custom" && selected && (
                    <label className="flex w-36 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3">
                      <span className="text-sm text-slate-500">{trip.currency}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        aria-label={`${traveler}'s share`}
                        value={expenseForm.customShares[traveler] ?? ""}
                        onChange={(event) =>
                          onExpenseFieldChange("customShares", {
                            ...expenseForm.customShares,
                            [traveler]: event.target.value,
                          })
                        }
                        className="min-w-0 w-full py-3 text-right outline-none"
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          {expenseForm.splitType === "custom" && (
            <p className="mt-2 text-xs text-slate-500">
              Custom shares must add up to {currencyFormatter.format(Number(expenseForm.amount) || 0)}.
            </p>
          )}
        </fieldset>

        <div>
          <label htmlFor="expenseReceipt" className="mb-2 block text-sm font-semibold">
            Receipt image <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="expenseReceipt"
            type="file"
            accept="image/*"
            onChange={onReceiptChange}
            className="block w-full cursor-pointer rounded-xl border border-slate-200 text-sm text-slate-600 file:mr-4 file:border-0 file:bg-emerald-50 file:px-4 file:py-3 file:font-semibold file:text-emerald-800 hover:file:bg-emerald-100"
          />
          {expenseForm.receipt && (
            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-600">
              <a
                href={expenseForm.receipt.dataUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate underline underline-offset-2"
              >
                {expenseForm.receipt.name}
              </a>
              <button
                type="button"
                onClick={onRemoveReceipt}
                className="shrink-0 font-semibold text-red-600"
              >
                Remove
              </button>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Image files up to 5 MB.</p>
        </div>
        {expenseError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {expenseError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-full bg-emerald-700 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Add expense"}
        </button>
      </form>
    </div>
  );
}
