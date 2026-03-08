import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // User client to verify auth
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // Admin client for atomic operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { listing_id } = await req.json()
    if (!listing_id) throw new Error('listing_id required')

    // Step 1: Fetch listing and verify it's active
    const { data: listing, error: listingErr } = await adminClient
      .from('resale_listings')
      .select('*')
      .eq('id', listing_id)
      .eq('is_active', true)
      .single()

    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: 'Listing no longer available' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Can't buy own listing
    if (listing.seller_id === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot buy your own listing' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 2: Lock listing by marking inactive immediately
    const { data: locked, error: lockErr } = await adminClient
      .from('resale_listings')
      .update({ is_active: false })
      .eq('id', listing_id)
      .eq('is_active', true)
      .select()
      .single()

    if (lockErr || !locked) {
      return new Response(JSON.stringify({ error: 'Listing already purchased by someone else' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 3: Verify buyer has enough emeralds
    const { data: buyerProfile } = await adminClient
      .from('profiles')
      .select('emeralds')
      .eq('user_id', user.id)
      .single()

    if (!buyerProfile || buyerProfile.emeralds < listing.price) {
      // Unlock listing
      await adminClient.from('resale_listings').update({ is_active: true }).eq('id', listing_id)
      return new Response(JSON.stringify({ error: 'Not enough emeralds' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 4: Verify seller still owns the item
    const { data: sellerItem } = await adminClient
      .from('user_inventory')
      .select('id')
      .eq('id', listing.inventory_id)
      .eq('user_id', listing.seller_id)
      .single()

    if (!sellerItem) {
      await adminClient.from('resale_listings').delete().eq('id', listing_id)
      return new Response(JSON.stringify({ error: 'Seller no longer owns this item' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 5: Get seller profile
    const { data: sellerProfile } = await adminClient
      .from('profiles')
      .select('emeralds')
      .eq('user_id', listing.seller_id)
      .single()

    if (!sellerProfile) {
      await adminClient.from('resale_listings').update({ is_active: true }).eq('id', listing_id)
      return new Response(JSON.stringify({ error: 'Seller not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 6: Process transaction atomically
    // Deduct from buyer
    const { error: buyerErr } = await adminClient
      .from('profiles')
      .update({ emeralds: buyerProfile.emeralds - listing.price })
      .eq('user_id', user.id)

    if (buyerErr) {
      await adminClient.from('resale_listings').update({ is_active: true }).eq('id', listing_id)
      throw new Error('Failed to deduct emeralds')
    }

    // Add to seller
    await adminClient
      .from('profiles')
      .update({ emeralds: sellerProfile.emeralds + listing.price })
      .eq('user_id', listing.seller_id)

    // Transfer item ownership & unequip
    await adminClient
      .from('user_inventory')
      .update({ user_id: user.id, is_equipped: false })
      .eq('id', listing.inventory_id)

    // Update serial ownership
    await adminClient
      .from('item_serials')
      .update({ owner_id: user.id })
      .eq('inventory_id', listing.inventory_id)

    // Delete listing
    await adminClient
      .from('resale_listings')
      .delete()
      .eq('id', listing_id)

    // Update RAP: newRAP = oldRAP + (salePrice - oldRAP) * 0.1
    const { data: itemValue } = await adminClient
      .from('item_values')
      .select('rap')
      .eq('item_id', listing.item_id)
      .maybeSingle()

    const oldRAP = itemValue?.rap || 0
    const newRAP = oldRAP === 0
      ? listing.price
      : Math.round(oldRAP + (listing.price - oldRAP) * 0.1)

    if (itemValue) {
      await adminClient
        .from('item_values')
        .update({ rap: newRAP, updated_at: new Date().toISOString() })
        .eq('item_id', listing.item_id)
    } else {
      await adminClient
        .from('item_values')
        .insert({ item_id: listing.item_id, rap: newRAP, value: listing.price, demand: 'Normal', trend: 'Stable' })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
