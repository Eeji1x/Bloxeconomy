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

    const { trade_id, action } = await req.json()
    if (!trade_id || typeof trade_id !== 'string') throw new Error('trade_id required')
    if (!['accept', 'decline', 'cancel'].includes(action)) throw new Error('Invalid action')

    // Fetch trade
    const { data: trade, error: tradeErr } = await adminClient
      .from('trades')
      .select('*')
      .eq('id', trade_id)
      .single()

    if (tradeErr || !trade) {
      return new Response(JSON.stringify({ error: 'Trade not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify caller is participant
    const isSender = trade.sender_id === user.id
    const isReceiver = trade.receiver_id === user.id
    if (!isSender && !isReceiver) {
      return new Response(JSON.stringify({ error: 'Not your trade' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Must be pending
    if (trade.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Trade is no longer pending' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Sender can only cancel, receiver can accept/decline
    if (isSender && action !== 'cancel') {
      return new Response(JSON.stringify({ error: 'Sender can only cancel' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (isReceiver && action === 'cancel') {
      return new Response(JSON.stringify({ error: 'Receiver cannot cancel, use decline' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // For decline/cancel, just update status
    if (action === 'decline' || action === 'cancel') {
      const newStatus = action === 'decline' ? 'declined' : 'cancelled'
      await adminClient.from('trades').update({ status: newStatus }).eq('id', trade_id)
      return new Response(JSON.stringify({ success: true, status: newStatus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // === ACCEPT: Full server-side validation and execution ===

    const senderItems: string[] = trade.sender_items || []
    const receiverItems: string[] = trade.receiver_items || []
    const senderEmeralds: number = trade.sender_emeralds || 0
    const receiverEmeralds: number = trade.receiver_emeralds || 0

    // Must have something to trade
    if (senderItems.length === 0 && receiverItems.length === 0 && senderEmeralds === 0 && receiverEmeralds === 0) {
      return new Response(JSON.stringify({ error: 'Empty trade' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check both users are not banned
    const { data: senderProfile } = await adminClient
      .from('profiles')
      .select('emeralds, is_banned')
      .eq('user_id', trade.sender_id)
      .single()

    const { data: receiverProfile } = await adminClient
      .from('profiles')
      .select('emeralds, is_banned')
      .eq('user_id', trade.receiver_id)
      .single()

    if (!senderProfile || !receiverProfile) {
      await adminClient.from('trades').update({ status: 'cancelled' }).eq('id', trade_id)
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (senderProfile.is_banned || receiverProfile.is_banned) {
      await adminClient.from('trades').update({ status: 'cancelled' }).eq('id', trade_id)
      return new Response(JSON.stringify({ error: 'A user in this trade has been banned' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify emerald balances
    if (senderEmeralds > senderProfile.emeralds) {
      return new Response(JSON.stringify({ error: 'Sender does not have enough emeralds' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (receiverEmeralds > receiverProfile.emeralds) {
      return new Response(JSON.stringify({ error: 'Receiver does not have enough emeralds' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify sender owns all their items
    if (senderItems.length > 0) {
      const { data: senderInv } = await adminClient
        .from('user_inventory')
        .select('id')
        .eq('user_id', trade.sender_id)
        .in('id', senderItems)

      if ((senderInv?.length || 0) !== senderItems.length) {
        return new Response(JSON.stringify({ error: 'Sender no longer owns all traded items' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Verify receiver owns all their items
    if (receiverItems.length > 0) {
      const { data: receiverInv } = await adminClient
        .from('user_inventory')
        .select('id')
        .eq('user_id', trade.receiver_id)
        .in('id', receiverItems)

      if ((receiverInv?.length || 0) !== receiverItems.length) {
        return new Response(JSON.stringify({ error: 'Receiver no longer owns all traded items' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Check items are not currently listed for resale
    const allItems = [...senderItems, ...receiverItems]
    if (allItems.length > 0) {
      const { data: activeListings } = await adminClient
        .from('resale_listings')
        .select('id')
        .in('inventory_id', allItems)
        .eq('is_active', true)

      if (activeListings && activeListings.length > 0) {
        return new Response(JSON.stringify({ error: 'Some items are currently listed for resale. Remove listings first.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // === Execute atomic swap ===

    // Transfer sender items to receiver
    if (senderItems.length > 0) {
      await adminClient
        .from('user_inventory')
        .update({ user_id: trade.receiver_id, is_equipped: false })
        .in('id', senderItems)

      // Update serials
      for (const invId of senderItems) {
        await adminClient
          .from('item_serials')
          .update({ owner_id: trade.receiver_id })
          .eq('inventory_id', invId)
      }
    }

    // Transfer receiver items to sender
    if (receiverItems.length > 0) {
      await adminClient
        .from('user_inventory')
        .update({ user_id: trade.sender_id, is_equipped: false })
        .in('id', receiverItems)

      // Update serials
      for (const invId of receiverItems) {
        await adminClient
          .from('item_serials')
          .update({ owner_id: trade.sender_id })
          .eq('inventory_id', invId)
      }
    }

    // Update emeralds atomically (re-read to prevent race)
    const { data: freshSender } = await adminClient
      .from('profiles')
      .select('emeralds')
      .eq('user_id', trade.sender_id)
      .single()

    const { data: freshReceiver } = await adminClient
      .from('profiles')
      .select('emeralds')
      .eq('user_id', trade.receiver_id)
      .single()

    if (!freshSender || !freshReceiver) {
      throw new Error('Failed to read balances')
    }

    const senderNewEmeralds = freshSender.emeralds - senderEmeralds + receiverEmeralds
    const receiverNewEmeralds = freshReceiver.emeralds - receiverEmeralds + senderEmeralds

    if (senderNewEmeralds < 0 || receiverNewEmeralds < 0) {
      throw new Error('Insufficient emerald balance during execution')
    }

    await adminClient
      .from('profiles')
      .update({ emeralds: senderNewEmeralds })
      .eq('user_id', trade.sender_id)

    await adminClient
      .from('profiles')
      .update({ emeralds: receiverNewEmeralds })
      .eq('user_id', trade.receiver_id)

    // Mark trade as accepted
    await adminClient
      .from('trades')
      .update({ status: 'accepted' })
      .eq('id', trade_id)

    return new Response(JSON.stringify({ success: true, status: 'accepted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
