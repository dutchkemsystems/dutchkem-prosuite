import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
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
    defaultErrorComponent: () => (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-red-500 font-black text-xl">
          An unexpected error occurred. Please try again.
        </p>
      </div>
    ),
    defaultNotFoundComponent: () => <p>not found</p>,
    Wrap: ({ children }) => (
      <ConvexAuthProvider client={convexQueryClient.convexClient}>
        {children}
      </ConvexAuthProvider>
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
