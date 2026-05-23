import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import appCss from '~/styles/app.css?url'
import { HolidayBanner } from '~/components/HolidayBanner'
import { Navbar } from '~/components/Navbar'
import { Footer } from '~/components/Footer'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Dutchkem Ventures ProSuite NG+',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  notFoundComponent: () => <div>Route not found</div>,
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
    <RootDocument>
      {!isDashboard && <Navbar />}
      <div className={!isDashboard ? "pt-20" : ""}>
        <Outlet />
      </div>
      {!isDashboard && <Footer />}
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <HolidayBanner />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
