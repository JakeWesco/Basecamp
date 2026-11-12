// React resets a form after its action runs. When the action comes back with
// an error, nobody should have to type everything again: keep what was sent
// and feed it back as the fields' default values.

export type Kept = Record<string, string>;

/** Text values from a submitted form (files are ignored). */
export function keepValues(form: FormData): Kept {
  const kept: Kept = {};
  for (const [name, value] of form.entries()) {
    if (typeof value === "string") kept[name] = value;
  }
  return kept;
}
