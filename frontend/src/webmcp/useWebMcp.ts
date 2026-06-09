import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { registerWebMcpTools } from './register'

// Registers the WebMCP tools once on app start. Tools read auth at call time,
// so there is nothing to re-register on sign-in/out.
export function useWebMcp(): void {
  const queryClient = useQueryClient()
  useEffect(() => {
    void registerWebMcpTools(queryClient)
  }, [queryClient])
}
