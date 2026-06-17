import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProviderWithAuth } from 'convex/react'
import { useConvexAuth } from '@convex-dev/auth/react'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!
  if (!CONVEX_URL) {
    console.error('missing envar CONVEX_URL')
  }
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        gcTime: 5000,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: { queryClient },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0, // Let React Query handle all caching
      defaultErrorComponent: () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><p className="text-red-500 font-black text-xl">An unexpected error occurred. Please try again.</p></div>,
      defaultNotFoundComponent: () => <p>not found</p>,
      Wrap: ({ children }) => (
        <ConvexProviderWithAuth client={convexQueryClient.convexClient} useAuth={useConvexAuth}>
          {children}
        </ConvexProviderWithAuth>
      ),
    }),
    queryClient,
  )

  return router
}
