'use client';

import { useActionState, useState } from 'react';
import { saveTimeEntry } from './actions';

export default function EditEntry({ id, startAt, endAt, activity, tag }: {
  id: number; startAt: string; endAt: string; activity: string; tag: string;
}) {
  const [state, submit, pending] = useActionState(saveTimeEntry.bind(null, id), {});
  const [fields, setFields] = useState({ startAt, endAt, activity, tag });

  return (
    <details className="audit-edit">
      <summary aria-label={`Edit ${activity}`}>Edit</summary>
      <form action={submit}>
        <fieldset disabled={pending}>
          <label>Start <input name="startAt" type="datetime-local" step="0.001" value={fields.startAt}
            onChange={(event) => setFields({ ...fields, startAt: event.target.value })} required /></label>
          <label>End <input name="endAt" type="datetime-local" step="0.001" value={fields.endAt}
            onChange={(event) => setFields({ ...fields, endAt: event.target.value })} required /></label>
          <label>Activity <input name="activity" value={fields.activity}
            onChange={(event) => setFields({ ...fields, activity: event.target.value })} required /></label>
          <label>Tag <input name="tag" value={fields.tag}
            onChange={(event) => setFields({ ...fields, tag: event.target.value })} required /></label>
        </fieldset>
        <button type="submit" disabled={pending}>Save</button>
        {state.error && <p role="alert">{state.error}</p>}
        {state.saved && <p role="status">Saved.</p>}
      </form>
    </details>
  );
}
