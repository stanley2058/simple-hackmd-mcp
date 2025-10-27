# hackmd-mcp

A Model Context Protocol (MCP) server for interacting with HackMD API.

## Features

- Get workspace notes (personal or team)
- Get single note details
- Create/update notes
- Delete notes

## Prerequisites

- HackMD API key (obtain from HackMD settings)

## Installation

### Using npx (Recommended)

No installation required! Run directly with:

```bash
npx -y @stanley2058/hackmd-mcp
```

### For Development

```bash
npm install
# or
bun install
```

## Configuration

### Environment Variables

**Required:**

- `HACKMD_API_KEY`: Your HackMD API key (obtain from HackMD settings)

**Optional:**

- `PORT`: HTTP server port (default: `3000`, only used in HTTP mode)

## Usage

This MCP server supports two modes: `stdio` and `http`.

### stdio Mode (Default)

Run the server in stdio mode for direct MCP client integration:

Using npx:

```bash
HACKMD_API_KEY=your_api_key npx -y @stanley2058/hackmd-mcp
```

Or from source:

```bash
HACKMD_API_KEY=your_api_key node dist/index.js
# or
HACKMD_API_KEY=your_api_key bun run index.ts
```

### HTTP Mode

Run the server in HTTP mode to expose an HTTP endpoint:

Using npx:

```bash
HACKMD_API_KEY=your_api_key npx -y @stanley2058/hackmd-mcp --http
```

Or from source:

```bash
HACKMD_API_KEY=your_api_key node dist/index.js --http
# or
HACKMD_API_KEY=your_api_key bun run index.ts --http
```

The server will start on `http://localhost:3000/mcp` by default. Change the port using the `PORT` environment variable:

```bash
HACKMD_API_KEY=your_api_key PORT=8080 npx -y @stanley2058/hackmd-mcp --http
```

## Building

```bash
bun run build
```

## License

MIT
