import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const REGION = 'southamerica-east1' as const;

type StaffRole = 'admin' | 'medico' | 'recepcion' | 'laboratorio';
type CreateStaffPayload = { email: string; password: string; role: StaffRole };
type DeleteStaffPayload = { uid: string };

async function assertIsAdmin(callerUid: string): Promise<void> {
  const snap = await admin.firestore().doc(`users/${callerUid}`).get();
  const role = snap.exists ? (snap.data()!.role as StaffRole) : null;
  if (role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo admin.');
  }
}

// Cuando se crea el documento del paciente => setear claim "patient"
export const onPatientCreated = functions
  .region('southamerica-east1') // <- fijamos región
  .firestore
  .document('patients/{uid}')
  .onCreate(async (snap, ctx) => {
    const uid = ctx.params.uid as string
    try {
      await admin.auth().setCustomUserClaims(uid, { role: 'patient' })
      // opcional: marca cuándo se aplicó el claim
      await snap.ref.set({
        claimAppliedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
      console.log(`Custom claim 'patient' aplicado a ${uid}`)
    } catch (err) {
      console.error('No se pudo setear claim patient:', err)
    }
  })

// Si se borra el perfil del paciente, limpia el claim
export const onPatientDeleted = functions
  .region('southamerica-east1') // <- misma región
  .firestore
  .document('patients/{uid}')
  .onDelete(async (_, ctx) => {
    const uid = ctx.params.uid as string
    try {
      await admin.auth().setCustomUserClaims(uid, {}) // sin role
      console.log(`Custom claim removido para ${uid}`)
    } catch (err) {
      console.error('No se pudo limpiar claim:', err)
    }
  })

export const createStaffUser = functions
  .region(REGION)
  .https.onCall(
    async (
      data: CreateStaffPayload,
      context: functions.https.CallableContext
    ): Promise<{ uid: string }> => {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Inicia sesión.');
      }
      await assertIsAdmin(context.auth.uid);

      const { email, password, role } = data;
      if (!email || !password || !role) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'email, password y role son requeridos.'
        );
      }

      const u = await admin.auth().createUser({ email, password, disabled: false });

      await admin.firestore().doc(`users/${u.uid}`).set(
        {
          uid: u.uid,
          email,
          displayName: null,
          role,
          status: 'active',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: null,
        },
        { merge: true }
      );

      return { uid: u.uid };
    }
  );

export const deleteStaffUser = functions
  .region(REGION)
  .https.onCall(
    async (
      data: DeleteStaffPayload,
      context: functions.https.CallableContext
    ): Promise<{ ok: true }> => {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Inicia sesión.');
      }
      await assertIsAdmin(context.auth.uid);

      const { uid } = data;
      if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'uid requerido.');
      }

      await admin.auth().deleteUser(uid);
      await admin.firestore().doc(`users/${uid}`).delete();
      return { ok: true };
    }
  );