// Minimal slice of the WebMCP (W3C Web Model Context) API surface we use.
// Deliberately local: @mcp-b/global ships its own global Navigator types, and
// declaring our own global augmentation alongside them risks conflicts.

export interface ToolContent {
  type: 'text'
  text: string
}

export interface ToolResponse {
  content: ToolContent[]
  isError?: boolean
}

export interface ToolDescriptor {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<ToolResponse>
}

export interface ModelContext {
  registerTool: (tool: ToolDescriptor) => unknown
}
