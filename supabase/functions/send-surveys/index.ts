Deno.serve(async () => {
  const APP_URL      = Deno.env.get('APP_URL')!
  const CRON_SECRET  = Deno.env.get('INTERNAL_API_SECRET')!

  const res = await fetch(`${APP_URL}/api/survey/send`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization: `Bearer ${CRON_SECRET}`,
    },
  })

  const data = await res.json()
  return new Response(JSON.stringify(data))
})