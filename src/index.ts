#!/usr/bin/env node

/**
 * This is a MCP server that call flomo api to write notes.
 * It demonstrates core MCP concepts like tools by allowing:
 * - Writing notes to flomo via a tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { FlomoClient } from "./flomo.js";

/**
 * Parse command line arguments
 * Example: node index.js --flomo_api_url=https://flomoapp.com/iwh/xxx/xxx/
 */
function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value;
    }
  });
  return args;
}

const args = parseArgs();
const apiUrl = args.flomo_api_url || process.env.FLOMO_API_URL || "";

/**
 * Create an MCP server with capabilities for tools (to write notes to flomo).
 */
const server = new Server(
  {
    name: "mcp-server-flomo",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler that lists available tools.
 * Exposes a single "write_note" tool that lets clients create new notes.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "write_note",
        description: "Write note to flomo",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "Text content of the note with markdown format",
            },
          },
          required: ["content"],
        },
      },
    ],
  };
});

/**
 * Handler for the write_note tool.
 * Creates a new note with the content, save to flomo and returns success message.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "write_note": {
      if (!apiUrl) {
        throw new Error("Flomo API URL not set");
      }

      const content = String(request.params.arguments?.content);
      if (!content) {
        throw new Error("Content is required");
      }

      const flomo = new FlomoClient({ apiUrl });
      const result = await flomo.writeNote({ content });

      if (!result.memo || !result.memo.slug) {
        throw new Error(
          `Failed to write note to flomo: ${result?.message || "unknown error"}`
        );
      }

      const flomoUrl = `https://v.flomoapp.com/mine/?memo_id=${result.memo.slug}`;

      return {
        content: [
          {
            type: "text",
            text: `Write note to flomo success, view it at: ${flomoUrl}`,
          },
        ],
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
