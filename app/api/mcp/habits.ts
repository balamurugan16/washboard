import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getErrorCode } from '@/lib/db';
import { createHabitPeriod, endOfHabitPeriod, listHabitCheckIns, listHabitPeriods, setHabitCompletion } from '@/lib/habits';

const date = z.iso.date().refine((value) => value >= '0001-01-01');
const id = z.number().int().min(1).max(2147483647);
const habitIndex = z.number().int().min(1).max(10);

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
      name: z.string().trim().min(1),
      startDate: date,
      endDate: date.optional(),
      months: z.number().int().min(1).max(9999 * 12).optional(),
      habits: z.array(z.string().trim().min(1)).min(1).max(10),
    }),
  }, withDatabase(async ({ name, startDate, endDate, months, habits }) => {
    if ((endDate === undefined) === (months === undefined)) {
      return toolError('Provide either endDate or months.');
    }
    const lastDay = months === undefined ? endDate : endOfHabitPeriod(startDate, months);
    if (!lastDay || !date.safeParse(lastDay).success || lastDay < startDate) {
      return toolError('The end date must be on or after the start date and within years 0001–9999.');
    }
    if (new Set(habits.map((habit) => habit.toLowerCase())).size !== habits.length) {
      return toolError('Give each habit a distinct name.');
    }
    return result({ period: await createHabitPeriod({ name, startDate, endDate: lastDay, habits }) });
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
