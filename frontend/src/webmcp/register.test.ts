import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return {
    ...actual,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    getToken: vi.fn(() => 'jwt-token'),
  }
})

const registerTool = vi.hoisted(() => vi.fn())

// The polyfill's only observable effect we rely on: importing it installs
// navigator.modelContext. The mock reproduces that.
vi.mock('@mcp-b/global', () => {
  ;(globalThis.navigator as unknown as { modelContext: unknown }).modelContext = { registerTool }
  return {}
})

beforeEach(() => {
  vi.resetModules()
  registerTool.mockClear()
  vi.unstubAllGlobals()
})

describe('registerWebMcpTools', () => {
  it('registers all 7 tools on an existing navigator.modelContext', async () => {
    vi.stubGlobal('navigator', { modelContext: { registerTool } })
    const { registerWebMcpTools } = await import('./register')

    await registerWebMcpTools(new QueryClient())

    expect(registerTool).toHaveBeenCalledTimes(7)
  })

  it('is idempotent (StrictMode double-effect safe)', async () => {
    vi.stubGlobal('navigator', { modelContext: { registerTool } })
    const { registerWebMcpTools } = await import('./register')
    const queryClient = new QueryClient()

    await registerWebMcpTools(queryClient)
    await registerWebMcpTools(queryClient)

    expect(registerTool).toHaveBeenCalledTimes(7)
  })

  it('loads the polyfill when navigator.modelContext is absent', async () => {
    vi.stubGlobal('navigator', {})
    const { registerWebMcpTools } = await import('./register')

    await registerWebMcpTools(new QueryClient())

    expect(registerTool).toHaveBeenCalledTimes(7)
  })
})
