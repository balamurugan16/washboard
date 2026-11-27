import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getErrorCode } from '@/lib/db';
import { addTimeEntries, addTimeEntry, editTimeEntry, listTimeEntries } from '@/lib/time';

const timestamp = z.iso.datetime({ offset: true });
const fields = {
  startAt: timestamp,
  endAt: timestamp,
  activity: z.string().trim().min(1),
  tag: z.string().trim().min(1),
};
const editSchema = z.object(fields).partial().extend({
  id: z.number().int().positive().max(2147483647),
});

function serializeEntry(entry: NonNullable<Awaited<ReturnType<typeof editTimeEntry>>>) {
  return { ...entry, startAt: entry.startAt.toISOString(), endAt: entry.endAt.toISOString() };
}

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
      const cause = error instanceof Error ? error.cause ?? error : error;
      if (getErrorCode(cause) === '23514' &&
        cause instanceof Error && 'constraint' in cause && cause.constraint === 'time_entry_duration_check') {
        return toolError('The end time must come after the start time.');
      }
      console.error('Time entry tool failed.', getErrorCode(error) ?? 'database unavailable');
      return toolError('The time entry operation could not be completed.');
    }
  };
}

export function registerTimeTools(server: McpServer) {
  server.registerTool('add_time_entry', {
    description: 'Log what you did during a time interval. Include a time zone offset in both start and end timestamps. Activity should be descriptive whereas the tag should be unique and trackable across days, eg: Sleep, Coding, Cooking, etc',
    annotations: { destructiveHint: false, idempotentHint: false },
    inputSchema: fields,
  }, withDatabase(async (args) => {
    if (Date.parse(args.startAt) >= Date.parse(args.endAt)) {
      return toolError('The end time must come after the start time.');
    }
    const entry = await addTimeEntry(args);
    return result({ entry: serializeEntry(entry) });
  }));

  server.registerTool('add_time_entries', {
    description: 'Log 1–500 activities in one batch. Give each activity its own start and end timestamps with time zone offsets, a description, and a reusable tag. The batch is saved together.',
    annotations: { destructiveHint: false, idempotentHint: false },
    inputSchema: { entries: z.array(z.object(fields)).min(1).max(500) },
  }, withDatabase(async ({ entries }) => {
    const invalidIndex = entries.findIndex(({ startAt, endAt }) => Date.parse(startAt) >= Date.parse(endAt));
    if (invalidIndex !== -1) {
      return toolError(`Entry ${invalidIndex + 1}: the end time must come after the start time.`);
    }
    const saved = await addTimeEntries(entries);
    return result({ entries: saved.map(serializeEntry) });
  }));

  server.registerTool('list_time_entries', {
    description: 'Retrieve logged time entries, newest start time first.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      limit: z.number().int().min(1).max(500).default(100),
      offset: z.number().int().nonnegative().max(2147483647).default(0),
    },
  }, withDatabase(async ({ limit, offset }) => {
    const entries = await listTimeEntries(limit, offset);
    return result({ entries: entries.map(serializeEntry) });
  }));

  server.registerTool('edit_time_entry', {
    description: 'Update the start time, end time, activity, or tag of a time entry by ID.',
    annotations: { idempotentHint: true },
    inputSchema: editSchema,
  }, withDatabase(async ({ id, ...changes }) => {
    if (Object.values(changes).every((value) => value === undefined)) {
      return toolError('Provide at least one field to update.');
    }

    const entry = await editTimeEntry(id, changes);
    return entry ? result({ entry: serializeEntry(entry) }) : toolError('Time entry not found.');
  }));
}
