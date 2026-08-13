// Edge Function: admin-create-user
//
// Creates a new Supabase Auth login + matching profiles row. This has to live
// server-side because it needs the service_role key (full DB access) to call
// auth.admin.createUser — that key must never be shipped to the browser, so
// this can't be done directly from the React app.
//
// Deploy:
//   supabase functions deploy admin-create-user
// The SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are provided
// automatically by the Supabase platform for edge functions — nothing extra
// to configure there.
//
// Called from the frontend with:
//   supabase.functions.invoke('admin-create-user', { body: { email, password, full_name, full_name_am, role } })
// supabase-js automatically attaches the caller's session as the
// Authorization header, which is what lets us verify the caller below.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ROLES = ['super_admin', 'warehouse_keeper', 'kitchen_staff', 'cashier', 'auditor', 'customer']

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerToken = authHeader.replace('Bearer ', '')
    if (!callerToken) return json({ error: 'Missing auth token' }, 401)

    // Service-role client — full privileges, used only after we've verified
    // the caller below.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Verify the token belongs to a real, current session.
    const { data: callerAuth, error: callerErr } = await admin.auth.getUser(callerToken)
    if (callerErr || !callerAuth?.user) return json({ error: 'Invalid session' }, 401)

    // Verify that caller is actually a super_admin — this is the real
    // authorization check; anyone else gets rejected here.
    const { data: callerProfile, error: profileErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerAuth.user.id)
      .single()
    if (profileErr || callerProfile?.role !== 'super_admin') {
      return json({ error: 'Only admins can create accounts' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const email = (body.email || '').trim()
    const password = body.password || ''
    const full_name = (body.full_name || '').trim()
    const full_name_am = (body.full_name_am || '').trim() || null
    const role = body.role

    if (!email || !password || !full_name || !role) {
      return json({ error: 'email, password, full_name, and role are required' }, 400)
    }
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, 400)
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }

    // Create the login. email_confirm:true skips the confirmation-email step
    // since an admin is vouching for this account directly.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, full_name_am }
    })
    if (createErr) return json({ error: createErr.message }, 400)

    // Upsert the profile row. If step1–step7 already have a trigger that
    // auto-creates a bare profile on auth.users insert, this just fills in
    // the rest; if not, this is what creates it.
    const { error: upsertErr } = await admin.from('profiles').upsert({
      id: created.user.id,
      email,
      full_name,
      full_name_am,
      role,
      is_active: true
    })
    if (upsertErr) {
      // Don't leave an orphaned login with no usable profile.
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: upsertErr.message }, 400)
    }

    return json({ user_id: created.user.id })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500)
  }
})
