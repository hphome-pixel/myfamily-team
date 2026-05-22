import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { familyId, excludeMember, title, body, type } = await request.json();
    if (!familyId || !title || !body) {
      return json({ error: "Missing familyId, title, or body" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@example.com";
    if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey) {
      return json({ error: "Missing Supabase or VAPID environment variables" }, 500);
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let query = supabase.from("push_subscriptions").select("id, member_name, subscription").eq("family_id", familyId);
    if (excludeMember) query = query.neq("member_name", excludeMember);
    const { data: subscriptions, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({
      title,
      body,
      type: type || "normal",
      url: "./",
    });

    const results = await Promise.allSettled(
      (subscriptions || []).map((item) =>
        webpush.sendNotification(item.subscription, payload).catch(async (pushError) => {
          if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", item.id);
          }
          throw pushError;
        }),
      ),
    );

    return json({
      sent: results.filter((result) => result.status === "fulfilled").length,
      failed: results.filter((result) => result.status === "rejected").length,
    });
  } catch (error) {
    return json({ error: error?.message || "Push send failed" }, 500);
  }
});

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
