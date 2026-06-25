import {
  Outlet,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { Navbar } from '~/components/Navbar'
import { Footer } from '~/components/Footer'
import { BackToTop } from '~/components/BackToTop'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function HolidayBannerWrapper() {
  const [mod, setMod] = React.useState<any>(null)
  React.useEffect(() => {
    import('~/components/HolidayBanner')
      .then(m => setMod(() => m.HolidayBanner))
      .catch(() => {})
  }, [])
  if (!mod) return null
  const Banner = mod
  return <Banner />
}

function RootComponent() {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard') || 
                      location.pathname.startsWith('/admin') ||
                      location.pathname.startsWith('/enterprise') ||
                      [
                        '/academic-writer', '/business-consultant', '/content-writer', 
                        '/career-coach', '/personal-shopper', '/exam-prep', 
                        '/finance-advisor', '/video-production', '/wellness-coach', 
                        '/home-management', '/language-coach', '/travel-planner', 
                        '/exam-success', '/translation-hub', '/event-planner',
                      '/all-agents'
                      ].includes(location.pathname)

  return (
    <>
      <HolidayBannerWrapper />
      {!isDashboard && <Navbar />}
      <div className={!isDashboard ? "pt-20" : ""}>
        <Outlet />
      </div>
      {!isDashboard && <Footer />}
      <BackToTop />
    </>
  )
}
