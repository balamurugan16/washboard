import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getErrorCode } from '@/lib/db';
import { createHabitPeriod, editFutureHabits, endOfHabitPeriod, listHabitCheckIns, listHabitPeriods, renameHabitPeriod, setHabitCompletion } from '@/lib/habits';

const date = z.iso.date().refine((value) => value >= '0001-01-01');
const id = z.number().int().min(1).max(2147483647);
const habitIndex = z.number().int().min(1).max(10);
const habitName = z.string().trim().min(1);
const habitList = z.array(habitName).min(1).max(10).refine(
  (habits) => new Set(habits.map((habit) => habit.toLowerCase())).size === habits.length,
  'Give each habit a distinct name.',
);

function result(data: Record<string, unknown>): CallToolResult {
  return { structuredContent: data, content: [{ type: 'text', text: JSON.stringify(data) }] };
}

function toolError(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

function withDatabase<Input>(handler: (args: Input) => Promise<CallToolResult>) {
  return async (args: Input) => {
    try {
      return await handler(args);
    } catch (error) {
      console.error('Habit tool failed.', getErrorCode(error) ?? 'database unavailable');
      return toolError('The habit operation could not be completed.');
    }
  };
}

export function registerHabitTools(server: McpServer) {
  server.registerTool('create_habit_period', {
    description: 'Create a named period with 1–10 daily habits. Provide either months or an inclusive end date. Habit positions start at 1.',
    annotations: { destructiveHint: false, idempotentHint: false },
    inputSchema: z.object({
      name: habitName,
      startDate: date,
      endDate: date.optional(),
      months: z.number().int().min(1).max(9999 * 12).optional(),
      habits: habitList,
    }),
  }, withDatabase(async ({ name, startDate, endDate, months, habits }) => {
    if ((endDate === undefined) === (months === undefined)) {
      return toolError('Provide either endDate or months.');
    }
    const lastDay = months === undefined ? endDate : endOfHabitPeriod(startDate, months);
    if (!lastDay || !date.safeParse(lastDay).success || lastDay < startDate) {
      return toolError('The end date must be on or after the start date and within years 0001–9999.');
    }
    return result({ period: await createHabitPeriod({ name, startDate, endDate: lastDay, habits }) });
  }));

  server.registerTool('rename_habit_period', {
    description: 'Rename an existing habit period by ID.',
    annotations: { idempotentHint: true },
    inputSchema: { periodId: id, name: habitName },
  }, withDatabase(async ({ periodId, name }) => {
    const period = await renameHabitPeriod(periodId, name);
    return period ? result({ period }) : toolError('Choose an existing period.');
  }));

  server.registerTool('edit_future_habits', {
    description: 'Replace a future period’s habit list from its first day. For an active period, changes begin tomorrow (UTC) in a continuation with a new period ID. Clear any completed check-ins on affected future dates first.',
    inputSchema: { periodId: id, habits: habitList },
  }, withDatabase(async ({ periodId, habits }) => {
    const edited = await editFutureHabits(periodId, habits);
    return edited.error ? toolError(edited.error) : result(edited);
  }));

  server.registerTool('list_habit_periods', {
    description: 'List habit periods and their habits, ordered by newest start date.',
    annotations: { readOnlyHint: true },
    inputSchema: {},
  }, withDatabase(async () => result({ periods: await listHabitPeriods() })));

  server.registerTool('list_habit_check_ins', {
    description: 'List completed habits for a period within inclusive date bounds. Habit positions start at 1.',
    annotations: { readOnlyHint: true },
    inputSchema: { periodId: id, from: date, to: date },
  }, withDatabase(async ({ periodId, from, to }) => {
    if (from > to) return toolError('The start date must be on or before the end date.');
    return result({ checkIns: await listHabitCheckIns(periodId, from, to) });
  }));

  server.registerTool('set_habit_completion', {
    description: 'Record or clear a daily completion. habitIndex is the 1-based position in the period’s habits.',
    annotations: { idempotentHint: true },
    inputSchema: { periodId: id, date, habitIndex, completed: z.boolean() },
  }, withDatabase(async (checkIn) => {
    if (!await setHabitCompletion(checkIn)) {
      return toolError('Choose an existing period, a date within that period, and one of its habit positions.');
    }
    return result({ checkIn });
  }));
}
