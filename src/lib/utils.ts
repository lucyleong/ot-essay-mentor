import { format } from 'date-fns'
/**
 * Converts a UTC date string to Pacific time (handles PST/PDT automatically)
 */
export function toPST(dateString: string): Date {
  return new Date(new Date(dateString).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
}

// TEMPORARY: college applications are due 2026-11-30, so same-day virtual
// booking (normally the earliest bookable day is tomorrow) is enabled
// through that date. Used by /api/slots/available, book/page.tsx, and
// /api/bookings/[bookingId]/cancel — remove this and those call sites once
// the window has passed.
const SAME_DAY_BOOKING_WINDOW_END = '2026-11-30'

export function isSameDayBookingWindowActive(nowPST: Date): boolean {
  return nowPST.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }) <= SAME_DAY_BOOKING_WINDOW_END
}

/**
 * Formats a UTC date string as a readable date in Pacific time
 * e.g. "Monday, July 5"
 */
export function formatDatePST(dateString: string, formatStr: string = 'EEEE, MMMM d'): string {
  return format(toPST(dateString), formatStr)
}

/**
 * Formats a UTC date string as a readable time in Pacific time
 * e.g. "3:30 PM"
 */
export function formatTimePST(dateString: string, formatStr: string = 'h:mm a'): string {
  return format(toPST(dateString), formatStr)
}
/**
 * Formats a UTC date string as a full date + time string in Pacific time
 * e.g. "Monday, July 5 at 3:30 PM"
 */
export function formatDateTimePST(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
}
/**
 * Formats a UTC date string as a short date in Pacific time
 * e.g. "Mon, Jul 5"
 */
export function formatShortDatePST(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
}

/**
 * Formats a UTC date string as a time in Pacific time using toLocaleTimeString
 * e.g. "3:30 PM"
 */
export function formatLocaleTimePST(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
}
/**
 * Formats a UTC date string as a short numeric date in Pacific time
 * e.g. "7/5/2026"
 */
export function formatShortDateNumericPST(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
  })
}
/**
 * Formats a UTC date string as a short date with year in Pacific time
 * e.g. "Jul 5, 2026"
 */
export function formatShortDateWithYearPST(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
}