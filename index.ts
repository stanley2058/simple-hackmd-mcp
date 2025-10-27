import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { API } from "@hackmd/api";
import { z } from "zod";
import type {
  GetTeamNotes,
  GetUserNotes,
  SingleNote,
  CreateNoteOptions,
} from "@hackmd/api/dist/type.js";
import express from "express";

const apiKey = process.env.HACKMD_API_KEY;
if (!apiKey) throw new Error("HACKMD_API_KEY not set");
const client = new API(apiKey);

const server = new McpServer({
  name: "hackmd-mcp",
  version: "1.0.0",
});

server.registerTool(
  "get_workspace_notes",
  {
    title: "HackMD Get Workspace Notes",
    description: "Get list of notes in a workspace on HackMD",
    inputSchema: {
      teamPath: z
        .string()
        .optional()
        .describe(
          "Optional team path, defaults to personal workspace if not provided",
        ),
      limit: z
        .number()
        .min(1)
        .optional()
        .default(100)
        .describe("Optional return limit, defaults to 100"),
      titleFilter: z
        .string()
        .optional()
        .describe("Optional text filter the title needs to include"),
    },
  },
  async (input) => {
    try {
      const { teamPath, limit, titleFilter } = input;

      let result = teamPath
        ? await client.getTeamNotes(teamPath)
        : await client.getNoteList();

      if (titleFilter) {
        result = result.filter((note) => note.title.includes(titleFilter));
      }
      result.sort(
        (a, b) =>
          new Date(b.lastChangedAt).getTime() -
          new Date(a.lastChangedAt).getTime(),
      );
      result = result.slice(0, limit);

      const reducedResult = reduceNote(result);

      return {
        content: [{ type: "text", text: JSON.stringify(reducedResult) }],
      };
    } catch (e) {
      console.error(e);
      return {
        isError: true,
        content: [
          { type: "text", text: e instanceof Error ? e.message : `${e}` },
        ],
      };
    }
  },
);

server.registerTool(
  "get_workspace_single_note",
  {
    title: "HackMD Get Single Workspace Note",
    description: "Get detail of a single note in a workspace on HackMD",
    inputSchema: {
      noteId: z.string().describe("The note id to get the detail of"),
      contentFrom: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe(
          "Optional content slicing start, defaults to 0 (document start)",
        ),
      contentTo: z
        .number()
        .min(0)
        .optional()
        .default(10000)
        .describe("Optional content slicing end, defaults to 10000"),
    },
  },
  async (input) => {
    try {
      const { noteId, contentFrom, contentTo } = input;

      const note = await client.getNote(noteId);
      const reducedResult = {
        ...reduceNote([note]),
        content: note.content.slice(contentFrom, contentTo),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(reducedResult) }],
      };
    } catch (e) {
      console.error(e);
      return {
        isError: true,
        content: [
          { type: "text", text: e instanceof Error ? e.message : `${e}` },
        ],
      };
    }
  },
);

server.registerTool(
  "upsert_workspace_note",
  {
    title: "Upsert Workspace Note",
    description: "Update or create a note in a workspace on HackMD",
    inputSchema: {
      teamPath: z
        .string()
        .optional()
        .describe(
          "Optional team path, defaults to personal workspace if not provided",
        ),
      noteId: z
        .string()
        .optional()
        .describe("The note id to update. Creates a new note if not provided"),
      title: z
        .string()
        .optional()
        .describe(
          "Title of the new note (only used for create, no effect on update)",
        ),
      content: z
        .string()
        .optional()
        .describe("Content of the note to create/update"),
      permalink: z
        .string()
        .optional()
        .describe(
          "Permalink of the note to create/update, must only contains a-zA-Z0-9_-",
        ),
      readPermission: z
        .enum(["owner", "signed_in", "guest"])
        .optional()
        .default("owner")
        .describe("Read permission of the note to create/update"),
      writePermission: z
        .enum(["owner", "signed_in", "guest"])
        .optional()
        .default("owner")
        .describe("Write permission of the note to create/update"),
    },
  },
  async (input) => {
    try {
      const { teamPath, noteId, ...rest } = input;
      const opts = rest as CreateNoteOptions;

      let result: SingleNote;
      if (noteId) {
        if (teamPath) {
          await client.updateTeamNote(teamPath, noteId, opts);
        } else {
          await client.updateNote(noteId, opts);
        }
        result = await client.getNote(noteId);
      } else {
        if (teamPath) {
          result = await client.createTeamNote(teamPath, opts);
        } else {
          result = await client.createNote(opts);
        }
      }

      const reducedResult = reduceNote([result]);
      return {
        content: [{ type: "text", text: JSON.stringify(reducedResult) }],
      };
    } catch (e) {
      console.error(e);
      return {
        isError: true,
        content: [
          { type: "text", text: e instanceof Error ? e.message : `${e}` },
        ],
      };
    }
  },
);

server.registerTool(
  "delete_workspace_note",
  {
    title: "Delete Workspace Note",
    description:
      "!!CAUTION!! REQUIRES USER CONFIRMATION. Delete a note from a workspace on HackMD",
    inputSchema: {
      teamPath: z
        .string()
        .optional()
        .describe(
          "Optional team path, defaults to personal workspace if not provided",
        ),
      noteId: z
        .string()
        .describe("The note id to update. Creates a new note if not provided"),
    },
  },
  async (input) => {
    try {
      const { teamPath, noteId } = input;

      if (teamPath) {
        await client.deleteTeamNote(teamPath, noteId);
      } else {
        await client.deleteNote(noteId);
      }

      return {
        content: [{ type: "text", text: "(Note deleted)" }],
      };
    } catch (e) {
      console.error(e);
      return {
        isError: true,
        content: [
          { type: "text", text: e instanceof Error ? e.message : `${e}` },
        ],
      };
    }
  },
);

function reduceNote(notes: SingleNote[] | GetUserNotes | GetTeamNotes) {
  const reducedResult = notes.map((note) => ({
    id: note.id,
    title: note.title,
    tags: note.tags,
    published: Boolean(note.publishedAt),
    publishedType: note.publishType,
    createdAt: note.createdAt,
    lastChanged: note.lastChangedAt,
    publishLink: note.publishLink,
    readPermission: note.readPermission,
    writePermission: note.writePermission,
    teamPath: note.teamPath,
  }));
  return reducedResult;
}

const mode = process.argv[2];
if (mode === "--http") {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3000");
  app
    .listen(port, () => {
      console.log(`MCP Server running on http://localhost:${port}/mcp`);
    })
    .on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });
} else {
  const transport = new StdioServerTransport();
  server.connect(transport);
}
