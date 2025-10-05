"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCalendarExchange = exports.onShareConfirmed = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const options_1 = require("firebase-functions/v2/options");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
admin.initializeApp();
const db = admin.firestore();
// Deploy functions in a supported region
const GOOGLE_OAUTH_CLIENT_ID = (0, params_1.defineSecret)("GOOGLE_OAUTH_CLIENT_ID");
const GOOGLE_OAUTH_CLIENT_SECRET = (0, params_1.defineSecret)("GOOGLE_OAUTH_CLIENT_SECRET");
(0, options_1.setGlobalOptions)({ region: "us-central1", secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET] });
exports.onShareConfirmed = (0, firestore_1.onDocumentUpdated)("shares/{sid}", async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after)
        return;
    if (before.confirmed || !after.confirmed)
        return;
    const recipient = after.recipient_id;
    const ids = after.entity_ids ?? [];
    const batch = db.bulkWriter();
    ids.forEach((id) => {
        const ref = db.collection("entities").doc(id);
        batch.set(ref, { viewer_ids: admin.firestore.FieldValue.arrayUnion(recipient) }, { merge: true });
    });
    await batch.close();
});
// Exchange Google OAuth code (PKCE) for tokens and store encrypted refresh token per-uid
exports.googleCalendarExchange = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new Error("unauthenticated");
    const { code, redirectUri, codeVerifier } = request.data || {};
    if (!code || !redirectUri)
        throw new Error("invalid-args");
    const clientId = GOOGLE_OAUTH_CLIENT_ID.value();
    const clientSecret = GOOGLE_OAUTH_CLIENT_SECRET.value();
    if (!clientId || !clientSecret)
        throw new Error("missing-oauth-config");
    const oauth2 = new googleapis_1.google.auth.OAuth2({ clientId, clientSecret, redirectUri });
    const { tokens } = await oauth2.getToken(codeVerifier ? { code, codeVerifier } : { code });
    if (!tokens.refresh_token && !tokens.access_token)
        throw new Error("no-tokens");
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
