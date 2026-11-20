"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { AuthScreen } from "@/features/trip/components/AuthScreen";
import { DashboardStep } from "@/features/trip/components/DashboardStep";
import { HomeScreen } from "@/features/trip/components/HomeScreen";
import { TripFormStep } from "@/features/trip/components/TripFormStep";
import { TripsDashboard } from "@/features/trip/components/TripsDashboard";
import {
  MAX_RECEIPT_SIZE_BYTES,
  createEmptyExpenseForm,
  initialTrip,
} from "@/features/trip/constants";
import type {
  Expense,
  ExpenseFormState,
  SettlementStatus,
  SplitType,
  TripDetails,
  TripStep,
} from "@/features/trip/types";
import {
  buildCustomSharePreview,
  containsDuplicateTravelers,
  getSettlementKey,
  getTravelersForSubmission,
  getTripSummary,
  splitAmountEqually,
  type Settlement,
} from "@/features/trip/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type TripListItem = Pick<
  TripRow,
  | "id"
  | "destination"
  | "start_date"
  | "end_date"
  | "currency"
  | "is_ended"
  | "created_at"
>;

type LoadedTrip = {
  tripId: string;
  trip: TripDetails;
  expenses: Expense[];
  isTripEnded: boolean;
  settlementStatuses: Record<string, SettlementStatus>;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getCustomShares(value: Json): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("An expense has invalid saved split amounts.");
  }

  const shares: Record<string, number> = {};
  for (const [traveler, share] of Object.entries(value)) {
    if (typeof share !== "number") {
      throw new Error("An expense has invalid saved split amounts.");
    }
    shares[traveler] = share;
  }

  return shares;
}

async function uploadReceipt(
  supabase: SupabaseClient<Database>,
  ownerId: string,
  tripId: string,
  expense: Expense,
): Promise<string | null> {
  if (!expense.receipt) {
    return null;
  }

  const response = await fetch(expense.receipt.dataUrl);
  if (!response.ok) {
    throw new Error("The receipt image could not be prepared for upload.");
  }

  const image = await response.blob();
  const path = `${ownerId}/${tripId}/${expense.id}`;
  const { error } = await supabase.storage
    .from("trip-receipts")
    .upload(path, image, {
      contentType: image.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return path;
}

function mapTrip(row: TripRow): TripDetails {
  return {
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    travelers: row.travelers,
    budget: String(row.budget),
    currency: row.currency,
    travelStyle: row.travel_style,
  };
}

async function loadTripDetails(
  supabase: SupabaseClient<Database>,
  ownerId: string,
  tripId: string,
): Promise<LoadedTrip> {
  const { data: tripRow, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (tripError) {
    throw tripError;
  }
  if (!tripRow) {
    throw new Error("Could not find that trip.");
  }

  const { data: expenseRows, error: expensesError } = await supabase
    .from("expenses")
    .select("*")
    .eq("trip_id", tripRow.id)
    .eq("owner_id", ownerId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (expensesError) {
    throw expensesError;
  }

  let settlementStatuses: Record<string, SettlementStatus> = {};
  if (tripRow.is_ended) {
    const { data: settlementRows, error: settlementsError } = await supabase
      .from("settlement_payments")
      .select("payer, payee, status")
      .eq("trip_id", tripRow.id)
      .eq("owner_id", ownerId);

    if (settlementsError) {
      throw settlementsError;
    }

    settlementStatuses = Object.fromEntries(
      settlementRows.map((row) => [
        getSettlementKey(row.payer, row.payee),
        row.status,
      ]),
    );
  }

  const expenses = await Promise.all(
    expenseRows.map(async (row: ExpenseRow): Promise<Expense> => {
      let receipt: Expense["receipt"];
      if (row.receipt_path || row.receipt_name) {
        if (!row.receipt_path || !row.receipt_name) {
          throw new Error("An expense has incomplete receipt information.");
        }

        const { data, error } = await supabase.storage
          .from("trip-receipts")
          .createSignedUrl(row.receipt_path, 60 * 60);
        if (error) {
          throw error;
        }
        receipt = {
          name: row.receipt_name,
          dataUrl: data.signedUrl,
          storagePath: row.receipt_path,
        };
      }

      return {
        id: row.id,
        description: row.description,
        place: row.place,
        category: row.category,
        amount: Number(row.amount),
        date: row.date,
        paidBy: row.paid_by,
        splitType: row.split_type,
        splitAmong: row.split_among,
        customShares: getCustomShares(row.custom_shares),
        ...(receipt ? { receipt } : {}),
      };
    }),
  );

  return {
    tripId: tripRow.id,
    trip: mapTrip(tripRow),
    expenses,
    isTripEnded: tripRow.is_ended,
    settlementStatuses,
  };
}

export default function TripPlanner() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [step, setStep] = useState<TripStep>("home");
  const [tripId, setTripId] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripDetails>(initialTrip);
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(() =>
    createEmptyExpenseForm(initialTrip.startDate),
  );
  const [expenseError, setExpenseError] = useState("");
  const [appError, setAppError] = useState("");
  const [isTripEnded, setIsTripEnded] = useState(false);
  const [settlementStatuses, setSettlementStatuses] = useState<
    Record<string, SettlementStatus>
  >({});

  const expensesByDate = useMemo(
    () =>
      expenses.reduce<Record<string, Expense[]>>((groups, expense) => {
        groups[expense.date] ??= [];
        groups[expense.date].push(expense);
        return groups;
      }, {}),
    [expenses],
  );

  const { budget, totalSpent, remainingBudget } = getTripSummary(trip, expenses);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        if (!nextSession) {
          setTripId(null);
          setTrip(initialTrip);
          setTrips([]);
          setExpenses([]);
          setExpenseForm(createEmptyExpenseForm(initialTrip.startDate));
          setIsTripEnded(false);
          setSettlementStatuses({});
          setStep("home");
          setIsDataLoading(false);
        }
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }

      if (error) {
        setAppError(error.message);
      } else {
        setSession(data.session);
      }
      setIsAuthLoading(false);
    }).catch((error: unknown) => {
      if (active) {
        setAppError(getErrorMessage(error, "Could not load your account."));
        setIsAuthLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const userId = session?.user.id;

  useEffect(() => {
    if (!supabase || userId === undefined) {
      return;
    }

    let active = true;
    const client = supabase;
    const ownerId: string = userId;

    async function loadTrips() {
      setIsDataLoading(true);
      setAppError("");

      try {
        const { data: savedTrips, error: tripsError } = await client
          .from("trips")
          .select(
            "id, destination, start_date, end_date, currency, is_ended, created_at",
          )
          .eq("owner_id", ownerId)
          .order("created_at", { ascending: false });

        if (tripsError) {
          throw tripsError;
        }

        if (!active) {
          return;
        }

        const tripList = savedTrips ?? [];
        setTrips(tripList);
        const inProgressTrip = tripList.find((savedTrip) => !savedTrip.is_ended);

        if (!inProgressTrip) {
          setTripId(null);
          setTrip(initialTrip);
          setExpenses([]);
          setExpenseForm(createEmptyExpenseForm(initialTrip.startDate));
          setIsTripEnded(false);
          setSettlementStatuses({});
          setStep("home");
          return;
        }

        const loadedTrip = await loadTripDetails(
          client,
          ownerId,
          inProgressTrip.id,
        );

        if (active) {
          setTripId(loadedTrip.tripId);
          setTrip(loadedTrip.trip);
          setExpenses(loadedTrip.expenses);
          setSettlementStatuses(loadedTrip.settlementStatuses);
          setExpenseForm(createEmptyExpenseForm(loadedTrip.trip.startDate));
          setIsTripEnded(loadedTrip.isTripEnded);
          setStep("dashboard");
        }
      } catch (error) {
        if (active) {
          setAppError(getErrorMessage(error, "Could not load your saved trip."));
        }
      } finally {
        if (active) {
          setIsDataLoading(false);
        }
      }
    }

    void loadTrips();
    return () => {
      active = false;
    };
  }, [supabase, userId]);

  function updateTripField<K extends keyof TripDetails>(
    field: K,
    value: TripDetails[K],
  ): void {
    setTrip((currentTrip) => ({ ...currentTrip, [field]: value }));
  }

  function updateExpenseFormField(
    field: keyof ExpenseFormState,
    value: ExpenseFormState[keyof ExpenseFormState],
  ): void {
    setExpenseForm((currentExpenseForm) => ({
      ...currentExpenseForm,
      [field]: value,
    }));
  }

  async function handleTripSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !session || isSaving) {
      return;
    }

    const travelers = getTravelersForSubmission(trip.travelers);

    if (travelers.some((traveler) => traveler.length === 0)) {
      window.alert("Enter a name for every traveler or remove the empty row.");
      return;
    }

    if (containsDuplicateTravelers(travelers)) {
      window.alert("Each traveler must have a unique name.");
      return;
    }

    setIsSaving(true);
    setAppError("");
    try {
      const savedTrip = { ...trip, travelers };
      const tripValues = {
        destination: savedTrip.destination,
        start_date: savedTrip.startDate,
        end_date: savedTrip.endDate,
        travelers: savedTrip.travelers,
        budget: Number(savedTrip.budget),
        currency: savedTrip.currency,
        travel_style: savedTrip.travelStyle,
      };

      const result = tripId
        ? await supabase
            .from("trips")
            .update(tripValues)
            .eq("id", tripId)
            .eq("owner_id", session.user.id)
            .select("id, created_at")
            .single()
        : await supabase
            .from("trips")
            .insert({ ...tripValues, owner_id: session.user.id })
            .select("id, created_at")
            .single();

      if (result.error) {
        throw result.error;
      }

      setTrip(savedTrip);
      setTripId(result.data.id);
      setTrips((currentTrips) => {
        const existingTrip = currentTrips.find(
          (savedTripItem) => savedTripItem.id === result.data.id,
        );
        const updatedTrip: TripListItem = {
          id: result.data.id,
          destination: savedTrip.destination,
          start_date: savedTrip.startDate,
          end_date: savedTrip.endDate,
          currency: savedTrip.currency,
          is_ended: false,
          created_at: existingTrip?.created_at ?? result.data.created_at,
        };
        return currentTrips
          .filter((savedTripItem) => savedTripItem.id !== result.data.id)
          .concat(updatedTrip)
          .sort((first, second) =>
            second.created_at.localeCompare(first.created_at),
          );
      });
      setExpenseForm((currentExpenseForm) => ({
        ...currentExpenseForm,
        date: savedTrip.startDate,
        splitAmong: travelers,
        customShares: {},
        splitType: "equal",
        payer: "me",
      }));
      setStep("dashboard");
    } catch (error) {
      setAppError(getErrorMessage(error, "Could not save your trip."));
    } finally {
      setIsSaving(false);
    }
  }

  function handleReceiptChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || isSaving) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setExpenseError("Choose an image file for the receipt.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      setExpenseError("Receipt images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setExpenseError("The receipt image could not be read. Please try again.");
        return;
      }

      setExpenseForm((currentExpenseForm) => ({
        ...currentExpenseForm,
        receipt: { name: file.name, dataUrl: reader.result as string },
      }));
      setExpenseError("");
    };
    reader.onerror = () => {
      setExpenseError("The receipt image could not be read. Please try again.");
    };
    reader.onabort = () => {
      setExpenseError("Receipt reading was cancelled. Please try again.");
    };
    reader.readAsDataURL(file);
  }

  async function handleEndTrip() {
    if (!supabase || !session || !tripId || isTripEnded || isSaving) {
      return;
    }

    const shouldEndTrip = window.confirm(
      "End this trip permanently? This action is irreversible and will lock trip editing and expense changes.",
    );

    if (!shouldEndTrip) {
      return;
    }

    setIsSaving(true);
    setAppError("");
    try {
      const { error } = await supabase
        .from("trips")
        .update({ is_ended: true })
        .eq("id", tripId)
        .eq("owner_id", session.user.id)
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      setIsTripEnded(true);
      setTrips((currentTrips) =>
        currentTrips.map((savedTrip) =>
          savedTrip.id === tripId ? { ...savedTrip, is_ended: true } : savedTrip,
        ),
      );
      setSettlementStatuses({});
      setExpenseError("");
    } catch (error) {
      setAppError(getErrorMessage(error, "Could not end this trip."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSettlementStatusChange(settlement: Settlement) {
    if (!supabase || !session || !tripId || !isTripEnded || isSaving) {
      return;
    }

    const key = getSettlementKey(settlement.from, settlement.to);
    const nextStatus: SettlementStatus =
      settlementStatuses[key] === "paid" ? "pending" : "paid";

    setIsSaving(true);
    setAppError("");
    try {
      const { error } = await supabase
        .from("settlement_payments")
        .upsert(
          {
            owner_id: session.user.id,
            trip_id: tripId,
            payer: settlement.from,
            payee: settlement.to,
            amount_cents: settlement.amountInCents,
            status: nextStatus,
          },
          { onConflict: "trip_id,payer,payee" },
        );

      if (error) {
        throw error;
      }

      setSettlementStatuses((currentStatuses) => ({
        ...currentStatuses,
        [key]: nextStatus,
      }));
    } catch (error) {
      setAppError(
        getErrorMessage(error, "Could not update this settlement status."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !session || !tripId || isTripEnded || isSaving) {
      return;
    }

    const amount = Number(expenseForm.amount);
    const amountInCents = Math.round(amount * 100);

    if (!Number.isFinite(amount) || !Number.isFinite(amountInCents) || amountInCents <= 0) {
      setExpenseError("Enter an expense amount greater than zero.");
      return;
    }

    const payer = expenseForm.payer === "me" ? "Me" : expenseForm.payer;
    if (!trip.travelers.includes(payer)) {
      setExpenseError("Choose who paid for this expense.");
      return;
    }

    if (expenseForm.splitAmong.length === 0) {
      setExpenseError("Choose at least one person to split this expense with.");
      return;
    }

    let shares: Record<string, number>;
    if (expenseForm.splitType === "custom") {
      const customShareCents = expenseForm.splitAmong.map((traveler) => {
        const shareValue = Number(expenseForm.customShares[traveler]);
        return Number.isFinite(shareValue) && shareValue >= 0
          ? Math.round(shareValue * 100)
          : Number.NaN;
      });

      if (
        customShareCents.some((share) => !Number.isFinite(share)) ||
        customShareCents.reduce((total, share) => total + share, 0) !== amountInCents
      ) {
        setExpenseError("Custom split amounts must add up to the expense total.");
        return;
      }

      shares = Object.fromEntries(
        expenseForm.splitAmong.map((traveler, index) => [
          traveler,
          customShareCents[index] / 100,
        ]),
      );
    } else {
      shares = splitAmountEqually(amountInCents, expenseForm.splitAmong);
    }

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      description: expenseForm.description.trim(),
      place: expenseForm.place.trim(),
      category: expenseForm.category,
      amount,
      date: expenseForm.date || trip.startDate,
      paidBy: payer,
      splitType: expenseForm.splitType,
      splitAmong: [...expenseForm.splitAmong],
      customShares: shares,
      ...(expenseForm.receipt ? { receipt: expenseForm.receipt } : {}),
    };

    setIsSaving(true);
    setExpenseError("");
    try {
      const receiptPath = await uploadReceipt(
        supabase,
        session.user.id,
        tripId,
        newExpense,
      );
      const { error } = await supabase.from("expenses").insert({
        id: newExpense.id,
        owner_id: session.user.id,
        trip_id: tripId,
        description: newExpense.description,
        place: newExpense.place,
        category: newExpense.category,
        amount: newExpense.amount,
        date: newExpense.date,
        paid_by: newExpense.paidBy,
        split_type: newExpense.splitType,
        split_among: newExpense.splitAmong,
        custom_shares: newExpense.customShares,
        receipt_name: newExpense.receipt?.name ?? null,
        receipt_path: receiptPath,
      });

      if (error) {
        if (receiptPath) {
          const { error: cleanupError } = await supabase.storage
            .from("trip-receipts")
            .remove([receiptPath]);
          if (cleanupError) {
            throw new Error(
              `${error.message} Receipt cleanup failed: ${cleanupError.message}`,
            );
          }
        }
        throw error;
      }

      setExpenses((currentExpenses) => [
        {
          ...newExpense,
          ...(newExpense.receipt && receiptPath
            ? {
                receipt: {
                  ...newExpense.receipt,
                  storagePath: receiptPath,
                },
              }
            : {}),
        },
        ...currentExpenses,
      ]);
      setExpenseForm({
        ...createEmptyExpenseForm(trip.startDate),
        splitAmong: trip.travelers,
        date: trip.startDate,
      });
    } catch (error) {
      setExpenseError(getErrorMessage(error, "Could not save this expense."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExpenseDelete(id: string) {
    if (!supabase || !session || !tripId || isTripEnded || isSaving) {
      return;
    }

    const expense = expenses.find((item) => item.id === id);
    if (!expense) {
      setAppError("Could not find the expense to delete.");
      return;
    }

    setIsSaving(true);
    setAppError("");
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("trip_id", tripId)
        .eq("owner_id", session.user.id)
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      setExpenses((currentExpenses) =>
        currentExpenses.filter((item) => item.id !== id),
      );

      if (expense.receipt?.storagePath) {
        const { error: receiptError } = await supabase.storage
          .from("trip-receipts")
          .remove([expense.receipt.storagePath]);
        if (receiptError) {
          setAppError(
            `Expense deleted, but its receipt could not be removed: ${receiptError.message}`,
          );
        }
      }
    } catch (error) {
      setAppError(getErrorMessage(error, "Could not delete this expense."));
    } finally {
      setIsSaving(false);
    }
  }

  function handleSplitTypeChange(nextSplitType: SplitType) {
    setExpenseForm((currentExpenseForm) => {
      if (nextSplitType !== "custom" || currentExpenseForm.splitAmong.length === 0) {
        return {
          ...currentExpenseForm,
          splitType: nextSplitType,
          customShares:
            nextSplitType === "custom"
              ? buildCustomSharePreview(
                  currentExpenseForm.amount,
                  currentExpenseForm.splitAmong,
                  currentExpenseForm.customShares,
                )
              : {},
        };
      }

      return {
        ...currentExpenseForm,
        splitType: nextSplitType,
        customShares: buildCustomSharePreview(
          currentExpenseForm.amount,
          currentExpenseForm.splitAmong,
          currentExpenseForm.customShares,
        ),
      };
    });
  }

  function handleCreateTrip() {
    setTripId(null);
    setTrip(initialTrip);
    setExpenses([]);
    setExpenseForm(createEmptyExpenseForm(initialTrip.startDate));
    setIsTripEnded(false);
    setSettlementStatuses({});
    setExpenseError("");
    setStep("form");
  }

  async function handleOpenTrip(id: string) {
    if (!supabase || !session) {
      return;
    }

    setIsDataLoading(true);
    setAppError("");
    try {
      const loadedTrip = await loadTripDetails(supabase, session.user.id, id);
      setTripId(loadedTrip.tripId);
      setTrip(loadedTrip.trip);
      setExpenses(loadedTrip.expenses);
      setSettlementStatuses(loadedTrip.settlementStatuses);
      setExpenseForm(createEmptyExpenseForm(loadedTrip.trip.startDate));
      setIsTripEnded(loadedTrip.isTripEnded);
      setExpenseError("");
      setStep("dashboard");
    } catch (error) {
      setAppError(getErrorMessage(error, "Could not load this trip."));
    } finally {
      setIsDataLoading(false);
    }
  }

  async function handleSignOut() {
    if (!supabase || isSaving) {
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      setAppError(getErrorMessage(error, "Could not sign out."));
    }
  }

  if (!supabase) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f6] px-6">
        <section className="max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Supabase is not configured</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Copy <code>.env.example</code> to <code>.env.local</code>, set the
            project URL and publishable key, then restart the development server.
          </p>
        </section>
      </main>
    );
  }

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f6] text-slate-600">
        Loading your account...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <button
          type="button"
          onClick={() => setStep("home")}
          className="flex items-center gap-3 text-left"
          aria-label="Go to home"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-lg text-white">
            ↗
          </span>
          <span className="text-lg font-bold tracking-tight">roamwise</span>
        </button>
        {session && (
          <>
          <div className="hidden items-center gap-3 md:flex">
            {step === "dashboard" && (
              <button
                type="button"
                onClick={() => setStep("trips")}
                disabled={isSaving}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-wait disabled:opacity-60"
              >
                My trips
              </button>
            )}
            {step === "dashboard" && (
              <button
                type="button"
                onClick={handleCreateTrip}
                disabled={isSaving}
                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
              >
                New trip
              </button>
            )}
            <span className="hidden text-sm text-slate-600 sm:inline">
              {session.user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSaving}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-wait disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
          <div className="relative md:hidden">
            {isMobileMenuOpen && (
              <div className="menu-actions absolute right-0 top-12 z-[60] w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_14px_40px_rgba(15,23,42,0.18)] [animation:menu-enter_180ms_ease-out]">
                {step === "dashboard" && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep("trips");
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isSaving}
                    className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    My trips
                  </button>
                )}
                {step === "dashboard" && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCreateTrip();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isSaving}
                    className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    New trip
                  </button>
                )}
                <div className="mx-2 my-1 border-t border-slate-100" />
                <p className="px-4 py-2 text-xs text-slate-500">{session.user.email}</p>
                <button
                  type="button"
                  onClick={() => {
                    void handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isSaving}
                  className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            )}
            <button
              type="button"
              aria-label={isMobileMenuOpen ? "Close account menu" : "Open account menu"}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 active:scale-90"
            >
              <span className="relative block h-4 w-5" aria-hidden="true">
                <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-slate-700 transition ${isMobileMenuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
                <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-slate-700 transition ${isMobileMenuOpen ? "opacity-0" : ""}`} />
                <span className={`absolute left-0 bottom-0 h-0.5 w-5 rounded-full bg-slate-700 transition ${isMobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
          </>
        )}
      </header>

      {appError && (
        <p
          role="alert"
          className="mx-auto mb-4 max-w-6xl px-6 text-sm font-medium text-red-600 sm:px-10"
        >
          {appError}
        </p>
      )}

      {isDataLoading ? (
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center text-slate-600">
          Loading your trips...
        </div>
      ) : !session ? (
        <AuthScreen supabase={supabase} />
      ) : (
        <>
          {step === "home" && (
            <HomeScreen
              onCreateTrip={handleCreateTrip}
              onOpenTrips={() => setStep("trips")}
            />
          )}
          {step === "trips" && (
            <TripsDashboard
              trips={trips}
              onSelectTrip={(id) => void handleOpenTrip(id)}
              onCreateTrip={handleCreateTrip}
              onBack={() => setStep(tripId ? "dashboard" : "home")}
            />
          )}
          {step === "form" && (
            <TripFormStep
              trip={trip}
              isSaving={isSaving}
              submitLabel={tripId ? "Save trip changes" : "Create trip"}
              onBack={() => setStep("home")}
              onSubmit={handleTripSubmit}
              onTripChange={(field, value) => {
                if (field === "travelers") {
                  updateTripField(field, value as string[]);
                  return;
                }
                updateTripField(field, value as string);
              }}
            />
          )}
          {step === "dashboard" && (
            <DashboardStep
              trip={trip}
              expenses={expenses}
              expensesByDate={expensesByDate}
              expenseForm={expenseForm}
              expenseError={expenseError}
              totalSpent={totalSpent}
              remainingBudget={remainingBudget}
              budget={budget}
              isTripEnded={isTripEnded}
              isSaving={isSaving}
              settlementStatuses={settlementStatuses}
              onEditTrip={() => {
                if (!isTripEnded && !isSaving) {
                  setStep("form");
                }
              }}
              onEndTrip={handleEndTrip}
              onSettlementStatusChange={handleSettlementStatusChange}
              onExpenseDelete={handleExpenseDelete}
              onReceiptChange={handleReceiptChange}
              onRemoveReceipt={() => {
                if (!isTripEnded && !isSaving) {
                  setExpenseForm((currentExpenseForm) => ({
                    ...currentExpenseForm,
                    receipt: undefined,
                  }));
                }
              }}
              onSubmitExpense={handleExpenseSubmit}
              onExpenseFieldChange={(field, value) => {
                if (isTripEnded || isSaving) {
                  return;
                }

                if (field === "splitType") {
                  handleSplitTypeChange(value as SplitType);
                  return;
                }

                if (field === "splitAmong") {
                  setExpenseForm((currentExpenseForm) => {
                    const nextSplitAmong = value as string[];
                    const nextCustomShares =
                      currentExpenseForm.splitType === "custom"
                        ? buildCustomSharePreview(
                            currentExpenseForm.amount,
                            nextSplitAmong,
                            currentExpenseForm.customShares,
                          )
                        : {};

                    return {
                      ...currentExpenseForm,
                      splitAmong: nextSplitAmong,
                      customShares: nextCustomShares,
                    };
                  });
                  return;
                }

                if (field === "customShares") {
                  setExpenseForm((currentExpenseForm) => ({
                    ...currentExpenseForm,
                    customShares: value as Record<string, string>,
                  }));
                  return;
                }

                updateExpenseFormField(field, value);
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
