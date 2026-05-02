import { useState, useEffect } from "react";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  collection,
} from "firebase/firestore";
import { toast } from "react-toastify";
import MX from "../assets/flags/mx.png";
import US from "../assets/flags/us.png";

const PREFIJOS = {
  mx: "+52",
  us: "+1",
};

export default function PhoneAuthForm({
  modo = "login",
  onSuccess,
  checkPhone,
  onVerified,
}) {
  // Nuevo estado para país y número local
  const [pais, setPais] = useState("mx"); // "mx" o "us"
  const [numeroLocal, setNumeroLocal] = useState("");
  const [phone, setPhone] = useState("+52"); // se sigue usando internamente
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [nombre, setNombre] = useState("");

  // Actualiza phone cada vez que cambian país o número local
  useEffect(() => {
    setPhone(PREFIJOS[pais] + numeroLocal.replace(/\D/g, ""));
  }, [pais, numeroLocal]);

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      const recaptchaContainer = document.getElementById("recaptcha-container");
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = "";
      }
    };
  }, []);

  const getRecaptchaVerifier = async () => {
    if (window.recaptchaVerifier) {
      return window.recaptchaVerifier;
    }

    const recaptchaContainer = document.getElementById("recaptcha-container");
    if (!recaptchaContainer) {
      throw new Error("No se encontró el contenedor de reCAPTCHA.");
    }

    recaptchaContainer.innerHTML = "";

    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });

    await verifier.render();
    window.recaptchaVerifier = verifier;
    return verifier;
  };

  const generarUidUnico = async () => {
    let uid,
      existe = true;
    while (existe) {
      uid = Math.floor(10000000 + Math.random() * 90000000).toString();
      const ref = doc(db, "clientes", uid);
      const snap = await getDoc(ref);
      existe = snap.exists();
    }
    return uid;
  };

  // sendCode ahora acepta evento opcional
  const sendCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      setError(
        "Por favor ingresa el número en formato internacional, por ejemplo: +526531301155"
      );
      toast.error(
        "Por favor ingresa el número en formato internacional, por ejemplo: +526531301155"
      );
      return;
    }
    setLoading(true);
    setLoadingMessage("Enviando código por SMS...");
    try {
      const recaptchaVerifier = await getRecaptchaVerifier();
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifier
      );
      setConfirmation(confirmationResult);
      toast.success("Código enviado por SMS");
    } catch (error) {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      const recaptchaContainer = document.getElementById("recaptcha-container");
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = "";
      }

      setError(error.message);
      if (error.code === "auth/too-many-requests") {
        toast.error(
          "Demasiados intentos. Espera unos minutos antes de volver a intentarlo."
        );
      } else {
        toast.error("Error al enviar el código");
      }
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // handleStart usa checkPhone antes de enviar el SMS
  const handleStart = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    if (checkPhone) {
      setLoading(true);
      setLoadingMessage("Validando número...");
      try {
        const res = await checkPhone(phone.trim());
        if (!res.exists) {
          // número nuevo: pedir nombre antes de enviar SMS
          setNeedsName(true);
          return;
        }
      } catch (err) {
        console.error("checkPhone error:", err);
        if (err.code !== "permission-denied") {
          setError(err.message || "Error al comprobar número");
        }
        return;
      } finally {
        setLoading(false);
        setLoadingMessage("");
      }
    }
    // si existe o no se pasó checkPhone, continuar y enviar SMS
    await sendCode();
  };

  const handleSendAfterName = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!nombreNuevo || nombreNuevo.trim().length === 0) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    // ahora sí enviar SMS
    await sendCode();
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setLoadingMessage("Verificando código...");
    try {
      const result = await confirmation.confirm(code);
      const user = result.user;
      const formattedPhone = phone.trim();

      // Si el padre proporcionó onVerified, delegar creación/vinculación allí
      if (onVerified) {
        const res = await onVerified(
          formattedPhone,
          needsName ? nombreNuevo : nombre
        );
        if (res?.error || res?.linked === false) {
          const message =
            res?.error?.code === "permission-denied"
              ? "Se verificó el número, pero no fue posible vincular tu tarjeta con Firestore. Revisa las reglas de clientes."
              : res?.error?.message ||
                "No fue posible terminar el acceso con este número.";
          toast.error(message);
          setError(message);
          setLoading(false);
          return;
        }
        // Si onVerified indicó que se creó un usuario nuevo, mostramos welcome (no redirigir)
        if (res && res.created) {
          toast.success(
            modo === "register"
              ? "Registro completado"
              : "Inicio de sesión exitoso"
          );
          // onSuccess NO se llama para permitir que el padre muestre showWelcome
          setLoading(false);
          return;
        }
        // Si NO se creó usuario nuevo, proceder con onSuccess (redirigir)
        toast.success(
          modo === "register"
            ? "Registro completado"
            : "Inicio de sesión exitoso"
        );
        if (onSuccess) onSuccess();
        setLoading(false);
        return;
      }

      // Si no hay onVerified, mantener lógica local (crear o vincular cliente)
      const clientesRef = collection(db, "clientes");
      const q = query(clientesRef, where("telefono", "==", formattedPhone));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const clienteId = docSnap.id;
        const clienteData = docSnap.data();
        if (!clienteData.authUid || clienteData.authUid !== user.uid) {
          await updateDoc(doc(db, "clientes", clienteId), {
            authUid: user.uid,
            verificado: true,
          });
          toast.success("Cuenta vinculada con éxito");
        } else {
          toast.info("Cuenta ya vinculada");
        }
      } else {
        const uidPersonalizado = await generarUidUnico();
        await setDoc(doc(db, "clientes", uidPersonalizado), {
          nombre: needsName ? nombreNuevo : nombre,
          telefono: formattedPhone,
          ultimaVisita: null,
          uid: uidPersonalizado,
          authUid: user.uid,
          recompensasCanjeadas: 0,
          creado: serverTimestamp(),
          verificado: true,
        });
        toast.success("Cuenta creada y vinculada");
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("verifyCode error:", error);
      if (error.code === "auth/too-many-requests") {
        toast.error("Demasiados intentos, espera unos minutos.");
      } else {
        toast.error(error.message || "Error al verificar código");
      }
      setError(error.message || "Código incorrecto");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="relative flex flex-col items-center w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/70 backdrop-blur-sm">
          <div className="h-12 w-12 rounded-full border-4 border-[var(--color-principal)] border-t-transparent animate-spin"></div>
          <p className="text-center text-lg uppercase tracking-wide text-[var(--color-principal)]">
            {loadingMessage || "Procesando..."}
          </p>
        </div>
      )}
      {!confirmation ? (
        <form
          onSubmit={needsName ? handleSendAfterName : handleStart}
          className="flex flex-col gap-4 w-full"
        >
          {modo === "register" && (
            <div className="flex flex-col w-full">
              <label className="text-xl uppercase font-medium text-gray-100 mb-1 ml-1">
                Nombre
              </label>
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={loading}
                className="w-full text-xl px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-principalClaro)]"
              />
            </div>
          )}
          <div className="flex flex-col w-full">
            <label className="text-xl uppercase font-medium text-gray-100 mb-1 ml-1">
              Número de teléfono
            </label>
            <div className="flex gap-1 items-center">
              {/* Bandera dinámica */}
              <span>
                {pais === "mx" ? (
                  <img
                    src={MX}
                    alt="México"
                    style={{ width: 80, display: "inline" }}
                  />
                ) : (
                  <img
                    src={US}
                    alt="Estados Unidos"
                    style={{ width: 80, display: "inline" }}
                  />
                )}
              </span>
              <select
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                disabled={loading}
                className="border rounded px-1 py-2 bg-white text-xl"
                style={{ minWidth: 60 }}
              >
                <option value="mx">+52</option>
                <option value="us">+1</option>
              </select>
              <input
                type="tel"
                placeholder={pais === "mx" ? "6531231234" : "9281231234"}
                value={numeroLocal}
                minLength={10}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setNumeroLocal(val);
                }}
                required
                disabled={loading}
                className="w-full text-xl px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-principalClaro)]"
              />
            </div>
          </div>

          {needsName && (
            <div className="flex flex-col w-full">
              <label className="text-xl uppercase font-medium text-gray-100 mb-1 ml-1">
                ¿Cuál es tu nombre?
              </label>
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                disabled={loading}
                className="w-full text-xl px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-principalClaro)]"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[var(--color-principal)] to-[var(--color-secundario)] text-xl text-black uppercase py-2 rounded-full hover:from-[var(--color-principalHover)] hover:to-[var(--color-secundarioHover)] transition"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Enviar código"}
          </button>
          <div id="recaptcha-container"></div>
          {error && (
            <p className="text-[var(--color-promocion)] text-center">{error}</p>
          )}
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col w-full">
            <label className="text-2xl uppercase text-gray-100 mb-1 ml-1">
              Código SMS
            </label>
            <input
              type="number"
              placeholder="Código SMS"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={loading}
              className="w-full text-xl px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-principalClaro)] bg-gray-50"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[var(--color-principal)] to-[var(--color-secundario)] text-black text-xl uppercase py-2 rounded-full hover:from-[var(--color-principalHover)] hover:to-[var(--color-secundarioHover)] transition"
            disabled={loading}
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>
          {error && (
            <p className="text-[var(--color-promocion)] text-center">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
