// ══════════════════════════════════════════════════════════════════
// 🔔 Cloud Function — Notificar al apoderado cuando se registra
//    la asistencia de su hijo/a (presente / tardanza / ausente)
// ══════════════════════════════════════════════════════════════════
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: 'us-central1' });

exports.notificarAsistencia = onDocumentCreated('asistencia/{asistId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  const { estudianteId, nombre, grado, seccion, estado, hora, fecha } = data || {};
  if (!estudianteId || !estado) return;

  try {
    const estDoc = await db.collection('estudiantes').doc(estudianteId).get();
    if (!estDoc.exists) return;
    const dniPadre = estDoc.data().dniPadre;
    if (!dniPadre) return;

    const tokensSnap = await db.collection('fcmTokens').where('dniPadre', '==', dniPadre).get();
    if (tokensSnap.empty) return;
    // FIX-NOTIF-DUP-2: el token vive en el campo 'token' (esquema nuevo con ID
    // de dispositivo); d.id queda como respaldo para documentos antiguos.
    const tokens = tokensSnap.docs.map(d => d.data().token || d.id);

    const nombreAlumno = nombre || 'Su hijo/a';
    const gradoSeccion = grado && seccion ? ` (${grado}°${seccion})` : '';
    const mensajes = {
      puntual:  { titulo: '🏫 COLEGIO SAN JOSÉ OBRERO', cuerpo: `${nombreAlumno}${gradoSeccion} llegó PUNTUAL hoy a las ${hora || ''}.` },
      tardanza: { titulo: '🏫 COLEGIO SAN JOSÉ OBRERO', cuerpo: `${nombreAlumno}${gradoSeccion} llegó TARDE hoy a las ${hora || ''}.` },
      ausente:  { titulo: '🏫 COLEGIO SAN JOSÉ OBRERO', cuerpo: `${nombreAlumno}${gradoSeccion} NO asistió a clases el día ${fecha || ''}.` }
    };
    const m = mensajes[estado];
    if (!m) return;

    const resp = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        titulo: m.titulo,
        cuerpo: m.cuerpo,
        estudianteId,
        estado,
        fecha: fecha || '',
        tipo: 'asistencia'
      }
    });

    const tokensInvalidos = [];
    resp.responses.forEach((r, i) => {
      if (!r.success) {
        const codigo = r.error?.code || '';
        if (codigo === 'messaging/registration-token-not-registered' || codigo === 'messaging/invalid-registration-token') {
          tokensInvalidos.push(tokensSnap.docs[i].ref);
        }
      }
    });
    if (tokensInvalidos.length) {
      await Promise.all(tokensInvalidos.map(ref => ref.delete()));
    }

    console.log(`🔔 Notificación enviada a ${resp.successCount}/${tokens.length} dispositivo(s) — DNI ${dniPadre} — ${estado}`);
  } catch (err) {
    console.error('Error al notificar asistencia:', err);
  }
});

// ══════════════════════════════════════════════════════════════════
// 🔔 Cloud Function — Notificar al apoderado cuando se registra
//    la SALIDA de su hijo/a del colegio
// ══════════════════════════════════════════════════════════════════
exports.notificarSalida = onDocumentCreated('salidas/{salidaId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  const { estudianteId, nombre, grado, seccion, hora } = data || {};
  if (!estudianteId) return;

  try {
    const estDoc = await db.collection('estudiantes').doc(estudianteId).get();
    if (!estDoc.exists) return;
    const dniPadre = estDoc.data().dniPadre;
    if (!dniPadre) return;

    const tokensSnap = await db.collection('fcmTokens').where('dniPadre', '==', dniPadre).get();
    if (tokensSnap.empty) return;
    // FIX-NOTIF-DUP-2: el token vive en el campo 'token' (esquema nuevo con ID
    // de dispositivo); d.id queda como respaldo para documentos antiguos.
    const tokens = tokensSnap.docs.map(d => d.data().token || d.id);

    const nombreAlumno = nombre || 'Su hijo/a';
    const gradoSeccion = grado && seccion ? ` (${grado}°${seccion})` : '';
    const titulo = '🏫 COLEGIO SAN JOSÉ OBRERO';
    const cuerpo = `${nombreAlumno}${gradoSeccion} salió del colegio hoy a las ${hora || ''}.`;

    const resp = await admin.messaging().sendEachForMulticast({
      tokens,
      data: { titulo, cuerpo, estudianteId, tipo: 'salida' }
    });

    const tokensInvalidos = [];
    resp.responses.forEach((r, i) => {
      if (!r.success) {
        const codigo = r.error?.code || '';
        if (codigo === 'messaging/registration-token-not-registered' || codigo === 'messaging/invalid-registration-token') {
          tokensInvalidos.push(tokensSnap.docs[i].ref);
        }
      }
    });
    if (tokensInvalidos.length) {
      await Promise.all(tokensInvalidos.map(ref => ref.delete()));
    }

    console.log(`🔔 Notificación de SALIDA enviada a ${resp.successCount}/${tokens.length} dispositivo(s) — DNI ${dniPadre}`);
  } catch (err) {
    console.error('Error al notificar salida:', err);
  }
});
