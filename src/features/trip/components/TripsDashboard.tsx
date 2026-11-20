import { formatDate } from "@/features/trip/utils";

type TripListItem = {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  is_ended: boolean;
};

type TripsDashboardProps = {
  trips: TripListItem[];
  onSelectTrip: (id: string) => void;
  onCreateTrip: () => void;
  onBack: () => void;
};

export function TripsDashboard({
  trips,
  onSelectTrip,
  onCreateTrip,
  onBack,
}: TripsDashboardProps) {
  const activeTrips = trips.filter((trip) => !trip.is_ended);
  const previousTrips = trips.filter((trip) => trip.is_ended);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-6 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Your trip dashboard
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Your trips
          </h1>
          <p className="mt-3 text-slate-600">
            Pick up an active trip or revisit a previous one.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-700 hover:text-emerald-800"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onCreateTrip}
            className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            New trip
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-10">
        <TripGroup
          title="Active trips"
          emptyMessage="No trip is currently in progress."
          trips={activeTrips}
          onSelectTrip={onSelectTrip}
        />
        <TripGroup
          title="Previous trips"
          emptyMessage="Your completed trips will appear here."
          trips={previousTrips}
          onSelectTrip={onSelectTrip}
        />
      </div>
    </section>
  );
}

type TripGroupProps = {
  title: string;
  emptyMessage: string;
  trips: TripListItem[];
  onSelectTrip: (id: string) => void;
};

function TripGroup({
  title,
  emptyMessage,
  trips,
  onSelectTrip,
}: TripGroupProps) {
  return (
    <section aria-label={title}>
      <h2 className="text-xl font-semibold">{title}</h2>
      {trips.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <button
                type="button"
                onClick={() => onSelectTrip(trip.id)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold text-slate-900">
                    {trip.destination}
                  </span>
                  <span
                    className={
                      trip.is_ended
                        ? "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                        : "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
                    }
                  >
                    {trip.is_ended ? "Previous" : "In progress"}
                  </span>
                </span>
                <span className="mt-3 block text-sm text-slate-600">
                  {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                </span>
                <span className="mt-4 block text-sm font-semibold text-emerald-800">
                  Open trip <span aria-hidden="true">→</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
