import type { FormEvent } from "react";

import { currencyOptions } from "@/features/trip/constants";
import type { TripDetails } from "@/features/trip/types";

type TripFormStepProps = {
  trip: TripDetails;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onTripChange: (field: keyof TripDetails, value: string | string[]) => void;
  isSaving: boolean;
  submitLabel: string;
};

export function TripFormStep({
  trip,
  onSubmit,
  onBack,
  onTripChange,
  isSaving,
  submitLabel,
}: TripFormStepProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-16 pt-6 sm:px-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 text-sm font-semibold text-slate-500 transition hover:text-emerald-800"
      >
        ← Back
      </button>
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
          Let&apos;s get planning
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Tell us about your trip
        </h1>
        <p className="mt-3 text-slate-600">
          Start with the essentials. You can always change these later.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-7 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-9"
      >
        <div>
          <label htmlFor="destination" className="mb-2 block text-sm font-semibold">
            Where are you going?
          </label>
          <input
            id="destination"
            name="destination"
            type="text"
            autoComplete="country-name"
            placeholder="City, country or region"
            required
            value={trip.destination}
            onChange={(event) => onTripChange("destination", event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            When are you traveling?
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="mb-2 block text-xs font-medium text-slate-500">
                Start date
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                value={trip.startDate}
                onChange={(event) => {
                  const nextStartDate = event.target.value;
                  onTripChange("startDate", nextStartDate);
                  if (trip.endDate && trip.endDate < nextStartDate) {
                    onTripChange("endDate", "");
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="mb-2 block text-xs font-medium text-slate-500">
                End date
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                min={trip.startDate || undefined}
                required
                value={trip.endDate}
                onChange={(event) => onTripChange("endDate", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              />
            </div>
          </div>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                Who&apos;s coming?
              </legend>
              <p className="mb-3 text-sm text-slate-500">
                You&apos;re included. Add the other people joining you.
              </p>
              <div className="space-y-3">
                {trip.travelers.map((traveler, index) => (
                  <div key={`traveler-${index}`} className="flex items-center gap-2">
                    <label htmlFor={`traveler-${index}`} className="sr-only">
                      Traveler {index + 1} name
                    </label>
                    <input
                      id={`traveler-${index}`}
                      name="travelers"
                      type="text"
                      autoComplete="name"
                      placeholder={`Traveler ${index + 1} name`}
                      pattern=".*\S.*"
                      title="Enter a name with at least one non-space character"
                      required
                      value={traveler}
                      onChange={(event) => {
                        const nextTravelers = trip.travelers.map((name, nameIndex) =>
                          nameIndex === index ? event.target.value : name,
                        );
                        onTripChange("travelers", nextTravelers);
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                    />
                    {trip.travelers.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onTripChange(
                            "travelers",
                            trip.travelers.filter((_, nameIndex) => nameIndex !== index),
                          )
                        }
                        aria-label={`Remove traveler ${index + 1}`}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-red-300 hover:text-red-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onTripChange("travelers", [...trip.travelers, ""])}
                className="mt-3 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950"
              >
                + Add another traveler
              </button>
            </fieldset>
          </div>

          <div>
            <label htmlFor="travelStyle" className="mb-2 block text-sm font-semibold">
              What&apos;s your travel style?
            </label>
            <select
              id="travelStyle"
              name="travelStyle"
              value={trip.travelStyle}
              onChange={(event) => onTripChange("travelStyle", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            >
              <option>Relaxed</option>
              <option>Balanced</option>
              <option>Adventure</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="budget" className="mb-2 block text-sm font-semibold">
            What&apos;s your budget per traveler?
          </label>
          <p className="mb-3 text-sm text-slate-500">
            Your combined trip budget is this amount multiplied by the number of travelers.
          </p>
          <div className="flex gap-3">
            <input
              id="budget"
              name="budget"
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 2500"
              required
              value={trip.budget}
              onChange={(event) => onTripChange("budget", event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            />
            <select
              aria-label="Budget currency"
              name="currency"
              value={trip.currency}
              onChange={(event) => onTripChange("currency", event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            >
              {currencyOptions.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 py-4 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? "Saving..." : submitLabel} <span aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  );
}
