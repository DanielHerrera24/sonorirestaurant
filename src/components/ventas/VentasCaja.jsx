import { useEffect, useState } from "react";
import FormularioVenta from "./FormularioVenta";
import ListaVentas from "./ListaVentas";
import CorteCaja from "./CorteCaja";
import { Link } from "react-router-dom";
import Logo from "../Logo";
import {
  FaAddressCard,
  FaClipboardList,
  FaConciergeBell,
  FaEdit,
  FaTimes,
} from "react-icons/fa";
import TipoCambio from "./TipoCambio";
import {
  FaCashRegister,
  FaListAlt,
  FaCalculator,
  FaDollarSign,
} from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import OrdenesDia from "./OrdenesDia";
import EditarPlatillos from "./EditarPlatillos";
import { useAuth } from "../../context/AuthContext";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import PanelAdmin from "../PanelAdmin";
import { FaGift, FaMoneyBillTrendUp } from "react-icons/fa6";
import PanelMembresia from "../PanelMembresia"; // Importa el nuevo componente
import OrdenesCocina from "./OrdenesCocina";
import { GrConfigure } from "react-icons/gr";
import Configuracion from "../configuracion/Configuracion";

const TABS = [
  { key: "venta", label: "Registrar Venta", icon: <FaCashRegister /> },
  { key: "ordenesCocina", label: "Órdenes Cocina", icon: <FaConciergeBell /> },
  { key: "ordenes", label: "Órdenes del Día", icon: <FaClipboardList /> },
  { key: "lista", label: "Reportes", icon: <FaMoneyBillTrendUp /> },
  { key: "corte", label: "Corte de Caja", icon: <FaCalculator /> },
  // No agregues aquí la tab de recompensas, la agregamos solo para admin abajo
];

export default function VentasCaja() {
  const [tab, setTab] = useState("venta");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [rol, setRol] = useState(null);
  const [esDueno, setEsDueno] = useState(false);
  const [expirada, setExpirada] = useState(false);
  const [fechaExpiracion, setFechaExpiracion] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "clientes"),
      where("authUid", "==", user.uid),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setRol(data.rol || "cliente");
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const verificarDueno = () => {
      if (user?.email === "info.daniherrera@gmail.com") {
        setEsDueno(true);
      } else {
        setEsDueno(false);
      }
    };
    verificarDueno();
  }, [user]);

  useEffect(() => {
    // Solo verifica si ya tienes el rol correcto
    if (!user || (rol !== "admin" && rol !== "caja")) return;
    const docRef = doc(db, "configuracion", "membresia");
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFechaExpiracion(data.ultimoPago);
        if (data.ultimoPago) {
          const fecha = new Date(data.ultimoPago);
          const ahora = new Date();
          setExpirada(fecha < ahora);
        } else {
          setExpirada(true);
        }
      } else {
        setExpirada(true);
      }
    });
  }, [user, rol]);

  // Solo admin y caja pueden ver la sección
  if (rol !== "admin" && rol !== "caja") {
    return (
      <div className="text-center text-red-600 font-bold mt-24">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  if (expirada && !esDueno) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-yellow-50">
        <div className="bg-white border border-yellow-300 rounded-lg p-8 shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-yellow-800 mb-4">
            Membresía expirada
          </h2>
          <p className="mb-4 text-yellow-900">
            Tu membresía ha expirado.
            <br />
            {fechaExpiracion && (
              <span>
                Fecha de expiración:{" "}
                <b>
                  {new Date(fechaExpiracion).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </b>
              </span>
            )}
          </p>
          <p className="mb-4 text-gray-700">
            Por favor, contacta al administrador para renovar la membresía y
            continuar usando el sistema.
          </p>
          <button
            onClick={() => {
              const mensaje = encodeURIComponent(
                `¡Hola! Para renovar la membresía del sistema, puedes realizar la transferencia a la siguiente cuenta:\n\nBanco: NU MEXICO\nCLABE: 638180010150559725\nTitular: Sonia Angulo Camacho\n\nPor favor, envía el comprobante de pago a este chat para verificarlo y poder renovar la membresía.`,
              );
              window.open(
                `https://wa.me/526531661507?text=${mensaje}`,
                "_blank",
              );
            }}
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700"
          >
            Renovar membresía
          </button>
        </div>
      </div>
    );
  }

  // Si está expirada y SÍ es dueño, solo muestra el panel de membresía
  if (expirada && esDueno) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-yellow-50">
        <PanelMembresia user={user} />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6 mx-auto p-4">
      {/* NAVBAR */}
      <nav className="w-full flex items-center font-kyoto tracking-wider justify-between sm:justify-evenly md:justify-center gap-4 px-2 py-2 fixed top-0 left-0 z-30 bg-gradient-to-r from-[var(--color-navBar)] via-[var(--color-navBar)] to-[var(--color-navBar)] shadow-lg">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        {/* Desktop menu */}
        <div className="flex font-montserrat font-bold gap-0 items-center">
          <Link
            to="/menu"
            className="text-[var(--color-principal)] text-2xl hover:text-3xl hover:bg-black/20 rounded-2xl p-2 transition-all duration-300"
          >
            MENÚ
          </Link>
          <Link
            to="/perfil"
            className="text-[var(--color-principal)] text-2xl hover:text-3xl hover:bg-black/20 rounded-2xl p-2 transition-all duration-300"
          >
            PERFIL
          </Link>
        </div>
      </nav>
      {/* Pastillas de navegación */}
      <div className="flex justify-between w-full mt-20 gap-2">
        {/* Sidebar */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-2 top-24 z-10 sm:hidden bg-orange-500 text-white rounded-full p-2 shadow-lg"
          aria-label="Abrir menú lateral"
        >
          <IoMdSettings size={32} />
        </button>
        <aside
          className={`
            fixed top-0 sm:top-20 left-0 h-full w-auto bg-gray-100 rounded-r-xl shadow-md z-20
            flex flex-col gap-2 p-2 sm:p-0 mt-20 sm:mt-0
            transform transition-transform duration-300
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            sm:sticky sm:translate-x-0 sm:rounded-xl sm:w-auto sm:h-full sm:flex
          `}
        >
          {/* Tabs principales solo para admin y caja */}
          {["admin", "caja"].includes(rol) &&
            TABS.filter((t) => t.key !== "lista").map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setSidebarOpen(false);
                }}
                className={`
                  flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition
                  ${
                    tab === t.key
                      ? "bg-black text-orange-500 shadow"
                      : "text-orange-500 hover:bg-orange-700 hover:text-white"
                  }
                `}
                title={t.label}
              >
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs font-semibold">{t.label}</span>
              </button>
            ))}
          {/* Tab de Reportes solo para admin */}
          {rol === "admin" && (
            <button
              key="lista"
              onClick={() => {
                setTab("lista");
                setSidebarOpen(false);
              }}
              className={`
                flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition
                ${
                  tab === "lista"
                    ? "bg-black text-orange-500 shadow"
                    : "text-orange-500 hover:bg-orange-700 hover:text-white"
                }
              `}
              title="Reportes"
            >
              <span className="text-2xl">
                <FaMoneyBillTrendUp />
              </span>
              <span className="text-xs font-semibold">Reportes</span>
            </button>
          )}
          {/* Nueva tab de Recompensas solo para admin */}
          {rol === "admin" && (
            <button
              key="recompensas"
              onClick={() => {
                setTab("recompensas");
                setSidebarOpen(false);
              }}
              className={`
                flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition
                ${
                  tab === "recompensas"
                    ? "bg-black text-orange-500 shadow"
                    : "text-orange-500 hover:bg-orange-700 hover:text-white"
                }
              `}
              title="Recompensas"
            >
              <span className="text-2xl">
                <FaGift />
              </span>
              <span className="text-xs font-semibold">Recompensas</span>
            </button>
          )}
          {rol === "admin" && (
            <button
              key="configuracion"
              onClick={() => {
                setTab("configuracion");
                setSidebarOpen(false);
              }}
              className={`
                flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition
                ${
                  tab === "configuracion"
                    ? "bg-black text-orange-500 shadow"
                    : "text-orange-500 hover:bg-orange-700 hover:text-white"
                }
              `}
              title="Configuración"
            >
              <span className="text-2xl">
                <GrConfigure />
              </span>
              <span className="text-xs font-semibold">Configuración</span>
            </button>
          )}
          {esDueno && (
            <button
              key="membresia"
              onClick={() => {
                setTab("membresia");
                setSidebarOpen(false);
              }}
              className={`
                flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition
                ${
                  tab === "membresia"
                    ? "bg-yellow-600 text-white shadow"
                    : "text-yellow-800 hover:bg-yellow-100 hover:text-yellow-900"
                }
              `}
              title="Panel Membresía"
            >
              <FaAddressCard size={24} />
              <span className="text-xs font-semibold">Membresía</span>
            </button>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden flex gap-2 items-center justify-between bg-red-500 text-white rounded-full p-2"
            aria-label="Cerrar menú lateral"
          >
            Ocultar <FaTimes size={20} />
          </button>
        </aside>
        {/* Contenido dinámico */}
        <div className="flex-1">
          {tab === "venta" && <FormularioVenta />}
          {tab === "lista" && rol === "admin" && <ListaVentas />}
          {tab === "corte" && <CorteCaja />}
          {tab === "ordenes" && <OrdenesDia />}
          {tab === "ordenesCocina" && <OrdenesCocina />}
          {tab === "recompensas" && rol === "admin" && <PanelAdmin />}
          {tab === "configuracion" && rol === "admin" && <Configuracion />}
          {tab === "membresia" && esDueno && <PanelMembresia user={user} />}
        </div>
        <div className="hidden sm:block"></div>
      </div>
    </section>
  );
}
