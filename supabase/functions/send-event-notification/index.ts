import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "npm:web-push@3.6.7";

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface EventPayload {
  eventId: string;
  title: string;
  date: string;
  time: string;
  description?: string;
  url?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Verify Authorization (Organizer or Service Role)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[send-event-notification] Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing Supabase credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Validate token and verify organizer privilege
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const isServiceRoleToken = token === supabaseServiceKey;

    if (!isServiceRoleToken) {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        // Also check if caller passed a valid backend API secret or Discord organizer token
        const internalApiSecret = Deno.env.get("DASHBOARD_INTERNAL_SECRET");
        if (!internalApiSecret || token !== internalApiSecret) {
          return new Response(
            JSON.stringify({ error: "Unauthorized: Caller is not an authenticated user" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Verify organizer role in members table
        const { data: memberData } = await supabaseAdmin
          .from("members")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        const role = memberData?.role || user.user_metadata?.role || "member";
        if (role !== "organizer" && role !== "admin") {
          return new Response(
            JSON.stringify({ error: "Forbidden: Only authorized event organizers can send notifications" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 2. Parse & Validate Payload
    const body: EventPayload = await req.json();
    const { eventId, title, date, time, description = "", url } = body;

    if (!title || !date || !time) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: title, date, and time are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Configure VAPID standard
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@cyberbot.community";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[send-event-notification] Missing VAPID keys in Edge Function secrets");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // 4. Fetch all active push subscriptions
    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth");

    if (dbError) {
      console.error("[send-event-notification] Database query error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to load push subscriptions", details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subs: PushSubscriptionRow[] = subscriptions || [];
    if (subs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          removed: 0,
          message: "No active push subscriptions found",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Construct notification payload per required standard
    const eventUrl = url || (eventId ? `/events/${eventId}` : "/");
    const notificationPayload = JSON.stringify({
      title: `🔔 New Event`,
      body: `${title}\n\n📅 ${date}\n⏰ ${time}${description ? `\n\n${description}` : ""}`,
      url: eventUrl,
      tag: `event-${eventId || Date.now()}`,
      data: {
        eventId,
        url: eventUrl,
        timestamp: Date.now(),
      },
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
    });

    let sentCount = 0;
    let failedCount = 0;
    let removedCount = 0;
    const expiredEndpoints: string[] = [];

    // 6. Send Web Push to all devices concurrently
    const pushPromises = subs.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, notificationPayload, {
          TTL: 86400, // 24 hours
          urgency: "high",
        });
        sentCount++;
      } catch (err: any) {
        const statusCode = err?.statusCode || err?.status;
        console.warn(`[send-event-notification] Push failed for ${sub.endpoint.slice(0, 35)}... status:`, statusCode);

        // Expired or invalid subscription: prune from database (RFC 8030 status 404 / 410 Gone)
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          failedCount++;
        }
      }
    });

    await Promise.allSettled(pushPromises);

    // 7. Prune expired subscriptions from database
    if (expiredEndpoints.length > 0) {
      const { error: deleteError, count } = await supabaseAdmin
        .from("push_subscriptions")
        .delete({ count: "exact" })
        .in("endpoint", expiredEndpoints);

      if (deleteError) {
        console.error("[send-event-notification] Error removing expired subscriptions:", deleteError);
      } else {
        removedCount = count || expiredEndpoints.length;
        console.log(`[send-event-notification] Pruned ${removedCount} expired subscription(s)`);
      }
    }

    // 8. Return comprehensive summary
    const responsePayload = {
      success: true,
      sent: sentCount,
      failed: failedCount,
      removed: removedCount,
      totalSubscriptions: subs.length,
    };

    console.log("[send-event-notification] Completed dispatch:", responsePayload);

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[send-event-notification] Unhandled exception:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
