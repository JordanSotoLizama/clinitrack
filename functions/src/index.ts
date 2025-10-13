import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const REGION = 'southamerica-east1' as const;

/* ======================= Tipos comunes ======================= */
type StaffRole = 'admin' | 'medico' | 'recepcion' | 'laboratorio';
type CreateStaffPayload = { email: string; password: string; role: StaffRole };
type DeleteStaffPayload = { uid: string };

type Weekday = '1' | '2' | '3' | '4' | '5' | '6' | '7';
type WeeklyBlock = { start: string; end: string };
type WeeklyTemplate = Partial<Record<Weekday, WeeklyBlock[]>>;

/* ======================= Helpers comunes ======================= */
async function assertIsAdmin(callerUid: string): Promise<void> {
  const snap = await db.doc(`users/${callerUid}`).get();
  const role = snap.exists ? (snap.data()!.role as StaffRole) : null;
  if (role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo admin.');
  }
}

/* ===== Helpers de fechas/zonas horarias (para generateSlots) ===== */
function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: any = {};
  for (const p of parts) map[p.type] = p.value;
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
  return (asUTC - date.getTime()) / 60000;
}

function toUTCFromLocalParts(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  tz: string
): Date {
  const pretendUTC = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const off = tzOffsetMinutes(pretendUTC, tz);
  return new Date(pretendUTC.getTime() - off * 60000);
}

// lunes=1 … domingo=7 en la zona horaria dada
function weekdayInTZ(dateUTC: Date, tz: string): Weekday {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(dateUTC);
  const map: any = { Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6', Sun: '7' };
  return map[wd] as Weekday;
}

/* =================== Triggers Pacientes (claims) =================== */
export const onPatientCreated = functions
  .region(REGION)
  .firestore.document('patients/{uid}')
  .onCreate(async (snap, ctx) => {
    const uid = ctx.params.uid as string;
    try {
      await admin.auth().setCustomUserClaims(uid, { role: 'patient' });
      await snap.ref.set(
        { claimAppliedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
      functions.logger.info(`Custom claim 'patient' aplicado`, { uid });
    } catch (err) {
      functions.logger.error('No se pudo setear claim patient', { uid, err });
    }
  });

export const onPatientDeleted = functions
  .region(REGION)
  .firestore.document('patients/{uid}')
  .onDelete(async (_, ctx) => {
    const uid = ctx.params.uid as string;
    try {
      await admin.auth().setCustomUserClaims(uid, {}); // sin role
      functions.logger.info(`Custom claim removido`, { uid });
    } catch (err) {
      functions.logger.error('No se pudo limpiar claim', { uid, err });
    }
  });

/* ========================= Staff (admin) ========================= */
export const createStaffUser = functions
  .region(REGION)
  .https.onCall(async (data: CreateStaffPayload, context): Promise<{ uid: string }> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Inicia sesión.');
    }
    await assertIsAdmin(context.auth.uid);

    const { email, password, role } = data || ({} as CreateStaffPayload);
    if (!email || !password || !role) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'email, password y role son requeridos.'
      );
    }

    const u = await admin.auth().createUser({ email, password, disabled: false });

    await db
      .doc(`users/${u.uid}`)
      .set(
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
  });

export const deleteStaffUser = functions
  .region(REGION)
  .https.onCall(async (data: DeleteStaffPayload, context): Promise<{ ok: true }> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Inicia sesión.');
    }
    await assertIsAdmin(context.auth.uid);

    const { uid } = data || ({} as DeleteStaffPayload);
    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'uid requerido.');
    }

    await admin.auth().deleteUser(uid);
    await db.doc(`users/${uid}`).delete();
    return { ok: true };
  });

/* ======================== createDoctor ======================== */
type CreateDoctorPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  specialty: string;
  defaultSlotMins?: number; // 15|20|30|45|60 (default 30)
  weeklyTemplate?: WeeklyTemplate; // si no viene, L–V 09-13/14-18
  phone?: string;
  room?: string;
};

function defaultTemplate(): WeeklyTemplate {
  return {
    '1': [
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '18:00' },
    ],
    '2': [
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '18:00' },
    ],
    '3': [
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '18:00' },
    ],
    '4': [
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '18:00' },
    ],
    '5': [
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '18:00' },
    ],
  };
}

function isValidHHMM(v?: string) {
  if (!v) return false;
  return /^\d{2}:\d{2}$/.test(v) && +v.slice(0, 2) < 24 && +v.slice(3, 5) < 60;
}

function validateTemplate(tpl: WeeklyTemplate) {
  const days: Weekday[] = ['1', '2', '3', '4', '5', '6', '7'];
  for (const d of days) {
    const blocks = tpl[d];
    if (!blocks) continue;
    for (const b of blocks) {
      if (!isValidHHMM(b.start) || !isValidHHMM(b.end)) {
        throw new functions.https.HttpsError('invalid-argument', `Horario inválido en día ${d}`);
      }
    }
  }
}

export const createDoctor = functions.region(REGION).https.onCall(
  async (data: CreateDoctorPayload, context): Promise<{ ok: true; uid: string }> => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Inicia sesión.');
    }
    await assertIsAdmin(context.auth.uid);

    const {
      email,
      password,
      firstName,
      lastName,
      specialty,
      defaultSlotMins = 30,
      weeklyTemplate,
      phone,
      room,
    } = data || ({} as CreateDoctorPayload);

    if (!email || !password || !firstName || !lastName || !specialty) {
      throw new functions.https.HttpsError('invalid-argument', 'Faltan campos obligatorios.');
    }
    if (![15, 20, 30, 45, 60].includes(defaultSlotMins)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'defaultSlotMins debe ser 15|20|30|45|60.'
      );
    }

    const tpl = weeklyTemplate ?? defaultTemplate();
    validateTemplate(tpl);

    const authUser = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false,
      disabled: false,
    });
    await admin.auth().setCustomUserClaims(authUser.uid, { role: 'medico' });

    const profile = {
      uid: authUser.uid,
      role: 'medico',
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      specialty,
      defaultSlotMins,
      weeklyTemplate: tpl,
      phone: phone ?? null,
      room: room ?? null,
      tz: 'America/Santiago',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.doc(`users/${authUser.uid}`).set(profile, { merge: true });

    functions.logger.info('Médico creado', { doctorUid: authUser.uid, by: context.auth.uid });
    return { ok: true, uid: authUser.uid };
  }
);

/* ======================== generateSlots ======================== */
type GenerateSlotsPayload = {
  doctorUid?: string;
  fromDateISO: string; // "YYYY-MM-DD"
  toDateISO: string; // "YYYY-MM-DD"
  slotMins?: number;
};

export const generateSlots = functions.region(REGION).https.onCall(
  async (data: GenerateSlotsPayload, context): Promise<{ ok: true; created: number }> => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Inicia sesión.');
    }

    const callerUid = context.auth.uid;
    const { doctorUid = callerUid, fromDateISO, toDateISO, slotMins } = data || ({} as any);
    if (!fromDateISO || !toDateISO) {
      throw new functions.https.HttpsError('invalid-argument', 'fromDateISO y toDateISO son requeridos.');
    }

    // permisos: admin puede todo; médico solo para sí mismo
    const callerSnap = await db.doc(`users/${callerUid}`).get();
    const callerRole = (callerSnap.get('role') as StaffRole) || null;
    if (!(callerRole === 'admin' || (callerRole === 'medico' && doctorUid === callerUid))) {
      throw new functions.https.HttpsError('permission-denied', 'No autorizado.');
    }

    // perfil del médico
    const docSnap = await db.doc(`users/${doctorUid}`).get();
    if (!docSnap.exists || docSnap.get('role') !== 'medico') {
      throw new functions.https.HttpsError('failed-precondition', 'doctorUid inválido.');
    }
    const tz = (docSnap.get('tz') as string) || 'America/Santiago';
    const defaultSlotMins = slotMins || (docSnap.get('defaultSlotMins') as number) || 30;
    const weeklyTemplate = (docSnap.get('weeklyTemplate') || {}) as WeeklyTemplate;

    const doctorFullName = (docSnap.get('fullName') as string) ?? null;
    const doctorSpecialty = (docSnap.get('specialty') as string) ?? 'General';

    // normalizamos fechas (YYYY-MM-DD)
    const parseYMD = (s: string) => {
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return null;
      return { y: +m[1], mo: +m[2], d: +m[3] };
    };
    const fromParts = parseYMD(fromDateISO);
    const toParts = parseYMD(toDateISO);
    if (!fromParts || !toParts) {
      throw new functions.https.HttpsError('invalid-argument', 'Usa formato YYYY-MM-DD para el rango.');
    }

    const startUTC = new Date(Date.UTC(fromParts.y, fromParts.mo - 1, fromParts.d, 0, 0, 0));
    const endUTC = new Date(Date.UTC(toParts.y, toParts.mo - 1, toParts.d, 23, 59, 59));
    const now = new Date();

    let batch = db.batch();
    let count = 0;
    const commitChunk = async () => {
      await batch.commit();
      batch = db.batch();
    };

    for (let cur = new Date(startUTC); cur <= endUTC; cur.setUTCDate(cur.getUTCDate() + 1)) {
      const dayKey = weekdayInTZ(cur, tz);
      const blocks = (weeklyTemplate as any)[dayKey] as WeeklyBlock[] | undefined;
      if (!blocks?.length) continue;

      const dtf = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const [localY, localM, localD] = dtf.format(cur).split('-').map((n) => +n);

      for (const b of blocks) {
        const [sh, sm] = b.start.split(':').map(Number);
        const [eh, em] = b.end.split(':').map(Number);
        let minutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        while (minutes + defaultSlotMins <= endMinutes) {
          const sH = Math.floor(minutes / 60), sM = minutes % 60;
          const eTotal = minutes + defaultSlotMins;
          const eH = Math.floor(eTotal / 60), eM = eTotal % 60;

          const start = toUTCFromLocalParts(localY, localM, localD, sH, sM, tz);
          const end = toUTCFromLocalParts(localY, localM, localD, eH, eM, tz);

          if (end <= now) {
            minutes += defaultSlotMins;
            continue;
          }

          const slotId = `${doctorUid}_${start.toISOString()}`;
          const ref = db.doc(`doctor_slots/${slotId}`);
          batch.set(
            ref,
            {
              doctorUid,
              doctorName: doctorFullName,
              specialty: doctorSpecialty,
              dateISO: start.toISOString(),
              endISO: end.toISOString(),
              status: 'open',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          count++;
          minutes += defaultSlotMins;

          if (count % 450 === 0) await commitChunk();
        }
      }
    }

    if (count % 450 !== 0) await commitChunk();
    functions.logger.info('generateSlots', { doctorUid, created: count });
    return { ok: true, created: count };
  }
);

// ========================= bookSlot =========================
type BookSlotPayload = { slotId: string };

export const bookSlot = functions
  .region(REGION)
  .https.onCall(
    async (data: BookSlotPayload, context): Promise<{ ok: true; appointmentId: string }> => {
      if (!context.auth?.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Inicia sesión.');
      }
      const uid = context.auth.uid;

      const slotId = data?.slotId;
      if (!slotId) {
        throw new functions.https.HttpsError('invalid-argument', 'slotId requerido.');
      }

      const slotRef = db.doc(`doctor_slots/${slotId}`);
      const apptId = `${slotId}_${uid}`;
      const apptRef = db.doc(`appointments/${apptId}`);

      // Leer nombre del paciente (con fallback a tus campos reales)
      const patSnap = await db.doc(`patients/${uid}`).get();
      let patientName: string | null = null;
      if (patSnap.exists) {
        const p = patSnap.data() as any;
        patientName = [
          p?.fullName,
          [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim(),
          [p?.nombres, p?.apellidoPaterno, p?.apellidoMaterno].filter(Boolean).join(' ').trim(),
        ].find((s: string) => s && s.length) || null;
      }

      await db.runTransaction(async (tx) => {
        // --- validar slot ---
        const slotSnap = await tx.get(slotRef);
        if (!slotSnap.exists) throw new functions.https.HttpsError('not-found', 'slot-not-found');
        const slot = slotSnap.data() as any;

        if (slot.status !== 'open') {
          throw new functions.https.HttpsError('failed-precondition', 'slot-not-open');
        }

        const startISO = slot.dateISO as string | undefined;
        if (!startISO) throw new functions.https.HttpsError('failed-precondition', 'slot-without-date');

        const start = new Date(startISO);
        if (start.getTime() - Date.now() < 2 * 60 * 60 * 1000) {
          throw new functions.https.HttpsError('failed-precondition', 'lead-time-too-short');
        }

        // --- validar appointment previo ---
        const apptSnap = await tx.get(apptRef);
        if (apptSnap.exists) {
          const prev = apptSnap.data() as any;
          if (prev.status !== 'cancelled') {
            throw new functions.https.HttpsError('already-exists', 'appointment-already-exists');
          }
          if (prev.rebookBan === undefined || prev.rebookBan === true) {
            throw new functions.https.HttpsError('failed-precondition', 'rebook-not-allowed');
          }
        }

        // 1) Slot -> requested
        tx.update(slotRef, {
          status: 'requested',
          patientUid: uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2) Appointment -> requested (con patientName completo)
        tx.set(
          apptRef,
          {
            uid,
            patientUid: uid,
            patientName,
            doctorUid: slot.doctorUid,
            slotId,
            specialty: slot.specialty ?? 'General',
            dateISO: startISO,
            status: 'requested',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: false }
        );
      });

      functions.logger.info('bookSlot', { slotId, by: uid, appointmentId: apptId });
      return { ok: true, appointmentId: apptId };
    }
  );

// ============ Pagos: confirmar cita al crear/actualizar a 'approved' ============
async function confirmFromPayment(paymentId: string, data: any) {
  const provider   = data?.provider;
  const status     = data?.status;                 // "approved"
  const rawApptId  = (data?.appointmentId ?? '').trim();
  const payerUid   = data?.uid as string | undefined;

  functions.logger.info('[payments] in', { paymentId, provider, status, rawApptId, payerUid });

  if (provider && provider !== 'paypal') return;
  if (status !== 'approved') return;
  if (!rawApptId) {
    functions.logger.error('[payments] missing appointmentId', { paymentId });
    return;
  }

  // 1) Intento directo por ID exacto
  let apptRef = db.doc(`appointments/${rawApptId}`);
  let apptSnap = await apptRef.get();

  // 2) Fallback: buscar por slotId + patientUid (por si el ID no calza 100%)
  if (!apptSnap.exists && payerUid) {
    const slotId = rawApptId.split('_').slice(0, -1).join('_');
    const q = await db.collection('appointments')
      .where('slotId', '==', slotId)
      .where('patientUid', '==', payerUid)
      .limit(1)
      .get();
    if (!q.empty) {
      apptRef  = q.docs[0].ref;
      apptSnap = q.docs[0];
      functions.logger.warn('[payments] fallback matched by slotId+patient', { paymentId, apptId: apptRef.id });
    }
  }

  if (!apptSnap.exists) {
    functions.logger.error('[payments] appointment not found', { rawApptId, paymentId });
    return;
  }

  // Prepara patientName si faltara (fuera de la txn)
  let patientName: string | null = apptSnap.get('patientName') ?? null;
  const apptPatientUid: string | undefined = apptSnap.get('patientUid');
  if (!patientName && apptPatientUid) {
    const ps = await db.doc(`patients/${apptPatientUid}`).get();
    if (ps.exists) {
      const p: any = ps.data()!;
      patientName = [
        p?.fullName,
        [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim(),
        [p?.nombres, p?.apellidoPaterno, p?.apellidoMaterno].filter(Boolean).join(' ').trim(),
      ].find((s: string) => s && s.length) || null;
    }
  }

  await db.runTransaction(async (tx) => {
    // --- TODAS LAS LECTURAS ANTES DE ESCRIBIR ---
    const freshApptSnap = await tx.get(apptRef);
    if (!freshApptSnap.exists) return;
    const freshAppt = freshApptSnap.data() as any;

    const derivedSlotId = freshAppt.slotId || rawApptId.split('_').slice(0, -1).join('_') || null;

    let slotRef: FirebaseFirestore.DocumentReference | null = null;
    let slotSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    if (derivedSlotId) {
      slotRef = db.doc(`doctor_slots/${derivedSlotId}`);
      slotSnap = await tx.get(slotRef);
    }

    // --- ESCRITURAS ---
    const apptUpdates: any = {
      status: freshAppt.status === 'cancelled' ? 'cancelled' : 'confirmed',
      paid: true,
      paymentStatus: 'approved',
      paidBy: payerUid ?? freshAppt.paidBy ?? null,
      paymentId,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // limpia flags de reembolso si hubiera
      refundRequested: admin.firestore.FieldValue.delete(),
      refundStatus: admin.firestore.FieldValue.delete(),
    };
    if (patientName && !freshAppt.patientName) apptUpdates.patientName = patientName;

    tx.set(apptRef, apptUpdates, { merge: true });

    if (slotRef && slotSnap?.exists) {
      const slot = slotSnap.data() as any;
      const stillHeld = slot.status === 'requested' || slot.status === 'reserved';
      const sameUser  = payerUid ? slot.patientUid === payerUid : true;
      if (stillHeld && sameUser) {
        tx.update(slotRef, {
          status: 'booked',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  });

  functions.logger.info('[payments] confirmed', { paymentId, apptId: apptRef.id });
}

export const onPaymentCreated = functions
  .region(REGION)
  .firestore.document('payments/{paymentId}')
  .onCreate(async (snap, ctx) => {
    await confirmFromPayment(ctx.params.paymentId, snap.data());
  });

export const onPaymentStatusApproved = functions
  .region(REGION)
  .firestore.document('payments/{paymentId}')
  .onUpdate(async (change, ctx) => {
    const before = change.before.data() as any;
    const after  = change.after.data()  as any;
    if (before?.status !== 'approved' && after?.status === 'approved') {
      await confirmFromPayment(ctx.params.paymentId, after);
    }
  });

/* ====================== cancelMyAppointment ====================== */
type CancelPayload = { appointmentId: string };

export const cancelMyAppointment = functions
  .region(REGION)
  .https.onCall(async (data: CancelPayload, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Inicia sesión.');
    }
    const uid = context.auth.uid;
    const { appointmentId } = data || ({} as CancelPayload);
    if (!appointmentId) {
      throw new functions.https.HttpsError('invalid-argument', 'appointmentId requerido.');
    }

    // ¿Existen pagos aprobados para esa cita de este usuario?
    const paymentsSnap = await db
      .collection('payments')
      .where('appointmentId', '==', appointmentId)
      .where('uid', '==', uid)
      .where('status', '==', 'approved')
      .limit(1)
      .get();
    const hasApprovedPayment = !paymentsSnap.empty;

    const apptRef = db.doc(`appointments/${appointmentId}`);

    await db.runTransaction(async (tx) => {
      const apptSnap = await tx.get(apptRef);
      if (!apptSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'appointment-not-found');
      }
      const appt = apptSnap.data() as any;

      if (appt.patientUid !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'not-your-appointment');
      }

      if (['cancelled', 'completed'].includes(appt.status)) {
        return; // idempotente
      }

      // liberar slot si aplicaba
      const slotRef = db.doc(`doctor_slots/${appt.slotId}`);
      const slotSnap = await tx.get(slotRef);
      if (slotSnap.exists) {
        const slot = slotSnap.data() as any;
        if (slot.patientUid === uid && slot.status !== 'booked') {
          tx.update(slotRef, {
            status: 'open',
            patientUid: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // ¿Estaba pagada?
      const wasPaid =
        appt.status === 'confirmed' || appt.status === 'paid' || !!appt.paidBy || hasApprovedPayment;

      const baseUpdate: any = {
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (wasPaid) {
        baseUpdate.refundRequested = true;
        baseUpdate.refundStatus = 'pending';
      }

      tx.update(apptRef, baseUpdate);
    });

    return { ok: true };
  });