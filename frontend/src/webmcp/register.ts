import type { QueryClient } from '@tanstack/react-query'
import { createTools } from './tools'
import type { ModelContext } from './types'

// Local assertion instead of a global Navigator augmentation: @mcp-b/global
// ships its own global types, and a second declaration would conflict.
function modelContext(): ModelContext | undefined {
  return (navigator as Navigator & { modelContext?: ModelContext }).modelContext
}

let registered = false

// Exposes Typerek's tools to in-browser AI agents (WebMCP). Native
// navigator.modelContext is used when the browser provides one; otherwise the
// @mcp-b/global polyfill installs it and bridges to the MCP-B extension.
// Registration failures only cost agent support, never the app itself.
export async function registerWebMcpTools(queryClient: QueryClient): Promise<void> {
  if (registered) return
  registered = true
  try {
    if (!modelContext()) await import('@mcp-b/global')
    const context = modelContext()
    if (!context) return
    for (const tool of createTools(queryClient)) context.registerTool(tool)
  } catch (error) {
    console.warn('WebMCP tool registration failed', error)
  }
}
