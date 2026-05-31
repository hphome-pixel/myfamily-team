import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const defaultAllowedHeaders = "authorization, x-client-info, apikey, content-type";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": defaultAllowedHeaders,
  "Access-Control-Max-Age": "86400",
};

const firebaseScope = "https://www.googleapis.com/auth/firebase.messaging";
const firebaseTokenUrl = "https://oauth2.googleapis.com/token";

let cachedFirebaseToken: { value: string; expiresAt: number } | null = null;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": request.headers.get("access-control-request-method") || "POST, OPTIONS",
        "Access-Control-Allow-Headers": request.headers.get("access-control-request-headers") || defaultAllowedHeaders,
      },
    });
  }

  try {
    const {
      familyId,
      excludeMember,
      excludeMemberId,
      targetMemberIds,
      targetMemberNames,
      title,
      body,
      type,
    } = await request.json();
    if (!familyId || !title || !body) {
      return json({ error: "Missing familyId, title, or body" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@example.com";
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Missing Supabase environment variables" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const targetIds = new Set((targetMemberIds || []).filter(Boolean).map(String));
    const targetNames = new Set((targetMemberNames || []).filter(Boolean).map(String));
    const hasTargets = targetIds.size > 0 || targetNames.size > 0;
    const shouldSendTo = (item: { member_id?: string | null; member_name?: string | null }) => {
      const memberId = item.member_id ? String(item.member_id) : "";
      const memberName = item.member_name ? String(item.member_name) : "";
      if (excludeMemberId && memberId && memberId === String(excludeMemberId)) return false;
      if (excludeMember && memberName && memberName === String(excludeMember)) return false;
      if (!hasTargets) return true;
      return (memberId && targetIds.has(memberId)) || (memberName && targetNames.has(memberName));
    };

    const webPayload = JSON.stringify({
      title,
      body,
      type: type || "normal",
      url: "./",
    });

    let webSent = 0;
    let webFailed = 0;
    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("id, member_name, member_id, subscription")
        .eq("family_id", familyId);
      if (error) throw error;

      const webResults = await Promise.allSettled(
        (subscriptions || []).filter(shouldSendTo).map((item) =>
          webpush.sendNotification(item.subscription, webPayload).catch(async (pushError) => {
            if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", item.id);
            }
            throw pushError;
          }),
        ),
      );
      webSent = webResults.filter((result) => result.status === "fulfilled").length;
      webFailed = webResults.filter((result) => result.status === "rejected").length;
    }

    const { data: nativeTokens, error: nativeError } = await supabase
      .from("native_push_tokens")
      .select("id, member_name, member_id, platform, token")
      .eq("family_id", familyId)
      .eq("enabled", true);
    if (nativeError && !isMissingTableError(nativeError)) throw nativeError;

    let nativeSent = 0;
    let nativeFailed = 0;
    let nativeSkipped = 0;
    const firebaseConfig = getFirebaseConfig();
    const nativeTargets = (nativeTokens || []).filter(shouldSendTo);
    if (nativeTargets.length && firebaseConfig) {
      const accessToken = await firebaseAccessToken(firebaseConfig);
      const nativeResults = await Promise.allSettled(
        nativeTargets.map((item) =>
          sendFcmMessage(firebaseConfig.projectId, accessToken, item.token, {
            title,
            body,
            type: type || "normal",
          }).catch(async (pushError) => {
            if (isExpiredFcmTokenError(pushError)) {
              await supabase.from("native_push_tokens").delete().eq("id", item.id);
            }
            throw pushError;
          }),
        ),
      );
      nativeSent = nativeResults.filter((result) => result.status === "fulfilled").length;
      nativeFailed = nativeResults.filter((result) => result.status === "rejected").length;
    } else {
      nativeSkipped = nativeTargets.length;
    }

    const summary = {
      sent: webSent + nativeSent,
      failed: webFailed + nativeFailed,
      webSent,
      webFailed,
      nativeSent,
      nativeFailed,
      nativeSkipped,
      hasTargets,
      targetMemberIds: [...targetIds],
      targetMemberNames: [...targetNames],
      excludedMember: excludeMember || excludeMemberId || null,
    };
    console.info("push summary", summary);
    return json(summary);
  } catch (error) {
    console.error("push send failed", error);
    return json({ error: error?.message || "Push send failed" }, 500);
  }
});

function getFirebaseConfig() {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    };
  }

  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

async function firebaseAccessToken(config: { clientEmail: string; privateKey: string }) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedFirebaseToken && cachedFirebaseToken.expiresAt - 60 > now) return cachedFirebaseToken.value;

  const jwt = await signJwt(
    {
      alg: "RS256",
      typ: "JWT",
    },
    {
      iss: config.clientEmail,
      scope: firebaseScope,
      aud: firebaseTokenUrl,
      iat: now,
      exp: now + 3600,
    },
    config.privateKey,
  );

  const response = await fetch(firebaseTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error_description || value.error || "Firebase auth failed");

  cachedFirebaseToken = {
    value: value.access_token,
    expiresAt: now + Number(value.expires_in || 3600),
  };
  return cachedFirebaseToken.value;
}

async function sendFcmMessage(
  projectId: string,
  accessToken: string,
  token: string,
  payload: { title: string; body: string; type: string },
) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          title: payload.title,
          body: payload.body,
          type: payload.type,
          url: "./",
        },
        android: {
          priority: "high",
          notification: {
            channel_id: "default",
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      },
    }),
  });

  if (response.ok) return response.json();
  const detail = await response.text();
  throw new FcmSendError(response.status, detail);
}

async function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, privateKeyPem: string) {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function importPrivateKey(privateKeyPem: string) {
  const pemBody = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function base64UrlEncode(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

class FcmSendError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`FCM send failed (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

function isExpiredFcmTokenError(error: unknown) {
  if (!(error instanceof FcmSendError)) return false;
  return (
    error.status === 404 ||
    error.detail.includes("UNREGISTERED") ||
    error.detail.includes("NOT_FOUND") ||
    error.detail.includes("registration-token-not-registered")
  );
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.message?.includes("native_push_tokens");
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
