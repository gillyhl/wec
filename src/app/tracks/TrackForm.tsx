// Shared fields for creating/editing a track. Not a client component — form
// actions work fine from server components, and neither create nor edit needs
// any client-side interactivity.
export default function TrackForm({
  action,
  trackId,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  // When editing an existing track, its id is passed through as a hidden field.
  trackId?: string;
  defaultValues?: {
    series: string;
    name: string;
    short_code: string;
    country_code: string;
  };
  submitLabel: string;
}) {
  return (
    <form action={action} className="mt-6 space-y-4">
      {trackId && <input type="hidden" name="track_id" value={trackId} />}

      <fieldset>
        <legend className="block text-sm text-neutral-300">Game</legend>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:border-neutral-500">
            <input
              type="radio"
              name="series"
              value="project_cars_2"
              defaultChecked={
                (defaultValues?.series ?? "project_cars_2") === "project_cars_2"
              }
              className="mt-1"
            />
            <span className="font-medium text-white">Project Cars 2</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:border-neutral-500">
            <input
              type="radio"
              name="series"
              value="iracing"
              defaultChecked={defaultValues?.series === "iracing"}
              className="mt-1"
            />
            <span className="font-medium text-white">iRacing</span>
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="name" className="block text-sm text-neutral-300">
          Track name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="Autodromo Enzo e Dino Ferrari"
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-neutral-400"
        />
      </div>

      <div>
        <label htmlFor="short_code" className="block text-sm text-neutral-300">
          Short code
        </label>
        <input
          id="short_code"
          name="short_code"
          required
          maxLength={10}
          defaultValue={defaultValues?.short_code}
          placeholder="IMO"
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 uppercase text-white outline-none focus:border-neutral-400"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Must be unique within the chosen game.
        </p>
      </div>

      <div>
        <label htmlFor="country_code" className="block text-sm text-neutral-300">
          Country code
        </label>
        <input
          id="country_code"
          name="country_code"
          required
          maxLength={10}
          defaultValue={defaultValues?.country_code}
          placeholder="IT"
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 uppercase text-white outline-none focus:border-neutral-400"
        />
        <p className="mt-1 text-xs text-neutral-500">
          ISO country code (e.g. IT, GB) or GB subdivision (e.g. GB-ENG), used
          to show the track&apos;s flag.
        </p>
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-neutral-200"
      >
        {submitLabel}
      </button>
    </form>
  );
}
