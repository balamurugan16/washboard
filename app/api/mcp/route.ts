import { timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerWeightTools } from './weight';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return new Response('Origin not allowed.', { status: 403 });
  }

  const token = process.env.MCP_TOKEN;
  if (!token) return new Response('MCP is unavailable.', { status: 503 });

  const received = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${token}`);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return new Response('Unauthorized.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' },
    });
  }

  const server = new McpServer({ name: 'washboard', version: '0.1.0' });
  registerWeightTools(server);
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

export function GET() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}

export const DELETE = GET;
