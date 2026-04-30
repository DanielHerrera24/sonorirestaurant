import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { FcGoogle } from "react-icons/fc";
import { MdCancel } from "react-icons/md";
import icon from "../assets/Icon-fiesta.png";
import { Link } from "react-router-dom";
import Footer from "./Footer";
import PhoneAuthForm from "./PhoneAuthForm";
import Logo from "./Logo";

export default function Register() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();

  const generarUidUnico = async () => {
    let uid;
    let existe = true;

    while (existe) {
      // Genera número de 8 dígitos
      uid = Math.floor(10000000 + Math.random() * 90000000).toString();

      // Verifica si ya existe en Firestore
      const ref = doc(db, "clientes", uid);
      const snap = await getDoc(ref);
      existe = snap.exists();
    }

    return uid;
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await loginWithGoogle();
      const user = userCredential.user;

      const clientesRef = collection(db, "clientes");
      const q = query(clientesRef, where("authUid", "==", user.uid));
      const snap = await getDocs(q);

      if (snap.empty) {
        const uidPersonalizado = await generarUidUnico();
        await setDoc(doc(db, "clientes", uidPersonalizado), {
          nombre: user.displayName || "",
          correo: user.email,
          estrellas: 1,
          ultimaVisita: null,
          uid: uidPersonalizado,
          authUid: user.uid,
          recompensasCanjeadas: 0,
          creado: serverTimestamp(),
        });
        setShowWelcome(true);
        setLoading(false);
        return;
      }

      navigate("/tarjeta");
      setLoading(false);
    } catch (err) {
      setError("Error con Google: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border[var(--color-principal)] border-t-transparent rounded-full animate-spin"></div>
          <span className="font-bold text-[var(--color-principal)] text-lg">Cargando...</span>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-[100]">
        <button
          className="absolute top-6 right-8 text-gray-300 hover:text-[var(--color-promocion)] transition"
          onClick={() => {
            setShowWelcome(false);
            navigate("/tarjeta");
          }}
        >
          <MdCancel size={38} />
        </button>
        <div className="animate-bounce mb-6">
          <img src={icon} alt="Fiesta" className="w-24 h-24 drop-shadow-2xl" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white text-center mb-4 animate-fade-in">
          ¡Bienvenido a la familia VIP!
        </h1>
        <p className="text-lg sm:text-2xl text-[var(--color-navBar)] text-center  animate-fade-in">
          Tu tarjeta ha sido creada.
          <br />
          <span className="text-[var(--color-principal)]">
            ¡Ya puedes acumular estrellas y canjear recompensas!
          </span>
          <br />
          <span className="text-yellow-300 font-bold text-xl block mt-4">
            ⭐ ¡Recibiste tu primera estrella por registrarte!
          </span>
        </p>
      </div>
    );
  }

  return (
    <>
      <nav
        className="fixed flex items-center justify-between shadow-lg w-full py-2 pr-2 z-20"
        style={{ background: "var(--color-navBar)" }}
      >
        <Link to="/" className="text-2xl font-bold text-[var(--color-secundario]">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="bg-[var(--color-secundario)] hover:bg-[var(--color-secundarioHover)] text-md px-3 py-1 font-bold text-[var(--color-principal)] rounded-md"
          >
            Menu
          </Link>
        </div>
      </nav>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-principal)] via-[var(--color-secundario)] to-[var(--color-principal)] px-2">
        <div className="w-full max-w-md my-20 px-4 sm:px-6 lg:px-8">
          {/* Bloque atractivo de invitación */}
          <div className="relative flex flex-col items-center justify-center py-6 px-4 mb-6 mt-6 overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-[var(--color-principal)] via-[var(--color-secundario)] to-[var(--color-principal)] border border-[var(--color-principalClaro)]">
            <div className="absolute -top-8 -left-8 w-24 h-24 bg-[var(--color-secundario)] rounded-full opacity-30 blur-2xl"></div>
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[var(--color-secundario)] rounded-full opacity-20 blur-2xl"></div>
            <div className="flex flex-col items-center z-10">
              <img
                src={icon}
                alt="Icono de fiesta"
                className="w-14 h-14 my-2 drop-shadow-2xl animate-bounce"
              />
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-principalHover)] mb-2 text-center drop-shadow">
                ¡Regístrate y obtén tu Tarjeta VIP!
              </h2>
              <p className="text-[var(--color-principal)] text-sm sm:text-base font-normal mb-2 text-center max-w-xs">
                Acumula{" "}
                <span className="font-bold text-[var(--color-principalHover)]">estrellas</span> con
                cada compra por día y canjea{" "}
                <span className="font-bold text-[var(--color-principalHover)]">recompensas</span>{" "}
                como descuentos y productos GRATIS.
              </p>
              <ul className="text-xs sm:text-sm text-[var(--color-principal)] mb-2 space-y-1 text-left max-w-xs bg-white/60 p-3 rounded-lg shadow-inner">
                <li>⭐ Compra por día = 1 estrella</li>
                <li>🎯 5 estrellas = 1 recompensa</li>
                <li>🎁 Recompensas acumulables</li>
                <li>🪪 Canjea solo mostrando tu tarjeta VIP o número de teléfono</li>
              </ul>
              <span className="text-md text-white text-center">
                ¡Es gratis, fácil y rápido!
              </span>
            </div>
          </div>

          {/* Formulario solo con teléfono y Google */}
          <div className="bg-white bg-opacity-90 p-8 mb-8 rounded-2xl shadow-md w-full">
            <h2 className="text-2xl font-bold text-center text-[var(--color-principalHover)] mb-6">
              Crear cuenta
            </h2>
            {error && <p className="text-[var(--color-promocion)] mb-4 text-center">{error}</p>}
            <PhoneAuthForm
              modo="register"
              onSuccess={() => window.location.href = "/tarjeta"}
            />
            <div className="flex items-center justify-between gap-6 mb-4">
              <span className="border-b border-gray-400 w-full py-1 ml-3"></span>
              <span className="text-gray-400">o</span>
              <span className="border-b border-gray-400 w-full py-1 mr-3"></span>
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2 bg-white border text-[var(--color-principalHover)] font-bold py-2 rounded-full transition"
              style={{ border: "1px solid var(--color-principalClaro)" }}
            >
              <FcGoogle size={22} />
              Registrarse con Google
            </button>
            <p className="mt-4 text-center text-md">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/login"
                onClick={() => window.scrollTo(0, 0)}
                className="font-medium underline text-[var(--color-principal)] hover:text-[var(--color-principalHover)]"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
