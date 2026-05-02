import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { toast } from "react-toastify";
import Login from "../components/Login";
import Tarjeta from "../components/Tarjeta";
import RegistrarVisita from "../components/RegistrarVisita";
import CanjearRecompensas from "../components/CanjearRecompensas";
import { useAuth } from "../context/AuthContext";
import MiQR from "../components/MiQR";
import { Link } from "react-router-dom";
import FAQ from "../components/FAQ";
import PanelAdmin from "../components/PanelAdmin";
import Footer from "../components/Footer";
import {
  FaSpinner,
  FaTimes,
  FaBars,
} from "react-icons/fa";
import Logo from "../components/Logo";
import {
  RECOMPENSAS_POR_PUNTOS,
  getMissingPoints,
  getNextReward,
} from "../data/recompensasPorPuntos";

const Home = () => {
  const [user, setUser] = useState(null);
  const [datos, setDatos] = useState(null);
  const [clienteUid, setClienteUid] = useState(null);
  const [loadError, setLoadError] = useState("");
  const { logout } = useAuth();
  const [lastFeedbackTimestamp, setLastFeedbackTimestamp] = useState(null);
  const [animacionEspecial, setAnimacionEspecial] = useState(false);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bloqueandoAnimacion, setBloqueandoAnimacion] = useState(false);
  const [loaderTimeout, setLoaderTimeout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recompensasListas, setRecompensasListas] = useState(false);
  const [staffTab, setStaffTab] = useState("panel");
  const tieneDatosCliente = Boolean(datos);
  const esStaff = rol === "admin" || rol === "caja";
  const puntosActuales = Number(datos?.puntos || 0);
  const proximaRecompensa = getNextReward(puntosActuales);
  const recompensasDisponibles = RECOMPENSAS_POR_PUNTOS.filter(
    (recompensa) => puntosActuales >= recompensa.puntos
  );
  const staffTabs =
    rol === "admin"
      ? [
          {
            id: "panel",
            label: "Panel de control",
          },
          {
            id: "visitas",
            label: "Registrar visita",
          },
          {
            id: "canjes",
            label: "Canjear recompensa",
          },
        ]
      : [
          {
            id: "visitas",
            label: "Registrar visita",
          },
          {
            id: "canjes",
            label: "Canjear recompensa",
          },
        ];

  useEffect(() => {
    let timeout;
    if (loading && !bloqueandoAnimacion) {
      timeout = setTimeout(() => setLoaderTimeout(true), 10000); // 10 segundos
    } else {
      setLoaderTimeout(false);
    }
    return () => clearTimeout(timeout);
  }, [loading, bloqueandoAnimacion]);

  useEffect(() => {
    if (loading || rol !== "cliente" || !tieneDatosCliente) {
      setRecompensasListas(false);
      return undefined;
    }

    const timeout = setTimeout(() => setRecompensasListas(true), 450);
    return () => clearTimeout(timeout);
  }, [loading, rol, tieneDatosCliente]);

  useEffect(() => {
    if (rol === "admin") {
      setStaffTab("panel");
      return;
    }

    if (rol === "caja") {
      setStaffTab("visitas");
    }
  }, [rol]);

  // Función para mostrar la animación de suma de estrella
  const mostrarAnimacionSumaEstrella = (activa) => {
    if (activa) {
      setBloqueandoAnimacion(true);
      setAnimacionEspecial(true);
      setTimeout(() => {
        setBloqueandoAnimacion(false);
        setAnimacionEspecial(false);
      }, 1500); // Ajusta el tiempo a la duración de tu animación
    }
  };

  useEffect(() => {
    let unsubSnap;
    setLoading(true);
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      console.log("Auth state changed:", user);
      if (user) console.log("User UID:", user.uid);
      if (unsubSnap) unsubSnap();

      if (user) {
        const q = query(
          collection(db, "clientes"),
          where("authUid", "==", user.uid)
        );
        unsubSnap = onSnapshot(
          q,
          async (snapshot) => {
            if (snapshot.empty) {
              setDatos(null);
              setClienteUid(null);
              setRol(null);
              setLoadError(
                "Tu sesión sí abrió, pero no existe un perfil de cliente vinculado a este número."
              );
              setLoading(false);
              return;
            }

            const docSnap = snapshot.docs[0];
            setClienteUid(docSnap.id);
            const data = docSnap.data();
            setDatos(data);
            setRol(data.rol || "cliente");
            setLoadError("");
            setLoading(false);
            // Mostrar toast si hay feedback nuevo
            if (
              data.feedback &&
              data.feedback.timestamp &&
              data.feedback.timestamp !== lastFeedbackTimestamp
            ) {
              setLastFeedbackTimestamp(data.feedback.timestamp);
              setTimeout(() => {
                if (data.feedback.tipo === "success") {
                  toast.success(data.feedback.mensaje, {
                    style: { background: "#16a34a", color: "#fff" },
                  });
                } else {
                  toast.error(data.feedback.mensaje, {
                    style: { background: "#dc2626", color: "#fff" },
                  });
                }
              }, 100);
              // Borra el feedback después de mostrarlo
              setTimeout(async () => {
                await updateDoc(doc(db, "clientes", docSnap.id), {
                  feedback: null,
                });
              }, 4000);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error cargando cliente en /tarjeta:", error);
            setDatos(null);
            setClienteUid(null);
            setRol(null);
            setLoadError(
              error.code === "permission-denied"
                ? "Firestore no permite leer tu perfil de cliente con las reglas actuales."
                : "No fue posible cargar tu tarjeta en este momento."
            );
            setLoading(false);
          }
        );
      } else {
        setLoadError("");
        setLoading(false);
      }
    });

    return () => {
      if (unsubSnap) unsubSnap();
      unsubAuth();
    };
  }, [lastFeedbackTimestamp]);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <section className="flex flex-col bg-[var(--color-fondo)] h-full min-h-screen relative">
      {loading && !bloqueandoAnimacion && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex flex-col items-center justify-center">
          <FaSpinner className="animate-spin text-[var(--color-principal)] text-5xl mb-4" />
          {loaderTimeout && (
            <div className="flex flex-col items-center mt-4">
              <p className="text-white text-lg  mb-4 text-center">
                Esto está tardando más de lo normal.
                <br />
                Puedes intentar salir y volver a entrar.
              </p>
              <button
                onClick={logout}
                className="bg-[var(--color-promocion)] text-white px-6 py-3 rounded-full text-lg font-bold shadow-lg hover:bg-[var(--color-promocionHover)] transition"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      )}
      {!loading && loadError && (
        <div className="min-h-screen flex items-center justify-center px-6 pt-28 pb-12">
          <div className="max-w-xl w-full rounded-3xl border border-white/15 bg-black/70 p-8 text-center shadow-2xl">
            <h1 className="text-4xl font-sonori tracking-wide text-[var(--color-principal)] mb-4">
              No pudimos cargar tu tarjeta
            </h1>
            <p className="text-white text-lg leading-relaxed mb-6">{loadError}</p>
            <button
              onClick={logout}
              className="bg-[var(--color-promocion)] text-white px-6 py-3 rounded-full text-lg font-bold shadow-lg hover:bg-[var(--color-promocionHover)] transition"
            >
              Salir
            </button>
          </div>
        </div>
      )}
      {!loading && !loadError && (
        <>
          {/* Overlay */}
          {animacionEspecial && (
            <div
              className="fixed inset-0 bg-black bg-opacity-60 z-30 transition-opacity backdrop-blur-sm"
              style={{ pointerEvents: "auto" }}
            />
          )}

          {/* NAVBAR */}
          <nav className="w-full flex items-center font-sonori tracking-wide justify-center gap-4 px-4 py-2 fixed top-0 left-0 z-50 bg-gradient-to-r from-[var(--color-negro)] via-black to-[var(--color-principal)] shadow-lg">
            <Link to="/" className="flex items-center gap-2">
              <Logo />
            </Link>
            {/* Desktop menu */}
            <div className="hidden md:flex gap-6 items-center">
              <Link
                to="/"
                className="text-white text-3xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
              >
                INICIO
              </Link>
              <Link
                to="/menu"
                className="text-white text-3xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
              >
                MENÚ
              </Link>
              <Link
                to="/perfil"
                className="text-white text-3xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
                onClick={() => { setMenuOpen(false); window.scrollTo(0, 0); }}
              >
                PERFIL
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
            <div className="fixed top-[64px] left-0 w-full font-sonori tracking-wide bg-[var(--color-negro)] bg-opacity-95 flex flex-col items-center gap-2 pt-10 pb-6 z-40 md:hidden">
              <Link
                to="/"
                className="text-white text-3xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
                onClick={() => { setMenuOpen(false); window.scrollTo(0, 0); }}
              >
                INICIO
              </Link>
              <Link
                to="/menu"
                className="text-white text-3xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
                onClick={() => { setMenuOpen(false); window.scrollTo(0, 0); }}
              >
                MENÚ
              </Link>
              <Link
                to="/perfil"
                className="text-white text-3xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
                onClick={() => { setMenuOpen(false); window.scrollTo(0, 0); }}
              >
                PERFIL
              </Link>
            </div>
          )}

          {rol === "cliente" && (
            <div
              className={`flex flex-col justify-center items-center font-sonori tracking-wide gap-2 max-w-md mx-auto mt-20 p-4 bg-[var(--color-principal)] shadow-md rounded-b-xl relative ${
                animacionEspecial ? "z-30" : "z-0"
              }`}
            >
              {datos && (
                <div className="flex flex-col items-center justify-center gap-2">
                  <>
                    {/* Tarjeta y botón con z-40 para estar sobre el overlay */}
                    <div className="relative z-40">
                      <Tarjeta
                        puntos={datos.puntos}
                        onAnimacionEspecial={setAnimacionEspecial}
                        onAnimacionSumaPunto={mostrarAnimacionSumaEstrella}
                      />
                      {/* <BarraProgresoRecompensas
                        puntosAcumulados={datos.puntosAcumulados || 0}
                      /> */}
                    </div>
                    <MiQR uid={clienteUid} />
                    {/* <button
                      onClick={() => setMostrarRecompensas(true)}
                      className="bg-orange-600 uppercase text-[var(--color-blanco)] text-3xl px-4 py-2 mt-2 rounded hover:bg-[var(--color-secundarioHover)] relative"
                      style={
                        animacionEspecial
                          ? {
                              boxShadow:
                                "0 0 0 4px #fff, 0 0 24px 8px #fff, 0 0 32px 16px #0008",
                              border: "2px solid #fff",
                              filter: "brightness(1.2)",
                              zIndex: 40,
                            }
                          : { zIndex: 20 }
                      }
                    >
                      Ver mis recompensas
                    </button>

                    {mostrarRecompensas && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                        <div className="bg-[var(--color-fondo)] rounded-lg shadow-lg p-6 w-full max-w-md relative">
                          <button
                            onClick={() => setMostrarRecompensas(false)}
                            className="absolute top-2 right-2 text-red-500 hover:text-[var(--color-promocion)] font-bold text-xl"
                          >
                            <MdCancel size={24} />
                          </button>
                          <MisRecompensas uid={clienteUid} />
                        </div>
                      </div>
                    )} */}
                  </>
                  <div className="w-full flex justify-center font-sonori tracking-wide px-0 mt-4">
                    <div className="bg-[var(--color-negro)] uppercase rounded-lg shadow-md p-4 max-w-md w-full flex flex-col items-center text-center border border-[var(--color-principal)]">
                      <h2 className="text-4xl text-orange-600 mb-4">
                        ¿Cómo funciona tu Tarjeta VIP?
                      </h2>
                      <ul className="text-white flex flex-col gap-4 text-left text-xl mb-2 space-y-1">
                        <li>
                          💰 Acumula{" "}
                          <span className=" text-orange-600">
                            puntos
                          </span>{" "}
                          por cada{" "}
                          <span className=" text-orange-600">
                            compra
                          </span>
                          .
                        </li>
                        <li>
                          🎯 Usa tus puntos para{" "}
                          <span className=" text-orange-600">
                            comprar
                          </span>{" "}
                          <span className=" text-orange-600">
                            beneficios
                          </span>
                          .
                        </li>
                        {/* <li>
                          📈 Alcanza los niveles para obtener
                          <span className=" text-orange-600">
                            {" "}
                            recompensas
                          </span>
                          !
                        </li>
                        <li>
                          🎁 Las recompensas pueden ser{" "}
                          <span className=" text-orange-600">
                            descuentos o productos gratis
                          </span>
                          .
                        </li> */}
                        <li>
                          🪪 Canjea mostrando tu{" "}
                          <span className=" text-orange-600">
                            tarjeta digital
                          </span>{" "}
                          y pide tu recompensa.
                        </li>
                      </ul>
                      <span className="text-lg text-white">
                        ¡Sigue visitándonos y disfruta tus beneficios!
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {esStaff && (
            <section className="mx-auto mt-24 w-full max-w-6xl px-0">
              <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-black via-[#121212] to-[#332400] p-0 shadow-2xl md:p-6">
                <div className="mb-6 px-4 md:px-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="mt-2 text-4xl text-[var(--color-principal)]">
                      Centro Operativo
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {staffTabs.map((tab) => {
                      const activa = staffTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStaffTab(tab.id)}
                          className={`rounded-full border px-5 py-3 text-left transition-all duration-200 ${
                            activa
                              ? "border-[var(--color-principal)] bg-[var(--color-principal)] text-[var(--color-negro)] shadow-lg"
                              : "border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                          }`}
                        >
                          <span className="block text-lg">{tab.label}</span>
                          <span
                            className={`block text-sm ${
                              activa ? "text-black/70" : "text-white/65"
                            }`}
                          >
                            {tab.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-black/15 bg-[var(--color-principal)]/95">
                  {staffTab === "panel" && rol === "admin" && <PanelAdmin />}
                  {staffTab === "visitas" && (
                    <RegistrarVisita clienteUid={clienteUid} ocultarCanje />
                  )}
                  {staffTab === "canjes" && <CanjearRecompensas />}
                </div>
              </div>
            </section>
          )}

          {/* Recompensas que puedes ganar */}
          {rol === "cliente" && (
            <div
              className={`flex flex-col justify-center items-center gap-2 font-sonori tracking-wide max-w-md mx-auto mt-8 p-4 bg-[var(--color-principal)] shadow-md rounded relative`}
            >
              <div className="w-full mb-2">
                {!recompensasListas ? (
                  <div className="min-h-[360px] rounded-3xl border border-black/20 bg-[var(--color-negro)] px-6 py-10 shadow-xl flex flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--color-principal)]/25 border-t-[var(--color-principal)] bg-white/5 shadow-lg">
                      <FaSpinner className="animate-spin text-[var(--color-principal)] text-4xl" />
                    </div>
                    <h3 className="mt-6 text-4xl text-[var(--color-principal)]">
                      Cargando recompensas
                    </h3>
                    <p className="mt-3 max-w-sm text-lg leading-relaxed text-white">
                      Estamos consultando tus puntos y preparando las recompensas disponibles.
                    </p>
                    <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                      1 peso gastado = 1 Sonori-punto
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-[var(--color-negro)] rounded-2xl p-4 mb-4 text-center border border-white/15 shadow-xl">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 mb-4 text-[var(--color-principal)] text-sm">
                        Tus beneficios disponibles
                      </div>
                      <h3 className="text-4xl text-[var(--color-principal)]">
                        RECOMPENSAS
                      </h3>
                      <p className="text-white text-lg">
                        1 peso gastado = 1 Sonori-punto
                      </p>
                      {proximaRecompensa ? (
                        <p className="text-white text-lg leading-relaxed mt-3">
                          Te faltan{" "}
                          <span className="text-[var(--color-principal)] text-2xl">
                            {getMissingPoints(puntosActuales, proximaRecompensa).toFixed(2)}
                          </span>{" "}
                          puntos para canjear{" "}
                          <span className="text-[var(--color-principal)]">
                            {proximaRecompensa.nombre}
                          </span>
                          .
                        </p>
                      ) : (
                        <p className="text-white text-lg leading-relaxed mt-3">
                          Ya puedes canjear cualquiera de las recompensas disponibles.
                        </p>
                      )}
                      {recompensasDisponibles.length > 0 && (
                        <p className="text-white text-md mt-3">
                          Disponibles ahora: {recompensasDisponibles.length}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {RECOMPENSAS_POR_PUNTOS.map((recompensa) => {
                        const disponible = puntosActuales >= recompensa.puntos;
                        const faltan = getMissingPoints(puntosActuales, recompensa);

                        return (
                          <li
                            key={recompensa.id}
                            className={`rounded-2xl p-4 border shadow-sm transition-opacity duration-300 ${
                              disponible
                                ? "bg-[var(--color-blanco)] border-[var(--color-negro)]"
                                : "bg-white/80 border-white/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-2xl text-[var(--color-negro)]">
                                  🎁 {recompensa.nombre}
                                </p>
                                <p className="text-sm text-gray-700 mt-1">
                                  {recompensa.descripcion}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full bg-[var(--color-negro)] px-3 py-1 text-lg text-[var(--color-principal)]">
                                {recompensa.puntos} pts
                              </span>
                            </div>
                            <p
                              className={`mt-3 text-lg ${
                                disponible ? "text-green-700" : "text-gray-700"
                              }`}
                            >
                              {disponible
                                ? "Disponible para canje"
                                : `Te faltan ${faltan.toFixed(2)} puntos`}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}

          <FAQ />
          <Footer />
        </>
      )}
    </section>
  );
};

export default Home;
