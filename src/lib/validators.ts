export function isGmailAddress(email: string): boolean {
  return /^[^\s@]+@gmail\.com$/i.test(email.trim())
}

export function assertGmail(email: string): void {
  if (!isGmailAddress(email)) {
    throw new Error(
      'A Gmail address is required to book an appointment. ' +
      'Please use a @gmail.com address.'
    )
  }
}