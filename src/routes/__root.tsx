import {
  Outlet,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { Navbar } from '~/components/Navbar'
import { Footer } from '~/components/Footer'

const HolidayBanner = React.lazy(() =>
  import('~/components/HolidayBanner').then(m => ({ default: m.HolidayBanner }))
)

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard') || 
                      location.pathname.startsWith('/admin') ||
                      [
                        '/academic-writer', '/business-consultant', '/content-writer', 
                        '/career-coach', '/personal-shopper', '/exam-prep', 
                        '/finance-advisor', '/video-production', '/wellness-coach', 
                        '/home-management', '/language-coach', '/travel-planner', 
                        '/exam-success', '/translation-hub', '/event-planner'
                      ].includes(location.pathname)

  return (
    <>
      <React.Suspense fallback={null}>
        <HolidayBanner />
      </React.Suspense>
      {!isDashboard && <Navbar />}
      <div className={!isDashboard ? "pt-20" : ""}>
        <Outlet />
      </div>
      {!isDashboard && <Footer />}
    </>
  )
}
