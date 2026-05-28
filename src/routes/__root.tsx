import {
  Outlet,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { HolidayBanner } from '~/components/HolidayBanner'
import { Navbar } from '~/components/Navbar'
import { Footer } from '~/components/Footer'

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
      <HolidayBanner />
      {!isDashboard && <Navbar />}
      <div className={!isDashboard ? "pt-20" : ""}>
        <Outlet />
      </div>
      {!isDashboard && <Footer />}
    </>
  )
}
