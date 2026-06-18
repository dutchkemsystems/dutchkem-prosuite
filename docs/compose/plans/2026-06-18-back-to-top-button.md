# Back-to-Top Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating back-to-top button that appears when the user scrolls down, matching the existing design system.

**Architecture:** Create a single new component `BackToTop.tsx` in `src/components/` and import it in the root layout. The button uses scroll position detection, smooth scroll-to-top, and matches the existing orange accent design system.

**Tech Stack:** React, Tailwind CSS, existing design patterns (orange accent, transitions, backdrop-blur)

---

### Task 1: Create BackToTop component

**Covers:** Section 1.1 UI/UX Features - Back to Top button

**Files:**
- Create: `src/components/BackToTop.tsx`
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Create the BackToTop component**

```tsx
// src/components/BackToTop.tsx
import { useState, useEffect } from 'react'

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    function toggleVisibility() {
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true })
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-orange-500/25 hover:scale-110 active:scale-95 transition-all duration-200 backdrop-blur-sm"
      aria-label="Back to top"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
}
```

- [ ] **Step 2: Import BackToTop in root layout**

```tsx
// src/routes/__root.tsx
// Add import at top:
import { BackToTop } from '~/components/BackToTop'

// Add inside RootComponent return, after the closing </> fragment:
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
```

- [ ] **Step 3: Verify the component renders**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/components/BackToTop.tsx src/routes/__root.tsx
git commit -m "feat: add back-to-top floating button"
```

---

## Summary

| Task | Issue | Severity | File |
|------|-------|----------|------|
| 1 | Missing back-to-top button | Minor | src/components/BackToTop.tsx (new), src/routes/__root.tsx |

**Total changes:** 1 new file, 1 modified file
