import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Deploy functions in a supported region
setGlobalOptions({ region: "us-central1" });

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


