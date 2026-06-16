export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  let email;
  try {
    const body = await request.json();
    email = (body.email || '').trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers });
  }

  // Save to D1
  try {
    await env.DB.prepare(
      'INSERT INTO subscribers (id, email, created_at) VALUES (?, ?, ?)'
    ).bind(crypto.randomUUID(), email, new Date().toISOString()).run();
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return new Response(JSON.stringify({ ok: true, dupe: true }), { headers });
    }
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers });
  }

  // Send confirmation via Resend
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'wwitch <onboarding@resend.dev>',
      to: email,
      subject: 'You\'ll hear it when it arrives.',
      html: `
        <div style="background:#0a0908;color:#e8e4dc;font-family:Georgia,serif;padding:3rem 2rem;max-width:480px;margin:0 auto;">
          <p style="font-size:2.5rem;margin:0 0 1.5rem;letter-spacing:-0.02em;">wwitch</p>
          <p style="font-style:italic;color:#6b6460;margin:0 0 1.5rem;line-height:1.7;">August 19. The Turning begins.</p>
          <p style="line-height:1.7;margin:0;color:#a09890;">You'll know before anyone else.</p>
        </div>
      `,
    }),
  });

  return new Response(JSON.stringify({ ok: true }), { headers });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
