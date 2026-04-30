import { useEffect, useState } from "react";
import {
  updateDoc,
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { FaBars, FaTimes } from "react-icons/fa";

import EnlazarTarjetaFisica from "../components/EnlazarTarjetaFisica";

const Perfil = () => {
  const { user, logout } = useAuth();
  const [datos, setDatos] = useState(null);
  const [clienteUid, setClienteUid] = useState(null);
  const [rol, setRol] = useState(null);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [fechaExpiracion, setFechaExpiracion] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [esDueno, setEsDueno] = useState(false);
  const [acordeonOpen, setAcordeonOpen] = useState(false);
  const [diaRenovacion, setDiaRenovacion] = useState(1);
  const [mesesPagados, setMesesPagados] = useState(1);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(
      collection(db, "clientes"),
      where("authUid", "==", user.uid),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setClienteUid(docSnap.id);
        const data = docSnap.data();
        setDatos(data);
        setRol(data.rol || "cliente");
      }
      setLoading(false);
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

  // Cargar configuración actual
  useEffect(() => {
    const cargarConfig = async () => {
      setLoading(true);
      const docRef = doc(db, "configuracion", "membresia");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setFechaExpiracion(data.ultimoPago);
        setNuevaFecha(data.ultimoPago?.slice(0, 10) || "");
        setDiaRenovacion(data.diaRenovacion);
        setMesesPagados(data.mesesPagados || 1);
      }
      setLoading(false);
    };
    cargarConfig();
  }, []);

  // Renovar con fecha de hoy y meses pagados
  const renovarHoy = async () => {
    setLoading(true);
    const hoy = new Date();
    // Calcula nueva fecha de expiración según meses pagados y día de renovación
    let nuevaExpiracion = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      diaRenovacion,
    );
    if (hoy.getDate() > diaRenovacion) {
      nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + 1);
    }
    nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + mesesPagados - 1);
    // Ajustar al final del día seleccionado
    nuevaExpiracion.setHours(23, 59, 59, 999);
    await setDoc(doc(db, "configuracion", "membresia"), {
      ultimoPago: nuevaExpiracion.toISOString(),
      diaRenovacion,
      mesesPagados,
    });
    setFechaExpiracion(nuevaExpiracion.toISOString());
    setNuevaFecha(nuevaExpiracion.toISOString().slice(0, 10));
    await guardarRenovacion(nuevaExpiracion.toISOString(), "renovacion");
    toast.success("¡Membresía renovada!");
    setLoading(false);
  };

  // Modificar fecha manualmente y guardar configuración
  const modificarFecha = async () => {
    if (!nuevaFecha) return;
    setLoading(true);
    // Ajustar la fecha seleccionada al final del día (23:59:59.999)
    const fecha = new Date(nuevaFecha);
    fecha.setHours(23, 59, 59, 999);
    await setDoc(doc(db, "configuracion", "membresia"), {
      ultimoPago: fecha.toISOString(),
      diaRenovacion,
      mesesPagados,
    });
    setFechaExpiracion(fecha.toISOString());
    await guardarRenovacion(fecha.toISOString(), "manual");
    toast.success("Fecha de expiración modificada");
    setLoading(false);
  };

  // Nueva función para renovar sumando meses a la fecha de expiración actual
  const renovarMeses = async () => {
    setLoading(true);
    let baseDate = fechaExpiracion ? new Date(fechaExpiracion) : new Date();
    const hoy = new Date();
    // Si la fecha de expiración ya pasó, usar hoy como base
    if (baseDate < hoy) baseDate = hoy;
    // Calcular nueva fecha de expiración
    let nuevaExpiracion = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      diaRenovacion,
    );
    if (baseDate.getDate() > diaRenovacion) {
      nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + 1);
    }
    nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + mesesPagados);
    // Ajustar al final del día seleccionado
    nuevaExpiracion.setHours(23, 59, 59, 999);
    await setDoc(doc(db, "configuracion", "membresia"), {
      ultimoPago: nuevaExpiracion.toISOString(),
      diaRenovacion,
      mesesPagados,
    });
    setFechaExpiracion(nuevaExpiracion.toISOString());
    setNuevaFecha(nuevaExpiracion.toISOString().slice(0, 10));
    await guardarRenovacion(nuevaExpiracion.toISOString(), "renovacion");
    toast.success("¡Membresía renovada!");
    setLoading(false);
  };

  // Guardar renovación en historial
  const guardarRenovacion = async (fecha, tipo = "manual") => {
    const id = `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, "historial_membresia", id), {
      fechaRenovacion: fecha,
      tipo,
      usuario: user?.email || "",
      diaRenovacion,
      mesesPagados,
      timestamp: new Date().toISOString(),
    });
  };

  // Cargar historial de renovaciones
  useEffect(() => {
    const cargarHistorial = async () => {
      const q = query(collection(db, "historial_membresia"));
      const unsub = onSnapshot(q, (snapshot) => {
        const arr = [];
        snapshot.forEach((doc) => arr.push(doc.data()));
        arr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setHistorial(arr);
      });
      return () => unsub();
    };
    cargarHistorial();
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl">Debes iniciar sesión para ver tu perfil.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-[var(--color-fondo)] text-white pb-10">
      {/* NAVBAR */}
      <nav className="font-montserrat w-full flex items-center justify-center gap-3 px-4 py-2 fixed top-0 left-0 bg-gradient-to-r from-[var(--color-negro)] via-black to-[var(--color-principal)] z-50">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        {/* Desktop menu */}
        <div className="hidden md:flex gap-1 items-center">
          <Link
            to="/"
            className="text-white font-bold text-xl rounded-2xl p-2 transition-all duration-300"
          >
            INICIO
          </Link>
          <Link
            to="/menu"
            className="text-white font-bold text-xl rounded-2xl p-2 transition-all duration-300"
          >
            MENÚ
          </Link>
          <Link
            to="/caja"
            className="text-white font-bold text-xl rounded-2xl p-2 transition-all duration-300"
          >
            VENTAS
          </Link>
          {user ? (
            <Link
              to="/tarjeta"
              onClick={() => {
                window.scrollTo(0, 0);
              }}
              className="bg-orange-500 uppercase text-[var(--color-blanco)] p-2 rounded hover:bg-orange-700 transition text-lg text-center font-montserrat font-bold"
            >
              Tarjeta VIP
            </Link>
          ) : (
            <Link
              to="/"
              onClick={() => {
                window.scrollTo(0, 0);
              }}
              className="bg-orange-500 uppercase text-[var(--color-blanco)] p-2 rounded hover:bg-orange-700 transition text-lg text-center font-montserrat font-bold"
            >
              Iniciar sesión
            </Link>
          )}
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
        <div className="fixed top-[64px] left-0 w-full font-sonori tracking-wide bg-[var(--color-negro)] bg-opacity-95 flex flex-col items-center gap-2 pt-10 pb-6 z-40 md:hidden animate-fade-in">
          <Link
            to="/"
            className="text-white text-3xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
            onClick={() => {
              setMenuOpen(false);
              window.scrollTo(0, 0);
            }}
          >
            INICIO
          </Link>
          <Link
            to="/menu"
            className="text-white text-3xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
            onClick={() => {
              setMenuOpen(false);
              window.scrollTo(0, 0);
            }}
          >
            MENÚ
          </Link>
          <Link
            to="/caja"
            className="text-white text-3xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
            onClick={() => {
              setMenuOpen(false);
              window.scrollTo(0, 0);
            }}
          >
            VENTAS
          </Link>
          {user ? (
            <Link
              to="/tarjeta"
              onClick={() => {
                window.scrollTo(0, 0);
              }}
              className="bg-orange-500 uppercase text-[var(--color-blanco)] p-2 rounded hover:bg-orange-700 transition text-lg text-center font-montserrat font-bold"
            >
              Tarjeta VIP
            </Link>
          ) : (
            <Link
              to="/"
              onClick={() => {
                window.scrollTo(0, 0);
              }}
              className="bg-orange-500 uppercase text-[var(--color-blanco)] p-2 rounded hover:bg-orange-700 transition text-lg text-center font-montserrat font-bold"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      )}

      <h1 className="text-5xl font-sonori uppercase pt-28 text-center text-orange-500 mb-4">
        Perfil de usuario
      </h1>
      <div className="mb-4 mt-4 text-center">
        <span className="font-semibold text-orange-500">
          Nombre:
        </span>{" "}
        {editandoNombre ? (
          <span>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="border border-orange-500 text-black rounded px-2 py-1"
              maxLength={40}
            />
            <button
              className="ml-2 bg-orange-500 text-white px-2 py-1 rounded"
              onClick={async () => {
                await updateDoc(doc(db, "clientes", clienteUid), {
                  nombre: nuevoNombre,
                });
                setEditandoNombre(false);
                setDatos({ ...datos, nombre: nuevoNombre });
                toast.success("Nombre actualizado");
              }}
            >
              Guardar
            </button>
            <button
              className="ml-2 bg-gray-300 text-gray-700 px-2 py-1 rounded"
              onClick={() => setEditandoNombre(false)}
            >
              Cancelar
            </button>
          </span>
        ) : (
          <span>
            {datos?.nombre || datos?.telefono || "Usuario"}
            <button
              className="ml-2 text-sm bg-orange-500 text-white px-2 py-1 rounded"
              onClick={() => {
                setNuevoNombre(datos?.nombre || "");
                setEditandoNombre(true);
              }}
            >
              Editar
            </button>
          </span>
        )}
      </div>
      <div className="mb-4 text-center">
        {user?.email && (
          <span>
            <span className="font-semibold text-orange-500">
              Correo:
            </span>{" "}
            {user.email}
          </span>
        )}
        {!user?.email && datos?.telefono && (
          <span>
            <span className="font-semibold text-orange-500">
              Teléfono:
            </span>{" "}
            {datos.telefono}
          </span>
        )}
      </div>

      {rol === "admin" && (
        <div className="flex flex-col items-center justify-center text-center text-md font-bold text-orange-500 mb-2">
          Rol: Administrador
          {fechaExpiracion && (
            <div className="mt-2 text-base font-semibold text-yellow-900 bg-yellow-100 rounded px-2 py-1 inline-block">
              Fecha de expiración:{" "}
              {typeof fechaExpiracion === "string"
                ? new Date(fechaExpiracion).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : fechaExpiracion.toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
            </div>
          )}
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
      )}
      {rol === "caja" && (
        <div className="text-center text-md font-bold text-orange-500 mb-2">
          Rol: Caja
        </div>
      )}
      {esDueno && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg max-w-md p-4 mx-auto my-4 text-center text-black">
          <h2 className="text-lg font-bold text-yellow-800 mb-2">
            Panel de Membresía (Solo dueño)
          </h2>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <>
              {/* Configuración de día de renovación en acordeón */}
              <div className="mb-4">
                <button
                  onClick={() => setAcordeonOpen((v) => !v)}
                  className="w-full flex justify-between items-center bg-yellow-200 px-4 py-2 rounded font-semibold text-yellow-900 hover:bg-yellow-300 transition"
                >
                  Configuración de día de renovación
                  <span>{acordeonOpen ? "▲" : "▼"}</span>
                </button>
                {acordeonOpen && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <label className="font-semibold">
                      Día de renovación:
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={diaRenovacion}
                        onChange={(e) =>
                          setDiaRenovacion(Number(e.target.value))
                        }
                        className="border rounded px-2 py-1 w-20 ml-2"
                      />
                    </label>
                    <button
                      onClick={async () => {
                        setLoading(true);
                        await setDoc(doc(db, "configuracion", "membresia"), {
                          ultimoPago: fechaExpiracion,
                          diaRenovacion,
                          mesesPagados,
                        });
                        toast.success("Día de renovación actualizado");
                        setAcordeonOpen(false);
                        setLoading(false);
                      }}
                      className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 font-semibold"
                      disabled={loading}
                    >
                      Guardar configuración
                    </button>
                  </div>
                )}
              </div>
              {/* Mostrar fecha de expiración y renovación solo si ya está configurado */}
              {fechaExpiracion ? (
                <>
                  <div className="mb-2">
                    <span className="font-semibold">
                      Fecha actual de expiración:
                    </span>{" "}
                    {new Date(fechaExpiracion).toLocaleString("es-MX", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-center justify-center mb-2">
                    <label className="font-semibold mx-2">
                      Meses a renovar:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={mesesPagados}
                      onChange={(e) => setMesesPagados(Number(e.target.value))}
                      className="border rounded px-2 py-1 w-20"
                    />
                    <button
                      onClick={renovarMeses}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 font-semibold"
                      disabled={loading}
                    >
                      Renovar meses siguientes
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-center justify-center mb-2">
                    <input
                      type="date"
                      value={nuevaFecha}
                      onChange={(e) => setNuevaFecha(e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                    <button
                      onClick={modificarFecha}
                      className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 font-semibold"
                      disabled={loading || !nuevaFecha}
                    >
                      Modificar fecha manualmente
                    </button>
                  </div>
                  <div className="text-sm text-gray-700 mt-2">
                    La membresía se renovará el día <b>{diaRenovacion}</b> de
                    cada mes.
                  </div>
                </>
              ) : (
                <div className="mb-4">
                  <div className="mb-2 text-yellow-900 font-semibold">
                    Aún no hay fecha de expiración registrada.
                  </div>
                  <div className="mb-2 text-gray-800">
                    Día de renovación configurado: <b>{diaRenovacion}</b>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-center justify-center mb-2">
                    <label className="font-semibold mx-2">
                      Meses a renovar:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={mesesPagados}
                      onChange={(e) => setMesesPagados(Number(e.target.value))}
                      className="border rounded px-2 py-1 w-20"
                    />
                    <button
                      onClick={renovarHoy}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 font-semibold"
                      disabled={loading}
                    >
                      Realizar primera renovación
                    </button>
                  </div>
                  <div className="text-sm text-gray-700 mt-2">
                    Configura el día de renovación y realiza la primera
                    renovación para activar la membresía.
                  </div>
                </div>
              )}
            </>
          )}
          {/* Historial de renovaciones */}
          <div className="mt-6 text-left">
            <h3 className="text-md font-bold text-yellow-800 mb-2">
              Historial de renovaciones
            </h3>
            {historial.length === 0 ? (
              <p className="text-gray-500">No hay renovaciones registradas.</p>
            ) : (
              <ul className="text-sm max-h-64 overflow-y-auto">
                {historial.map((item, idx) => (
                  <li key={idx} className="mb-2 border-b pb-2">
                    <b>
                      {item.tipo === "renovacion"
                        ? "Renovación"
                        : "Modificación"}
                    </b>{" "}
                    el{" "}
                    <span className="text-orange-500">
                      {new Date(item.fechaRenovacion).toLocaleString("es-MX", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <br />
                    Usuario:{" "}
                    <span className="text-gray-700">{item.usuario}</span>
                    <br />
                    Día de renovación: <b>{item.diaRenovacion}</b>, meses
                    pagados: <b>{item.mesesPagados}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <div className="text-center mt-6">
        <button
          onClick={logout}
          className="bg-[var(--color-promocion)] text-white px-4 py-2 rounded shadow transition"
        >
          Cerrar sesión
        </button>
      </div>
    </section>
  );
};

export default Perfil;
