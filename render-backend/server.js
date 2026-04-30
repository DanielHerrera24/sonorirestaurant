import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return value;
}

function createAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

createAdminApp();

const db = getFirestore();
const auth = getAuth();
const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origen no permitido por CORS."));
    },
  })
);
app.use(express.json({ limit: "100kb" }));

const phoneStatusLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas validaciones de teléfono. Intenta de nuevo en unos minutos.",
    code: "too-many-phone-checks",
  },
});

const linkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos de enlace. Intenta de nuevo en unos minutos.",
    code: "too-many-link-attempts",
  },
});

function normalizePhone(phone) {
  const rawValue = String(phone || "").trim();
  if (!rawValue.startsWith("+")) {
    return "";
  }

  return `+${rawValue.slice(1).replace(/\D/g, "")}`;
}

async function findClienteByPhone(phone) {
  const snapshot = await db
    .collection("clientes")
    .where("telefono", "==", phone)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, data: docSnap.data() };
}

async function generarUidUnico() {
  let existe = true;
  let uid = "";

  while (existe) {
    uid = Math.floor(10000000 + Math.random() * 90000000).toString();
    const snap = await db.collection("clientes").doc(uid).get();
    existe = snap.exists;
  }

  return uid;
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Falta el token de autenticación.", code: "missing-token" });
    return;
  }

  try {
    const token = header.slice("Bearer ".length);
    req.user = await auth.verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: "El token no es válido.", code: "invalid-token" });
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/clientes/phone-status", phoneStatusLimiter, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      res.status(400).json({ error: "Debes enviar un teléfono en formato internacional.", code: "invalid-phone" });
      return;
    }

    const cliente = await findClienteByPhone(phone);

    res.json({
      exists: Boolean(cliente),
      linked: Boolean(cliente?.data?.authUid),
      cliente: cliente
        ? {
            uid: cliente.id,
            nombre: cliente.data.nombre || "",
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/clientes/link-by-phone", linkLimiter, requireAuth, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const nombre = String(req.body?.nombre || "").trim();

    if (!phone) {
      res.status(400).json({ error: "Debes enviar un teléfono en formato internacional.", code: "invalid-phone" });
      return;
    }

    const cliente = await findClienteByPhone(phone);

    if (!cliente) {
      const uidPersonalizado = await generarUidUnico();

      await db.collection("clientes").doc(uidPersonalizado).set({
        nombre,
        telefono: phone,
        estrellas: 1,
        ultimaVisita: null,
        uid: uidPersonalizado,
        authUid: req.user.uid,
        recompensasCanjeadas: 0,
        creado: FieldValue.serverTimestamp(),
        verificado: true,
      });

      res.status(201).json({ created: true, linked: true, clienteId: uidPersonalizado });
      return;
    }

    if (cliente.data.authUid && cliente.data.authUid !== req.user.uid) {
      res.status(409).json({
        error: "Este teléfono ya está vinculado a otra cuenta.",
        code: "phone-already-linked",
      });
      return;
    }

    const updateData = {
      authUid: req.user.uid,
      telefono: phone,
      verificado: true,
      actualizado: FieldValue.serverTimestamp(),
    };

    if (!cliente.data.nombre && nombre) {
      updateData.nombre = nombre;
    }

    await db.collection("clientes").doc(cliente.id).set(updateData, { merge: true });

    res.json({ created: false, linked: true, clienteId: cliente.id });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error("Render backend error:", error);
  res.status(500).json({ error: "Error interno del servidor.", code: "internal-error" });
});

app.listen(port, () => {
  console.log(`Sonori Render backend escuchando en el puerto ${port}`);
});