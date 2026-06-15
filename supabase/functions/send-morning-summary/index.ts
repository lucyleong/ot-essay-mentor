Deno.serve(async () => {
  const APP_URL     = Deno.env.get('APP_URL')!
  const CRON_SECRET = Deno.env.get('INTERNAL_API_SECRET')!

  // Check if it's 8am PST
  const now      = new Date()
  const pstHour  = parseInt(now.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    hour12: false,
  }))

  if (pstHour !== 8) {
    return new Response(JSON.stringify({ skipped: true, reason: `Not 8am PST (current hour: ${pstHour})` }))
  }

  const res = await fetch(`${APP_URL}/api/internal/send-morning-summary`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${CRON_SECRET}`,
    },
  })

  const data = await res.json()
  return new Response(JSON.stringify(data))
})