import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getErrorCode } from '@/lib/db';
import { addWeight, addWeights, editWeight, listWeights } from '@/lib/weight';

const timestamp = z.iso.datetime({ offset: true });
const fields = {
  weight: z.number().positive().max(9999).multipleOf(0.001),
  units: z.enum(['kg', 'lb']).optional(),
  recordedAt: timestamp.optional(),
};

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
      console.error('Weight tool failed.', getErrorCode(error) ?? 'database unavailable');
      return toolError('The weight operation could not be completed.');
    }
  };
}

export function registerWeightTools(server: McpServer) {
  server.registerTool('list_weight', {
    description: 'Retrieve weight entries, newest first. Date bounds are inclusive.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      from: timestamp.optional(),
      to: timestamp.optional(),
      limit: z.number().int().min(1).max(500).default(100),
      offset: z.number().int().nonnegative().max(2147483647).default(0),
    },
  }, withDatabase(async (args) => {
    if (args.from && args.to && Date.parse(args.from) > Date.parse(args.to)) {
      return toolError('The start date must come before the end date.');
    }

    return result({ entries: await listWeights(args) });
  }));

  server.registerTool('add_weight', {
    description: 'Add a weight measurement. Units default to kg and time defaults to now.',
    annotations: { destructiveHint: false },
    inputSchema: fields,
  }, withDatabase(async (args) => result({ entry: await addWeight(args) })));

  server.registerTool('add_weights', {
    description: 'Add 1–500 weight measurements in one batch. Each entry defaults to kg and the current time.',
    annotations: { destructiveHint: false, idempotentHint: false },
    inputSchema: {
      entries: z.array(z.object(fields)).min(1).max(500),
    },
  }, withDatabase(async ({ entries }) => result({ entries: await addWeights(entries) })));

  server.registerTool('edit_weight', {
    description: 'Update fields of an existing entry by its ID. Supply the new weight when changing units.',
    annotations: { idempotentHint: true },
    inputSchema: {
      ...fields,
      id: z.number().int().positive().max(2147483647),
      weight: fields.weight.optional(),
    },
  }, withDatabase(async (args) => {
    if (args.weight === undefined && args.units === undefined && args.recordedAt === undefined) {
      return toolError('Provide at least one field to update.');
    }
    if (args.units !== undefined && args.weight === undefined) {
      return toolError('Provide the new weight when changing units.');
    }

    const entry = await editWeight(args);
    return entry ? result({ entry }) : toolError('Weight entry not found.');
  }));
}
