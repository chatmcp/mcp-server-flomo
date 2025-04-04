#!/usr/bin/env node

/**
 * This is a MCP server that call flomo api to write notes.
 * It demonstrates core MCP concepts like tools by allowing:
 * - Writing notes to flomo via a tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { getParamValue, getAuthValue } from "@chatmcp/sdk/utils/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { FlomoClient } from "./flomo.js";
import { RestServerTransport } from "@chatmcp/sdk/server/rest.js";

const flomoApiUrl = getParamValue("flomo_api_url") || "";

const mode = getParamValue("mode") || "stdio";
const port = getParamValue("port") || 9593;
const endpoint = getParamValue("endpoint") || "/rest";

/**
 * Create an MCP server with capabilities for tools (to write notes to flomo).
 */
const server = new Server(
  {
    name: "mcp-server-flomo",
    version: "0.0.3",
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
server.setRequestHandler(ListToolsRequestSchema, async (request) => {
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
  const apiUrl = flomoApiUrl || getAuthValue(request, "flomo_api_url");
  if (!apiUrl) {
    throw new Error("Flomo API URL not set");
  }

  switch (request.params.name) {
    case "write_note": {
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

      return {
        content: [
          {
            type: "text",
            text: `Write note to flomo success, result: ${JSON.stringify(
              result
            )}`,
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
  if (mode === "rest") {
    const transport = new RestServerTransport({
      port,
      endpoint,
    });
    await server.connect(transport);

    await transport.startServer();
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
