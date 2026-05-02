/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  setDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import { Html5Qrcode } from "html5-qrcode";
import CanjearRecompensas from "./CanjearRecompensas";
import { toast } from "react-toastify";
import { BarLoader } from "react-spinners";
import Modal from "react-modal";
import { obtenerEstadoRecompensas } from "../data/recompensasPorPuntos";

const PUNTOS_POR_PESO = 1; // 1 punto por cada $1 gastado

function esDispositivoMovil() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

function TarjetaInfo({ uid }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!uid) return;
    const fetchInfo = async () => {
      try {
        const ref = doc(db, "clientes", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setInfo(snap.data());
        } else {
          setInfo(null);
        }
      } catch {
        setInfo(null);
      }
    };
    fetchInfo();
  }, [uid]);

  if (!info)
    return (
      <div className="mb-2 text-center text-gray-400 font-montserrat">
        Cargando datos de la tarjeta...
      </div>
    );

  return (
    <div className="mb-4 p-2 rounded bg-slate-800 text-left font-montserrat">
      <div className="font-bold text-[var(--color-principal)]">
        {info.nombre || "Sin nombre"}
      </div>
      <div className="text-sm text-white">
        {info.correo ? "Correo: " + info.correo : "Teléfono: " + info.telefono}
      </div>
      <div className="text-sm text-white">Tarjeta: {info.uid}</div>
      <div className="text-sm text-white">
        Puntos actuales:{" "}
        <span className="font-bold">{info.puntos?.toFixed(2) || 0}</span>
      </div>
    </div>
  );
}

export default function RegistrarVisita({
  onUpdate,
  clienteUid,
  ocultarCanje = false,
}) {
  const metodosDisponibles = [
    {
      id: "qr",
      label: "Escanear QR",
      description: "Lee la tarjeta digital del cliente con la cámara.",
    },
    {
      id: "telefono",
      label: "Con teléfono",
      description: "Busca o crea clientes usando su número celular.",
    },
    {
      id: "tarjeta",
      label: "Con tarjeta",
      description: "Ingresa el número de la tarjeta física manualmente.",
    },
    {
      id: "busqueda",
      label: "Búsqueda general",
      description: "Encuentra al cliente por nombre, correo o teléfono.",
    },
  ];

  // Estados principales
  const [scanning, setScanning] = useState(false);
  const [manualUid, setManualUid] = useState("");
  const [montoGastado, setMontoGastado] = useState("");
  const [buscarPhone, setBuscarPhone] = useState("+52");
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [loading, setLoading] = useState(false);
  const qrRef = useRef(null);
  const scanner = useRef(null);
  const [metodo, setMetodo] = useState("qr"); // "qr", "telefono", "tarjeta", "busqueda"
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscandoGeneral, setBuscandoGeneral] = useState(false);
  const [clienteBusquedaSeleccionado, setClienteBusquedaSeleccionado] =
    useState(null);
  const [loadingVisitaBusqueda, setLoadingVisitaBusqueda] = useState(false);
  const [modalPuntos, setModalPuntos] = useState({
    mostrar: false,
    cliente: null,
    puntosTotales: 0,
    puntosGanados: 0,
  });

  const cerrarScanner = async ({ resetState = true } = {}) => {
    const instanciaScanner = scanner.current;

    if (!instanciaScanner) {
      if (resetState) {
        setScanning(false);
      }
      return;
    }

    try {
      await instanciaScanner.stop();
    } catch {
      // Ignorar estados donde el scanner ya fue detenido.
    }

    try {
      await instanciaScanner.clear();
    } catch {
      // Ignorar errores al limpiar el contenedor si ya no existe.
    }

    scanner.current = null;

    if (qrRef.current) {
      qrRef.current.innerHTML = "";
    }

    if (resetState) {
      setScanning(false);
    }
  };

  // Limpia estados al desmontar
  useEffect(() => {
    return () => {
      void cerrarScanner({ resetState: false });
    };
  }, []);

  // Normaliza el teléfono
  const normalizarPhone = (p) => {
    if (!p) return "";
    let val = p.replace(/\s/g, "");
    val = val.replace(/[^+\d]/g, "");
    if (!val.startsWith("+")) {
      val = "+52" + val.replace(/\D/g, "");
    }
    return val;
  };

  // Buscar cliente por teléfono
  const buscarClientePorTelefono = async () => {
    const telefono = normalizarPhone(buscarPhone);
    if (!telefono || telefono.length < 4) {
      toast.error("Ingresa un número válido.");
      return;
    }
    setLoading(true);
    setClienteEncontrado(null);
    try {
      const q = query(
        collection(db, "clientes"),
        where("telefono", "==", telefono),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        setClienteEncontrado({ id: d.id, ...d.data() });
        toast.success("Cliente encontrado");
      } else {
        setClienteEncontrado(null);
        toast.info("No se encontró cliente con ese número");
      }
    } catch (err) {
      toast.error("Error al buscar cliente");
    } finally {
      setLoading(false);
    }
  };

  // Crear cliente por teléfono
  const crearClientePorTelefono = async (nombre = "") => {
    const telefono = normalizarPhone(buscarPhone);
    if (!telefono || telefono.length < 4) {
      toast.error("Ingresa un número válido para crear cliente.");
      return;
    }
    setLoading(true);
    try {
      let uidPersonalizado;
      let existe = true;
      while (existe) {
        uidPersonalizado = Math.floor(
          10000000 + Math.random() * 90000000,
        ).toString();
        const ref = doc(db, "clientes", uidPersonalizado);
        const snap = await getDoc(ref);
        existe = snap.exists();
      }
      await setDoc(doc(db, "clientes", uidPersonalizado), {
        nombre: nombre || "",
        telefono,
        puntos: 0,
        puntosAcumulados: 0,
        ultimaVisita: null,
        uid: uidPersonalizado,
        authUid: null,
        recompensas: [],
        recompensasCanjeadas: 0,
        creado: serverTimestamp(),
        creadoPor: "caja",
        verificado: false,
        disponible: false,
      });
      toast.success("Cliente creado con éxito");
      setTimeout(buscarClientePorTelefono, 200);
    } catch (err) {
      toast.error("Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  // Registrar visita (ahora soporta tarjetas físicas enlazadas)
  const registrarVisita = async (uidDocId, montoGastado) => {
    setLoading(true);
    try {
      console.log("Iniciando registrarVisita", { uidDocId, montoGastado });
      // Buscar primero en tarjetasFisicas
      const refTarjeta = doc(db, "tarjetasFisicas", uidDocId);
      const snapTarjeta = await getDoc(refTarjeta);
      let esTarjetaFisica = false;
      let refCliente = null;
      let cliente = null;
      let puntosAntes = 0;
      let puntosGanados = parseFloat(montoGastado) * PUNTOS_POR_PESO;
      let puntosTotales = 0;
      let puntosAcumulados = 0;

      if (snapTarjeta.exists()) {
        const dataTarjeta = snapTarjeta.data();
        console.log("Tarjeta física encontrada:", dataTarjeta);
        if (dataTarjeta.enlazadaA) {
          // Tarjeta enlazada: sumar puntos al usuario
          refCliente = doc(db, "clientes", dataTarjeta.enlazadaA);
          const snapCliente = await getDoc(refCliente);
          if (!snapCliente.exists()) {
            toast.error("❌ Usuario enlazado no encontrado.");
            setLoading(false);
            return;
          }
          cliente = snapCliente.data();
          puntosAntes = cliente.puntos || 0;
          puntosTotales = puntosAntes + puntosGanados;
          puntosAcumulados = (cliente.puntosAcumulados || 0) + puntosGanados;
          await updateDoc(refCliente, {
            ultimaVisita: serverTimestamp(),
            puntos: puntosTotales,
            puntosAcumulados,
          });
          await addDoc(collection(db, "visitas"), {
            clienteUid: dataTarjeta.enlazadaA,
            nombre: cliente.nombre || "",
            correo: cliente.correo || "",
            fecha: new Date(),
            puntosAntes,
            puntosGanados,
            puntosDespues: puntosTotales,
            montoGastado: parseFloat(montoGastado),
            adminUid: clienteUid,
            numeroTarjetaFisica: uidDocId,
          });
          await updateDoc(refCliente, {
            feedback: {
              tipo: "success",
              mensaje: `¡Ganaste ${puntosGanados.toFixed(2)} puntos por tu compra!`,
              timestamp: Date.now(),
            },
          });
        } else {
          // Tarjeta física no enlazada: sumar puntos en la tarjeta física
          esTarjetaFisica = true;
          puntosAntes = dataTarjeta.puntos || 0;
          puntosTotales = puntosAntes + puntosGanados;
          await updateDoc(refTarjeta, {
            puntos: puntosTotales,
            ultimaVisita: serverTimestamp(),
          });
          await addDoc(collection(db, "visitas"), {
            clienteUid: uidDocId,
            nombre: dataTarjeta.nombre || "",
            correo: dataTarjeta.correo || "",
            fecha: new Date(),
            puntosAntes,
            puntosGanados,
            puntosDespues: puntosTotales,
            montoGastado: parseFloat(montoGastado),
            adminUid: clienteUid,
            numeroTarjetaFisica: uidDocId,
          });
        }
      } else {
        // No existe en tarjetasFisicas, buscar en clientes (flujo anterior)
        refCliente = doc(db, "clientes", uidDocId);
        const snapCliente = await getDoc(refCliente);
        if (!snapCliente.exists()) {
          toast.error("❌ Cliente no encontrado.");
          setLoading(false);
          return;
        }
        cliente = snapCliente.data();
        puntosAntes = cliente.puntos || 0;
        puntosTotales = puntosAntes + puntosGanados;
        puntosAcumulados = (cliente.puntosAcumulados || 0) + puntosGanados;
        await updateDoc(refCliente, {
          ultimaVisita: serverTimestamp(),
          puntos: puntosTotales,
          puntosAcumulados,
        });
        await addDoc(collection(db, "visitas"), {
          clienteUid: uidDocId,
          nombre: cliente.nombre || "",
          correo: cliente.correo || "",
          fecha: new Date(),
          puntosAntes,
          puntosGanados,
          puntosDespues: puntosTotales,
          montoGastado: parseFloat(montoGastado),
          adminUid: clienteUid,
        });
        await updateDoc(refCliente, {
          feedback: {
            tipo: "success",
            mensaje: `¡Ganaste ${puntosGanados.toFixed(2)} puntos por tu compra!`,
            timestamp: Date.now(),
          },
        });
      }
      toast.success(
        `Visita registrada. Ganaste ${puntosGanados.toFixed(2)} puntos.`,
      );
      onUpdate?.();
      setModalPuntos({
        mostrar: true,
        cliente: { ...cliente, id: refCliente ? refCliente.id : uidDocId },
        puntosTotales,
        puntosGanados,
      });
    } catch (err) {
      console.error("Error en registrarVisita:", err);
      toast.error("❌ Error al registrar visita: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const cerrarModalPuntos = () => {
    setModalPuntos({
      mostrar: false,
      cliente: null,
      puntosTotales: 0,
      puntosGanados: 0,
    });
    setClienteEncontrado(null);
    setNombreNuevo("");
    setBuscarPhone("+52");
    setMontoGastado("");
    setClienteBusquedaSeleccionado(null);
  };

  const estadoModalRecompensas = obtenerEstadoRecompensas(
    modalPuntos.puntosTotales,
  );
  const metodoActivo =
    metodosDisponibles.find((item) => item.id === metodo) ||
    metodosDisponibles[0];

  const buscarClientesGeneral = async () => {
    const valor = busqueda.trim();
    if (!valor) {
      setResultadosBusqueda([]);
      return;
    }

    setBuscandoGeneral(true);
    try {
      const snap = await getDocs(collection(db, "clientes"));
      const resultados = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const nombre = (data.nombre || "").toLowerCase();
        const telefono = (data.telefono || "").toLowerCase();
        const correo = (data.correo || "").toLowerCase();
        const termino = valor.toLowerCase();

        if (
          nombre.includes(termino) ||
          telefono.includes(termino) ||
          correo.includes(termino)
        ) {
          resultados.push({ id: docSnap.id, ...data });
        }
      });
      setResultadosBusqueda(resultados.slice(0, 10));
    } catch (error) {
      console.error("buscarClientesGeneral:", error);
      toast.error("Error al buscar clientes.");
    } finally {
      setBuscandoGeneral(false);
    }
  };

  // Verifica tarjeta física y muestra el flujo adecuado
  const verificarTarjetaYRegistrar = async (uid) => {
    setLoading(true);
    try {
      // Buscar primero en tarjetasFisicas
      const refTarjeta = doc(db, "tarjetasFisicas", uid);
      const snapTarjeta = await getDoc(refTarjeta);
      if (snapTarjeta.exists()) {
        const tarjeta = snapTarjeta.data();
        // Si está enlazada, buscar el usuario
        if (tarjeta.enlazadaA) {
          const refCliente = doc(db, "clientes", tarjeta.enlazadaA);
          const snapCliente = await getDoc(refCliente);
          if (snapCliente.exists()) {
            setClienteEncontrado({
              id: tarjeta.enlazadaA,
              ...snapCliente.data(),
              esTarjetaFisica: false,
              numeroTarjetaFisica: uid,
            });
          } else {
            toast.error("Usuario enlazado no encontrado.");
            setClienteEncontrado(null);
          }
        } else {
          // No está enlazada, sumar puntos en la tarjeta física
          setClienteEncontrado({
            id: uid,
            ...tarjeta,
            esTarjetaFisica: true,
          });
        }
        setLoading(false);
        return;
      }
      // Si no existe en tarjetasFisicas, buscar en clientes (flujo anterior)
      const ref = doc(db, "clientes", uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        toast.error("Tarjeta no encontrada.");
        setLoading(false);
        return;
      }
      const cliente = snap.data();
      if (cliente.disponible === true) {
        toast.info("Tarjeta física disponible. Registra nuevo cliente.");
        setClienteEncontrado({
          id: uid,
          ...cliente,
          esTarjetaFisica: true,
        });
      } else {
        setClienteEncontrado({
          id: uid,
          ...cliente,
          esTarjetaFisica: false,
        });
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      toast.error("Error al verificar tarjeta.");
    }
  };

  // Escaneo QR
  const startScanner = () => {
    if (scanner.current || scanning) {
      return;
    }

    setScanning(true);
    scanner.current = new Html5Qrcode("qr-reader");
    let yaProcesado = false;
    scanner.current
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (uidEscaneado) => {
          if (!uidEscaneado || yaProcesado) return;
          yaProcesado = true;
          await cerrarScanner();
          verificarTarjetaYRegistrar(uidEscaneado);
        },
        (err) => {
          console.warn("QR Error", err);
        },
      )
      .catch((err) => {
        toast.error("❌ Error al iniciar cámara.");
        void cerrarScanner();
      });
  };

  return (
    <div className="w-full text-center">
      <section className="mx-auto mt-4 w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-black/10 bg-[var(--color-fondo)] shadow-2xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-black via-[#191919] to-[#2d2200] px-4 py-5 text-left md:px-6">
          <span className="inline-flex rounded-full border border-[var(--color-principal)]/20 bg-[var(--color-principal)]/10 px-4 py-1 text-sm uppercase tracking-[0.24em] text-[var(--color-principal)]">
            Operación de caja
          </span>
          <h2 className="mt-4 text-4xl uppercase text-white">
            Registrar visita
          </h2>
          <p className="mt-2 max-w-2xl text-lg text-white/70">
            Selecciona el método de captura y registra la compra del cliente.
          </p>
        </div>

        <div className="">
          <div className="border-y border-white/10 bg-white/[0.04] p-4 text-left shadow-lg">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-white/55">
                  Método activo
                </p>
                <h3 className="mt-2 text-3xl text-[var(--color-principal)]">
                  {metodoActivo.label}
                </h3>
                <p className="mt-1 max-w-2xl text-white/70">
                  {metodoActivo.description}
                </p>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
              {metodosDisponibles.map((item) => {
                const activo = metodo === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
                      activo
                        ? "border-[var(--color-principal)] bg-[var(--color-principal)] text-[var(--color-negro)] shadow-lg"
                        : "border-white/10 bg-black/25 text-white hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                    onClick={() => setMetodo(item.id)}
                  >
                    <span className="block text-xl uppercase">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Escanear QR */}
          {metodo === "qr" && (
            <div className="bg-black/20 p-4 md:p-5">
              <div className="mb-4 text-left">
                <p className="text-sm uppercase tracking-[0.22em] text-white/55">
                  Escaneo en vivo
                </p>
                <p className="mt-1 text-white/75">
                  Usa la cámara para leer el QR del cliente y registrar la
                  compra rápidamente.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 mb-4">
                {!scanning && (
                  <button
                    onClick={startScanner}
                    className="rounded-full bg-[var(--color-principal)] px-6 py-3 text-lg uppercase text-[var(--color-negro)] shadow-lg hover:bg-[var(--color-principalHover)]"
                  >
                    Escanear código QR
                  </button>
                )}
                {scanning && (
                  <button
                    onClick={async () => {
                      try {
                        await cerrarScanner();
                        toast.info("Escaneo cancelado.");
                      } catch (err) {
                        toast.error("Error al cancelar escaneo");
                      }
                    }}
                    className="mt-2 rounded-full bg-[var(--color-promocion)] px-6 py-3 text-[var(--color-blanco)] hover:bg-[var(--color-promocionHover)]"
                  >
                    Cancelar escaneo
                  </button>
                )}
              </div>
              <div
                id="qr-reader"
                ref={qrRef}
                className={
                  scanning
                    ? "my-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-2"
                    : ""
                }
              />
            </div>
          )}

          {/* 2. Ingresar número de tarjeta manualmente */}
          {metodo === "tarjeta" && (
            <div className="mb-4 bg-black/20 p-4 text-left md:p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/55">
                Tarjeta física
              </p>
              <label className="mt-3 block text-[var(--color-principal)]">
                Ingresa número de tarjeta física:
              </label>
              <input
                type="text"
                placeholder="12345678"
                value={manualUid}
                onChange={(e) => setManualUid(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white px-4 py-3 text-lg text-black"
              />
              <button
                onClick={() => verificarTarjetaYRegistrar(manualUid)}
                disabled={loading || !manualUid}
                className="mt-3 rounded-full bg-[var(--color-principal)] px-5 py-3 text-[var(--color-negro)] transition hover:bg-[var(--color-principalHover)] disabled:opacity-50"
              >
                Buscar tarjeta
              </button>
            </div>
          )}

          {/* 3. Buscar o crear cliente por teléfono */}
          {metodo === "telefono" && (
            <div className="w-full bg-black/20 p-4 text-left md:p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/55">
                Teléfono del cliente
              </p>
              <label className="mt-3 block text-[var(--color-principal)]">
                Buscar por número de teléfono
              </label>
              <div className="mt-2 flex w-full flex-col gap-2 md:flex-row">
                <input
                  type="tel"
                  placeholder="+526531231234"
                  value={buscarPhone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\s/g, "");
                    if (!val.startsWith("+"))
                      val = "+52" + val.replace(/\D/g, "");
                    setBuscarPhone(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === " ") e.preventDefault();
                  }}
                  className="w-full rounded-2xl border border-white/15 bg-white px-4 py-3 text-black md:w-3/4"
                />
                <button
                  onClick={buscarClientePorTelefono}
                  disabled={loading}
                  className="w-full rounded-full bg-[var(--color-principal)] px-4 py-3 font-medium text-[var(--color-negro)] hover:bg-[var(--color-principalHover)] disabled:opacity-50 md:w-1/4"
                >
                  {loading ? "Buscando..." : "Buscar"}
                </button>
              </div>
              {clienteEncontrado === null && !loading && (
                <div className="mt-3 flex w-full flex-col gap-2 md:flex-row">
                  <input
                    type="text"
                    placeholder="Nombre (opcional)"
                    value={nombreNuevo}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-white px-4 py-3 text-black md:w-3/4"
                  />
                  <button
                    onClick={() => crearClientePorTelefono(nombreNuevo)}
                    disabled={loading}
                    className="w-full rounded-full bg-green-500 px-4 py-3 text-white hover:bg-green-600 disabled:opacity-50 md:w-1/4"
                  >
                    {loading ? "Creando..." : "Crear cliente"}
                  </button>
                </div>
              )}
            </div>
          )}

          {metodo === "busqueda" && (
            <div className="mb-2 mt-2 w-full bg-black/20 p-4 text-left md:p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/55">
                Búsqueda amplia
              </p>
              <label className="mt-3 block text-xl uppercase text-[var(--color-principal)]">
                Búsqueda general
              </label>
              <div className="mt-2 flex w-full flex-col gap-2 md:flex-row">
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o correo"
                  value={busqueda}
                  onChange={async (e) => {
                    setBusqueda(e.target.value);
                    const valor = e.target.value.trim();
                    if (valor.length >= 3) {
                      setBuscandoGeneral(true);
                      try {
                        const q = query(collection(db, "clientes"));
                        const snap = await getDocs(q);
                        const resultados = [];
                        snap.forEach((docSnap) => {
                          const d = docSnap.data();
                          const nombre = (d.nombre || "").toLowerCase();
                          const telefono = (d.telefono || "").toLowerCase();
                          const correo = (d.correo || "").toLowerCase();
                          const val = valor.toLowerCase();
                          if (
                            nombre.includes(val) ||
                            telefono.includes(val) ||
                            correo.includes(val)
                          ) {
                            resultados.push({ id: docSnap.id, ...d });
                          }
                        });
                        setResultadosBusqueda(resultados.slice(0, 10));
                      } catch (err) {
                        toast.error("Error al buscar clientes.");
                      } finally {
                        setBuscandoGeneral(false);
                      }
                    } else {
                      setResultadosBusqueda([]);
                    }
                  }}
                  className="w-full rounded-2xl border border-white/15 bg-white px-4 py-3 text-lg text-black"
                />
                <button
                  onClick={buscarClientesGeneral}
                  disabled={buscandoGeneral}
                  className="rounded-full bg-[var(--color-secundario)] px-5 py-3 text-lg uppercase text-[var(--color-negro)] hover:bg-[var(--color-secundarioHover)] disabled:opacity-50"
                >
                  {buscandoGeneral ? "Buscando..." : "Buscar"}
                </button>
              </div>
              {resultadosBusqueda.length > 0 && (
                <div className="mt-4 rounded-2xl border border-[var(--color-principalClaro)] bg-slate-700 p-4 text-left text-white shadow-lg">
                  <p className="text-2xl text-[var(--color-principal)]">
                    Resultados:
                  </p>
                  <ul className="mt-3 space-y-2">
                    {resultadosBusqueda.map((cliente) => (
                      <li
                        key={cliente.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-lg"
                      >
                        <button
                          onClick={() => {
                            setClienteBusquedaSeleccionado(cliente);
                            setResultadosBusqueda([]);
                            setBusqueda("");
                          }}
                        >
                          {cliente.nombre || "Sin nombre"}
                          {cliente.telefono ? ` - ${cliente.telefono}` : ""}
                          {cliente.correo ? ` - ${cliente.correo}` : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {clienteBusquedaSeleccionado && (
                <div className="mt-4 rounded-2xl border border-[var(--color-principalClaro)] bg-slate-700 p-4 text-left shadow-lg">
                  <div className="text-2xl text-[var(--color-principal)]">
                    {clienteBusquedaSeleccionado.nombre
                      ? `${clienteBusquedaSeleccionado.nombre}`
                      : ""}
                  </div>
                  <div className="text-xl text-gray-100">
                    {clienteBusquedaSeleccionado.telefono
                      ? `${clienteBusquedaSeleccionado.telefono}`
                      : ""}
                  </div>
                  <div className="text-xl text-gray-100">
                    {clienteBusquedaSeleccionado.uid
                      ? `Tarjeta: ${clienteBusquedaSeleccionado.uid}`
                      : ""}
                  </div>
                  <div className="text-xl text-gray-100">
                    {clienteBusquedaSeleccionado.correo
                      ? `${clienteBusquedaSeleccionado.correo}`
                      : ""}
                  </div>
                  <div className="text-xl text-gray-100">
                    Puntos actuales: {clienteBusquedaSeleccionado.puntos || 0}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Monto gastado ($)"
                    value={montoGastado}
                    onChange={(e) => setMontoGastado(e.target.value)}
                    className="mb-3 mt-3 w-full rounded-2xl border border-white/15 bg-white px-4 py-3 text-black"
                  />
                  <div className="flex flex-col gap-2 md:flex-row">
                    <button
                      onClick={() =>
                        registrarVisita(
                          clienteBusquedaSeleccionado.id,
                          montoGastado,
                        )
                      }
                      disabled={loadingVisitaBusqueda || !montoGastado}
                      className="rounded-full bg-[var(--color-principal)] px-4 py-3 text-lg uppercase text-[var(--color-negro)] hover:bg-[var(--color-secundarioHover)] disabled:opacity-50"
                    >
                      {loadingVisitaBusqueda
                        ? "Registrando..."
                        : "Registrar visita"}
                    </button>
                    <button
                      onClick={() => {
                        setClienteBusquedaSeleccionado(null);
                        setBusqueda("");
                        setMontoGastado("");
                      }}
                      className="rounded-full bg-gray-200 px-4 py-3 text-lg uppercase text-gray-800"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Mostrar el flujo adecuado según el cliente encontrado */}
          {clienteEncontrado &&
          !modalPuntos.mostrar &&
          clienteEncontrado.esTarjetaFisica &&
          clienteEncontrado.disponible === true ? (
            // Tarjeta física disponible, registrar cliente y visita
            <div className="mt-4 rounded-[1.5rem] border border-[var(--color-principalClaro)] bg-[var(--color-blanco)] p-4 text-left shadow-lg">
              <p className=" text-center mb-2 text-lg tracking-wider text-[var(--color-negro)]">
                Tarjeta física disponible: {clienteEncontrado.id}
              </p>
              <p className=" text-center text-2xl mb-2">
                Registrar nuevo cliente
              </p>
              <label className=" text-orange-600 mb-1 block">
                Nombre (opcional)
              </label>
              <input
                type="text"
                placeholder="Nombre (opcional)"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                className="mb-2 w-full rounded-2xl border px-4 py-3"
              />
              <label className=" text-orange-600 mb-1 block">
                Teléfono (+52...)
              </label>
              <input
                type="tel"
                placeholder="Teléfono (+52...)"
                value={buscarPhone}
                onChange={(e) => setBuscarPhone(e.target.value)}
                className="mb-2 w-full rounded-2xl border px-4 py-3"
              />
              <label className=" text-orange-600 mb-1 block">
                Monto gastado ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Monto gastado ($)"
                value={montoGastado}
                onChange={(e) => setMontoGastado(e.target.value)}
                className="mb-3 w-full rounded-2xl border px-4 py-3"
              />
              <div className="flex flex-col gap-2 md:flex-row">
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      console.log(
                        "Actualizando cliente:",
                        clienteEncontrado.id,
                        nombreNuevo,
                        buscarPhone,
                      );
                      const clienteRef = doc(
                        db,
                        "clientes",
                        clienteEncontrado.id,
                      );
                      const clienteSnap = await getDoc(clienteRef);

                      // 1. Obtener la tarjeta física
                      const tarjetaRef = doc(
                        db,
                        "tarjetasFisicas",
                        clienteEncontrado.id,
                      );
                      const tarjetaSnap = await getDoc(tarjetaRef);
                      let puntosTarjeta = 0;
                      if (tarjetaSnap.exists()) {
                        const dataTarjeta = tarjetaSnap.data();
                        puntosTarjeta = dataTarjeta.puntos || 0;
                        // Actualizar tarjeta física: enlazada y no disponible
                        await updateDoc(tarjetaRef, {
                          disponible: false,
                          enlazadaA: clienteEncontrado.id,
                          puntos: 0, // Se transfieren los puntos
                        });
                      }

                      // 2. Crear o actualizar cliente, sumando los puntos de la tarjeta física
                      if (clienteSnap.exists()) {
                        await updateDoc(clienteRef, {
                          nombre: nombreNuevo,
                          telefono: buscarPhone,
                          disponible: false,
                          creado: serverTimestamp(),
                          puntos:
                            (clienteSnap.data()?.puntos || 0) + puntosTarjeta,
                          puntosAcumulados:
                            (clienteSnap.data()?.puntosAcumulados || 0) +
                            puntosTarjeta,
                        });
                      } else {
                        await setDoc(clienteRef, {
                          nombre: nombreNuevo,
                          telefono: buscarPhone,
                          disponible: false,
                          creado: serverTimestamp(),
                          puntos: puntosTarjeta,
                          puntosAcumulados: puntosTarjeta,
                          uid: clienteEncontrado.id,
                          authUid: null,
                          recompensas: [],
                          recompensasCanjeadas: 0,
                          ultimaVisita: null,
                          creadoPor: "caja",
                          verificado: false,
                        });
                      }

                      toast.success(
                        "Cliente registrado y tarjeta enlazada con éxito.",
                      );

                      // Registrar visita automáticamente si hay monto
                      if (montoGastado && parseFloat(montoGastado) > 0) {
                        await registrarVisita(
                          clienteEncontrado.id,
                          montoGastado,
                        );
                      }
                      setClienteEncontrado(null);
                      setNombreNuevo("");
                      setBuscarPhone("+52");
                      setMontoGastado("");
                    } catch (err) {
                      console.error(
                        "Error al registrar cliente o visita:",
                        err,
                      );
                      toast.error("Error al registrar cliente o visita.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !buscarPhone || !montoGastado}
                  className="rounded-full bg-green-500 px-4 py-3 text-white hover:bg-green-600 disabled:opacity-50"
                >
                  Registrar cliente y visita
                </button>
                <button
                  onClick={() => {
                    setClienteEncontrado(null);
                    setNombreNuevo("");
                    setBuscarPhone("+52");
                    setMontoGastado("");
                  }}
                  className="rounded-full bg-gray-200 px-4 py-3 text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : clienteEncontrado ? (
            // Cliente ya existe, mostrar TarjetaInfo y registrar visita
            <div className="mt-4 rounded-[1.5rem] border border-[var(--color-principalClaro)] bg-[var(--color-blanco)] p-4 text-left shadow-lg">
              <TarjetaInfo uid={clienteEncontrado.id} />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Monto gastado ($)"
                value={montoGastado}
                onChange={(e) => setMontoGastado(e.target.value)}
                className="mb-3 w-full rounded-2xl border px-4 py-3"
              />
              <div className="flex flex-col gap-2 md:flex-row">
                <button
                  onClick={() => {
                    console.log(
                      "Registrando visita para cliente:",
                      clienteEncontrado.id,
                      "Monto:",
                      montoGastado,
                    );
                    registrarVisita(clienteEncontrado.id, montoGastado);
                  }}
                  disabled={loading || !montoGastado}
                  className="rounded-full bg-[var(--color-principal)] px-4 py-3 text-[var(--color-negro)] hover:bg-[var(--color-secundarioHover)] disabled:opacity-50"
                >
                  {loading ? "Registrando..." : "Registrar visita"}
                </button>
                <button
                  onClick={() => {
                    setClienteEncontrado(null);
                    setBuscarPhone("+52");
                    setNombreNuevo("");
                    setMontoGastado("");
                  }}
                  className="rounded-full bg-gray-200 px-4 py-3 text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          <Modal
            isOpen={modalPuntos.mostrar}
            onRequestClose={cerrarModalPuntos}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30"
            ariaHideApp={false}
          >
            <div className="mx-auto w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
              <h2 className="mb-2 text-3xl font-bold text-orange-500">
                ¡Visita registrada!
              </h2>
              <p className="mb-2 text-lg">
                Puntos ganados:{" "}
                <span className="font-bold">
                  {modalPuntos.puntosGanados.toFixed(2)}
                </span>
              </p>
              <p className="mb-4 text-lg">
                Puntos totales:{" "}
                <span className="font-bold">
                  {modalPuntos.puntosTotales.toFixed(2)}
                </span>
              </p>
              {estadoModalRecompensas.disponibles.length > 0 ? (
                <div className="mb-4 rounded-2xl bg-orange-50 p-4 text-left">
                  <p className="mb-2 text-sm font-bold uppercase text-orange-600">
                    Ya puede canjear
                  </p>
                  <ul className="space-y-2 text-sm text-gray-800">
                    {estadoModalRecompensas.disponibles.map((recompensa) => (
                      <li key={recompensa.id}>
                        <span className="font-bold">{recompensa.nombre}</span>
                        {" - "}
                        {recompensa.puntos} pts
                      </li>
                    ))}
                  </ul>
                </div>
              ) : estadoModalRecompensas.siguiente ? (
                <p className="mb-4 text-md text-gray-700">
                  Te faltan {estadoModalRecompensas.siguiente.faltan.toFixed(2)}{" "}
                  puntos para canjear {estadoModalRecompensas.siguiente.nombre}.
                </p>
              ) : (
                <p className="mb-4 text-md text-gray-700">
                  Ya desbloqueó todas las recompensas por puntos.
                </p>
              )}
              <div className="flex justify-center">
                <button
                  onClick={cerrarModalPuntos}
                  className="rounded-full bg-gray-300 px-5 py-3 text-gray-800 hover:bg-gray-400"
                >
                  Continuar
                </button>
              </div>
            </div>
          </Modal>

          {loading && (
            <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[var(--color-principal)]">
              <BarLoader color="var(--color-principalClaro)" />
              Procesando...
            </div>
          )}
        </div>
      </section>
      {!ocultarCanje && <CanjearRecompensas />}
    </div>
  );
}
