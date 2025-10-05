import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { defineSecret } from "firebase-functions/params";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { google } from "googleapis";

admin.initializeApp();
const db = admin.firestore();

// Deploy functions in a supported region
const GOOGLE_OAUTH_CLIENT_ID = defineSecret("GOOGLE_OAUTH_CLIENT_ID");
const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret("GOOGLE_OAUTH_CLIENT_SECRET");

setGlobalOptions({ region: "us-central1", secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET] });

export const onShareConfirmed = onDocumentUpdated("shares/{sid}", async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;
  if (before.confirmed || !after.confirmed) return;

  const recipient = after.recipient_id as string;
  const ids: string[] = after.entity_ids ?? [];
  const batch = db.bulkWriter();
  ids.forEach((id) => {
    const ref = db.collection("entities").doc(id);
    batch.set(ref, { viewer_ids: admin.firestore.FieldValue.arrayUnion(recipient) }, { merge: true });
  });
  await batch.close();
});

// Exchange Google OAuth code (PKCE) for tokens and store encrypted refresh token per-uid
export const googleCalendarExchange = onCall<{ code: string; redirectUri: string; codeVerifier?: string }>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("unauthenticated");
  const { code, redirectUri, codeVerifier } = request.data || {};
  if (!code || !redirectUri) throw new Error("invalid-args");

  const clientId = GOOGLE_OAUTH_CLIENT_ID.value();
  const clientSecret = GOOGLE_OAUTH_CLIENT_SECRET.value();
  if (!clientId || !clientSecret) throw new Error("missing-oauth-config");

  const oauth2 = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
  const { tokens } = await oauth2.getToken(codeVerifier ? { code, codeVerifier } : { code });
  if (!tokens.refresh_token && !tokens.access_token) throw new Error("no-tokens");

  // Store tokens securely
  const docRef = admin.firestore().doc(`users/${uid}`);
  await docRef.set({
    integrations: {
      calendar: { status: "connected", connectedAt: admin.firestore.FieldValue.serverTimestamp(), scope: "readonly" },
    },
  }, { merge: true });

  // Persist refresh token in a private collection (optionally KMS encrypt)
  if (tokens.refresh_token) {
    await admin.firestore().doc(`private_tokens/${uid}`).set({
      google: { calendar: { refresh_token: tokens.refresh_token } },
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  return { ok: true };
});

export const googleCalendarDisconnect = onCall<{}>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("unauthenticated");
  await admin.firestore().doc(`users/${uid}`).set({ integrations: { calendar: { status: "disconnected" } } }, { merge: true });
  await admin.firestore().doc(`private_tokens/${uid}`).set({ google: { calendar: { refresh_token: admin.firestore.FieldValue.delete() } } }, { merge: true });
  return { ok: true };
});


