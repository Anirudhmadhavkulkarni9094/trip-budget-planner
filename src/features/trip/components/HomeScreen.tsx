type HomeScreenProps = {
  onCreateTrip: () => void;
  onOpenTrips: () => void;
};

export function HomeScreen({ onCreateTrip, onOpenTrips }: HomeScreenProps) {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-12 px-6 pb-16 sm:px-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="max-w-xl">
        <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
          Your next great story starts here
        </p>
        <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          Make room
          <br />
          for <span className="text-emerald-700">wonder.</span>
        </h1>
        <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">
          Plan a trip that feels like you. Set your destination, dates, and
          budget, then bring all the details together in one place.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCreateTrip}
            className="inline-flex items-center gap-3 rounded-full bg-emerald-700 px-7 py-4 font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-800"
          >
            Create a trip <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            onClick={onOpenTrips}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-4 font-semibold text-slate-800 transition hover:border-emerald-700 hover:text-emerald-800"
          >
            View trip dashboard
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          A little planning goes a long way.
        </p>
      </div>
      <div className="relative mx-auto flex aspect-[4/3] w-full max-w-lg items-end overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-100 via-teal-100 to-amber-100 p-8 sm:p-10">
        <div className="absolute -right-10 -top-14 size-64 rounded-full border-[32px] border-white/40" />
        <div className="absolute right-16 top-12 size-28 rounded-full bg-amber-300/70 blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-2/5 rounded-t-[50%] bg-emerald-800/90" />
        <div className="absolute bottom-0 left-1/4 right-0 h-1/3 rounded-t-[50%] bg-emerald-700/80" />
        <div className="relative z-10 rounded-2xl bg-white/95 p-5 shadow-xl shadow-emerald-950/10 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Good things are ahead
          </p>
          <p className="mt-2 text-xl font-semibold">Somewhere new.</p>
        </div>
      </div>
    </section>
  );
}
