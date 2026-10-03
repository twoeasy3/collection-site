import { useEffect, useRef, useState } from 'react';

// Viewport breakpoint. The ref mirrors the state for callbacks that must not
// go stale (e.g. sidebar click handlers memoised on other deps).
export function useIsMobile(breakpoint = 700) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  const isMobileRef = useRef(isMobile);

  useEffect(() => {
    const onResize = () => { const mobile = window.innerWidth < breakpoint; isMobileRef.current = mobile; setIsMobile(mobile); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return { isMobile, isMobileRef };
}
