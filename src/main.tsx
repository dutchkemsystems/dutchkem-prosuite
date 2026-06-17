import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProviderWithAuth } from 'convex/react'
import { useConvexAuth } from '@convex-dev/auth/react'
import { routeTree } from './routeTree.gen'
import '~/styles/app.css'

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL
if (!CONVEX_URL || CONVEX_URL === 'https://your-project.convex.cloud') {
  console.error('VITE_CONVEX_URL is missing or is the placeholder value')
}

const convexQueryClient = new ConvexQueryClient(CONVEX_URL || 'https://placeholder.convex.cloud')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
      gcTime: 5000,
      retry: false,
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
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error, reset }) => (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-lg w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <p className="text-red-400 font-black text-xl mb-4">An unexpected error occurred</p>
          <p className="text-red-300 text-sm font-mono break-all mb-6">{String(error?.message || error)}</p>
          <button onClick={reset} className="px-6 py-3 bg-white/10 rounded-xl text-white text-sm font-bold hover:bg-white/20 transition-colors">Try Again</button>
        </div>
      </div>
    ),
    defaultNotFoundComponent: () => <p>not found</p>,
    Wrap: ({ children }) => (
      <ConvexProviderWithAuth
        client={convexQueryClient.convexClient}
        useAuth={useConvexAuth}
      >
        {children}
      </ConvexProviderWithAuth>
    ),
  }),
  queryClient,
)

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}
