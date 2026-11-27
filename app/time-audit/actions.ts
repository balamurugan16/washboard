'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getErrorCode } from '@/lib/db';
import { editTimeEntry } from '@/lib/time';

type EditState = { error?: string; saved?: boolean };

export async function saveTimeEntry(id: number, _: EditState, form: FormData): Promise<EditState> {
  const localTime = z.iso.datetime({ local: true }).refine((value) => !value.endsWith('Z'));
  const input = z.object({
    startAt: localTime,
    endAt: localTime,
    activity: z.string().trim().min(1),
    tag: z.string().trim().min(1),
  }).safeParse(Object.fromEntries(form));

  if (!Number.isInteger(id) || id < 1 || id > 2147483647 || !input.success) {
    return { error: 'Enter a start time, end time, activity, and tag.' };
  }

  const { startAt, endAt, activity, tag } = input.data;
  const start = startAt + '+05:30';
  const end = endAt + '+05:30';
  if (Date.parse(start) >= Date.parse(end)) {
    return { error: 'The end time must come after the start time.' };
  }

  try {
    if (!await editTimeEntry(id, { startAt: start, endAt: end, activity, tag })) {
      return { error: 'Time entry not found.' };
    }
  } catch (error) {
    console.error('Could not edit time entry.', getErrorCode(error) ?? 'database unavailable');
    return { error: 'The time entry could not be saved.' };
  }

  revalidatePath('/time-audit');
  revalidatePath('/');
  return { saved: true };
}
