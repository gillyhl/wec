// Shared fields for creating/editing a car. Not a client component — form
// actions work fine from server components, and neither create nor edit needs
// any client-side interactivity.
export default function CarForm({
  action,
  carId,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  // When editing an existing car, its id is passed through as a hidden field.
  carId?: string;
  defaultValues?: {
    series: string;
    name: string;
  };
  submitLabel: string;
}) {
  return (
    <form action={action} className="mt-6 space-y-4">
      {carId && <input type="hidden" name="car_id" value={carId} />}

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
          Car name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="Porsche 911 RSR"
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-neutral-400"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Must be unique within the chosen game.
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
