'use client'

/**
 * A template remounts on every navigation, so this is where a route change gets
 * its entrance. The animation is a transition out of @starting-style, meaning
 * the resting state is the visible one and a page can never be left faded out.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
