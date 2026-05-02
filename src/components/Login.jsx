import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { auth } from "../firebase";
import cafe from "../assets/Logo/Icon Sonori fondo negro.png";
import { Link } from "react-router-dom";
import fiestaIcon from "../assets/Logo/Icon Sonori fondo negro.png";
import Footer from "./Footer";
import PhoneAuthForm from "./PhoneAuthForm";
import { MdCancel } from "react-icons/md";
import Logo from "./Logo";
import { FaBars, FaTimes } from "react-icons/fa";
import {
  checkPhoneStatus,
  linkGoogleClient,
  linkPhoneClient,
} from "../services/clientesApi";

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Antes de enviar el SMS: comprueba si el teléfono ya existe en Firestore
  const checkPhoneAntesEnviar = async (telefono) => {
    try {
      setError("");
      const status = await checkPhoneStatus(telefono);
      return { exists: status.exists, cliente: status.cliente ?? null };
    } catch (err) {
      const message =
        err.message || "No fue posible validar el número antes de enviar el SMS.";
      setError(message);
      throw err;
    }
  };

  // Después de que PhoneAuthForm confirme el código SMS verificando el número:
  // si el teléfono es nuevo, crear el documento cliente (usar generarUidUnico)
  const handlePhoneVerified = async (telefono, nombreSiNuevo = "") => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No se encontró la sesión autenticada después de verificar el SMS.");
      }

      const idToken = await currentUser.getIdToken();
      const result = await linkPhoneClient({
        phone: telefono,
        nombre: nombreSiNuevo,
        token: idToken,
      });

      if (result.created) {
        // mostrar pantalla de bienvenida en lugar de redirigir
        setShowWelcome(true);
        setLoading(false);
        return { created: true }; // <-- indicamos que se creó un usuario nuevo
      }

      setLoading(false);
      return { created: false, linked: true };
    } catch (err) {
      console.error("Error creando cliente por teléfono:", err);
      setError("Error al procesar el teléfono: " + err.message);
      setLoading(false);
      return { created: false, linked: false, error: err };
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await loginWithGoogle();
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      const result = await linkGoogleClient({
        nombre: user.displayName || "",
        correo: user.email || "",
        token: idToken,
      });

      if (result.created) {
        setShowWelcome(true);
        return;
      }

      navigate("/tarjeta");
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
          <div className="w-16 h-16 border-4 border-[var(--color-principal)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[var(--color-principal)] font-sonori text-2xl">
            Cargando...
          </span>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col font-sonori tracking-wide items-center justify-center z-[100]">
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
          <img
            src={fiestaIcon}
            alt="Fiesta"
            className="w-24 h-24 drop-shadow-2xl"
          />
        </div>
        <h1 className="text-5xl text-white text-center mb-4 animate-fade-in">
          ¡Bienvenido a la familia VIP!
        </h1>
        <p className="text-3xl text-orange-600 text-center  animate-fade-in">
          Tu tarjeta ha sido creada.
        </p>
          <span className="text-3xl text-center text-[var(--color-principal)]">
            ¡Ya puedes acumular puntos y canjear recompensas!
          </span>
      </div>
    );
  }

  return (
    <>
      {/* NAVBAR */}
      <nav className="w-full font-sonori tracking-wide flex items-center justify-center gap-4 px-4 py-2 fixed top-0 left-0 z-50 bg-gradient-to-r from-[var(--color-negro)] via-black to-[var(--color-principal)] shadow-lg">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        {/* Desktop menu */}
        <div className="hidden md:flex gap-6 items-center">
          <Link
            to="/"
            className="text-white text-2xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
          >
            INICIO
          </Link>
          <Link
            to="/menu"
            className="text-white text-2xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
          >
            MENÚ
          </Link>
        </div>
        {/* Hamburger icon */}
        <button
          className="md:hidden text-white text-3xl focus:outline-none"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {menuOpen ? (
            <FaTimes className="text-red-500" />
          ) : (
            <FaBars className="text-white" />
          )}
        </button>
      </nav>
      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed font-sonori top-[64px] left-0 w-full bg-[var(--color-negro)] bg-opacity-95 flex flex-col items-center gap-4 pt-10 pb-4 z-40 md:hidden animate-fade-in">
          <Link
            to="/"
            className="text-white text-2xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
            onClick={() => setMenuOpen(false)}
          >
            INICIO
          </Link>
          <Link
            to="/menu"
            className="text-white text-2xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
            onClick={() => setMenuOpen(false)}
          >
            MENÚ
          </Link>
        </div>
      )}
      <div className="min-h-screen font-sonori flex items-center justify-center bg-gradient-to-br from-[var(--color-principal)] via-[var(--color-fondo)] to-[var(--color-principal)]">
        <div className="w-full max-w-md my-20 px-4 sm:px-6 lg:px-8">
          {/* Bloque atractivo superior */}
          <div className="relative flex flex-col items-center justify-center py-6 mt-10 px-4 mb-6 overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-[var(--color-principal)] via-[var(--color-fondo)] to-[var(--color-principal)] border border-[var(--color-blanco)]">
            <div className="absolute -top-8 -left-8 w-24 h-24 bg-[var(--color-navBar)] rounded-full opacity-30 blur-2xl"></div>
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[var(--color-principal)] rounded-full opacity-20 blur-2xl"></div>
            <div className="flex flex-col items-center z-10">
              <img src={cafe} className="w-24 h-24 mb-2 animate-bounce"></img>
              <h2 className="text-5xl uppercase tracking-wide text-[var(--color-blanco)] mb-2 text-center drop-shadow">
                ¡Bienvenido!
              </h2>
              <p className="text-[var(--color-blanco)] uppercase text-xl font-normal mb-2 text-center max-w-xs">
                Inicia sesión para ver tus{" "}
                <span className=" text-[var(--color-principal)]">
                  puntos
                </span>{" "}
                y tu tarjeta <span className="text-[var(--color-principal)]">digital</span>.
              </p>
              <ul className="text-lg uppercase text-[var(--color-blanco)] mb-2 space-y-1 text-left max-w-xs bg-black/40 p-3 rounded-lg shadow-inner">
                <li>⭐ Acumula puntos con cada compra</li>
                <li>🎁 Usa tus puntos para comprar beneficios</li>
                <li>🪪 Solo necesitas tu tarjeta digital</li>
              </ul>
              <span className="text-xl uppercase text-white text-center">
                ¡Tu lealtad tiene premio!
              </span>
            </div>
          </div>

          {/* Formulario solo con teléfono y Google */}
          <div className="bg-black/70 bg-opacity-90 px-8 py-6 rounded-2xl shadow-md w-full">
            <h2 className="text-4xl uppercase tracking-wide text-center text-[var(--color-principal)] mb-6">
              Iniciar sesión
            </h2>
            {error && (
              <p className="text-[var(--color-promocion)] mb-4 text-center">
                {error}
              </p>
            )}
            <PhoneAuthForm
              modo="login"
              checkPhone={checkPhoneAntesEnviar}
              onVerified={handlePhoneVerified}
              onSuccess={() => (window.location.href = "/tarjeta")}
            />
            <div className="flex items-center justify-between gap-6 mb-4">
              <span className="border-b border-gray-200 w-full py-1 ml-3"></span>
              <span className="text-gray-200 text-2xl">o</span>
              <span className="border-b border-gray-200 w-full py-1 mr-3"></span>
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2 bg-white border border-[var(--color-principalClaro)] text-[var(--color-negro)] text-xl py-2 rounded-full transition mt-2"
              disabled={loading}
            >
              <FcGoogle size={22} />
              {loading ? "Cargando..." : "Iniciar sesión con Google"}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
