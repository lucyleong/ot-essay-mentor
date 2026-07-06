import { format } from 'date-fns'

/**
 * Converts a UTC date string to Pacific time (handles PST/PDT automatically)
 */
export function toPST(dateString: string): Date {
  return new Date(new Date(dateString).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
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