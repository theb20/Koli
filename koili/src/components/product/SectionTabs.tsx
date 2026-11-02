import { useEffect, useState } from 'react'

export type SectionTab = { id: string; label: string }

export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id)

  useEffect(() => {
    const elements = tabs
      .map(t => document.getElementById(t.id))
      .filter((el): el is HTMLElement => !!el)

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-120px 0px -70% 0px', threshold: 0 },
    )

    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [tabs])

  const goTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 96
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <div className="sticky top-0 z-20 bg-surface border-b border-border">
      <nav className="flex items-center gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => goTo(tab.id)}
            className={`relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active === tab.id ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
            {active === tab.id && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-ink rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
