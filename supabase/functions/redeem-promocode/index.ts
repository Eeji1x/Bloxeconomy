import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Code is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const sanitizedCode = code.trim().toUpperCase().slice(0, 50)

    // Check if user is banned
    const { data: profile } = await adminClient
      .from('profiles')
      .select('emeralds, is_banned')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (profile.is_banned) {
      return new Response(JSON.stringify({ error: 'Account is banned' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find promocode
    const { data: promocode } = await adminClient
      .from('promocodes')
      .select('*')
      .eq('code', sanitizedCode)
      .eq('is_active', true)
      .maybeSingle()

    if (!promocode) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check max uses
    if (promocode.max_uses !== null && (promocode.current_uses || 0) >= promocode.max_uses) {
      return new Response(JSON.stringify({ error: 'This code has reached its maximum uses' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if already redeemed
    const { data: existingRedemption } = await adminClient
      .from('promocode_redemptions')
      .select('id')
      .eq('promocode_id', promocode.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingRedemption) {
      return new Response(JSON.stringify({ error: 'You have already redeemed this code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create redemption record
    const { error: redemptionErr } = await adminClient
      .from('promocode_redemptions')
      .insert({ promocode_id: promocode.id, user_id: user.id })

    if (redemptionErr) {
      // Likely a race condition duplicate
      return new Response(JSON.stringify({ error: 'Already redeemed or failed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Increment uses
    await adminClient
      .from('promocodes')
      .update({
        current_uses: (promocode.current_uses || 0) + 1,
        is_active: promocode.max_uses === null || (promocode.current_uses || 0) + 1 < promocode.max_uses,
      })
      .eq('id', promocode.id)

    // Give emerald reward
    const emeraldReward = promocode.emerald_reward || 0
    if (emeraldReward > 0) {
      // Re-read balance to prevent stale data
      const { data: freshProfile } = await adminClient
        .from('profiles')
        .select('emeralds')
        .eq('user_id', user.id)
        .single()

      if (freshProfile) {
        await adminClient
          .from('profiles')
          .update({ emeralds: freshProfile.emeralds + emeraldReward })
          .eq('user_id', user.id)
      }
    }

    // Give item reward
    if (promocode.item_reward_id) {
      await adminClient
        .from('user_inventory')
        .insert({ user_id: user.id, item_id: promocode.item_reward_id, quantity: 1 })
    }

    return new Response(JSON.stringify({
      success: true,
      emerald_reward: emeraldReward,
      item_reward: !!promocode.item_reward_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
