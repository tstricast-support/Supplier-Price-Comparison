import { useRef, useCallback } from 'react'

/**
 * Generic long-press detector for touch + mouse.
 *
 * Spread the returned handlers onto the same element you'd normally put
 * `onClick` on - do NOT also add a separate onClick prop, use the `onClick`
 * this hook returns instead, so a long-press doesn't also fire the regular
 * click once the finger/mouse lifts.
 *
 *   const longPress = useLongPress(
 *     () => setConfirmTarget(item),   // fires after holding `delay` ms
 *     () => onSelect(item),           // fires on a normal short tap/click
 *   )
 *   <li {...longPress}>...</li>
 */
export default function useLongPress(onLongPress, onClick, { delay = 500 } = {}) {
  const timerRef = useRef(null)
  const firedRef = useRef(false)

  const start = useCallback(
    (event) => {
      firedRef.current = false
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        onLongPress(event)
      }, delay)
    },
    [onLongPress, delay]
  )

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleClick = useCallback(
    (event) => {
      // The long-press already handled this interaction - swallow the
      // trailing click so it doesn't also open/toggle the row.
      if (firedRef.current) {
        firedRef.current = false
        return
      }
      onClick && onClick(event)
    },
    [onClick]
  )

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onClick: handleClick,
    // Suppress the native "copy/share" long-press menu on mobile browsers
    // so it doesn't fight with our own long-press action.
    onContextMenu: (event) => event.preventDefault(),
  }
}
