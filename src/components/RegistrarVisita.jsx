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

const PUNTOS_POR_PESO = 0.05; // 1 punto por cada $20 gastados

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

export default function RegistrarVisita({ onUpdate, clienteUid }) {
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

  // Limpia estados al desmontar
  useEffect(() => {
    return () => {
      if (scanner.current) {
        scanner.current.stop().catch(() => {});
      }
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

  const usarPuntosParaCompra = async () => {
    if (!modalPuntos.cliente) {
      cerrarModalPuntos();
      return;
    }
    setLoading(true);
    try {
      const ref = doc(db, "clientes", modalPuntos.cliente.id);
      // Descontar todos los puntos (puedes ajustar la lógica si solo quieres descontar una parte)
      await updateDoc(ref, {
        puntosAcumulados: 0,
      });
      // Registrar el uso de puntos en la colección de visitas o en otra colección si lo prefieres
      await addDoc(collection(db, "usosPuntos"), {
        clienteUid: modalPuntos.cliente.id,
        puntosUsados: modalPuntos.puntosTotales,
        fecha: new Date(),
        adminUid: clienteUid,
      });
      toast.success("¡Puntos usados para completar la compra!");
    } catch (err) {
      toast.error("Error al usar los puntos.");
    } finally {
      setLoading(false);
      cerrarModalPuntos();
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
          await scanner.current.stop();
          setScanning(false);
          verificarTarjetaYRegistrar(uidEscaneado);
        },
        (err) => {
          console.warn("QR Error", err);
        },
      )
      .catch((err) => {
        toast.error("❌ Error al iniciar cámara.");
        setScanning(false);
      });
  };

  return (
    <div className="w-full text-center">
      <section className="max-w-sm mx-auto p-4 bg-[var(--color-fondo)] rounded shadow-lg mt-4">
        <h2 className="text-3xl uppercase mb-2 text-white">Registrar visita</h2>

        <div className="grid grid-cols-2 gap-2 justify-center mb-4">
          <button
            type="button"
            className={`px-3 py-1 rounded-full border transition ${
              metodo === "qr"
                ? "bg-[var(--color-principal)] text-black uppercase text-xl border-[var(--color-principal)]"
                : "bg-white text-black uppercase text-xl border-[var(--color-principalClaro)]"
            }`}
            onClick={() => setMetodo("qr")}
          >
            Escanear QR
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full border transition ${
              metodo === "telefono"
                ? "bg-[var(--color-principal)] text-black uppercase text-xl border-[var(--color-principal)]"
                : "bg-white text-black uppercase text-xl border-[var(--color-principalClaro)]"
            }`}
            onClick={() => setMetodo("telefono")}
          >
            Por teléfono
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full border transition ${
              metodo === "tarjeta"
                ? "bg-[var(--color-principal)] text-black uppercase text-xl border-[var(--color-principal)]"
                : "bg-white text-black uppercase text-xl border-[var(--color-principalClaro)]"
            }`}
            onClick={() => setMetodo("tarjeta")}
          >
            Por tarjeta
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full border transition ${
              metodo === "busqueda"
                ? "bg-[var(--color-principal)] text-black uppercase text-xl border-[var(--color-principal)]"
                : "bg-white text-black uppercase text-xl border-[var(--color-principalClaro)]"
            }`}
            onClick={() => setMetodo("busqueda")}
          >
            Búsqueda general
          </button>
        </div>

        {/* 1. Escanear QR */}
        {metodo === "qr" && (
          <div>
            <div className="flex flex-col items-center gap-2 mb-4">
              {!scanning && (
                <button
                  onClick={startScanner}
                  className="bg-[var(--color-principal)] text-[var(--color-negro)] text-lg uppercase px-4 py-2 rounded hover:bg-[var(--color-principalHover)]"
                >
                  Escanear código QR
                </button>
              )}
              {scanning && (
                <button
                  onClick={async () => {
                    if (scanner.current) {
                      try {
                        await scanner.current.stop();
                        setScanning(false);
                        toast.info("Escaneo cancelado.");
                      } catch (err) {
                        toast.error("Error al cancelar escaneo");
                      }
                    }
                  }}
                  className="mt-2 bg-[var(--color-promocion)] text-[var(--color-blanco)] px-4 py-2 rounded hover:bg-[var(--color-promocionHover)]"
                >
                  Cancelar escaneo
                </button>
              )}
            </div>
            <div
              id="qr-reader"
              ref={qrRef}
              className={scanning ? "my-4" : ""}
            />
          </div>
        )}

        {/* 2. Ingresar número de tarjeta manualmente */}
        {metodo === "tarjeta" && (
          <div className="flex flex-col w-full gap-2 justify-center mb-4">
            <label className=" text-[var(--color-principal)]">
              Ingresa número de tarjeta física:
            </label>
            <input
              type="text"
              placeholder="12345678"
              value={manualUid}
              onChange={(e) => setManualUid(e.target.value)}
              className="border px-3 py-1 rounded w-full"
            />
            <button
              onClick={() => verificarTarjetaYRegistrar(manualUid)}
              disabled={loading || !manualUid}
              className="bg-[var(--color-principal)] text-[var(--color-negro)]  px-3 py-1 rounded hover:bg-[var(--color-principalHover)] transition disabled:opacity-50"
            >
              Buscar tarjeta
            </button>
          </div>
        )}

        {/* 3. Buscar o crear cliente por teléfono */}
        {metodo === "telefono" && (
          <div className="w-full mt-4 mb-4">
            <label className=" text-[var(--color-principal)] block mb-1">
              Buscar por número de teléfono
            </label>
            <div className="w-full flex gap-1">
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
                className="w-3/4 border px-3 py-1 rounded"
              />
              <button
                onClick={buscarClientePorTelefono}
                disabled={loading}
                className="w-1/4 bg-[var(--color-secundario)] text-[var(--color-negro)] font-medium px-3 py-1 rounded hover:bg-[var(--color-secundarioHover)] disabled:opacity-50"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
            {clienteEncontrado === null && !loading && (
              <div className="w-full mt-2 flex gap-1">
                <input
                  type="text"
                  placeholder="Nombre (opcional)"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  className="w-3/4 border px-3 py-1 rounded"
                />
                <button
                  onClick={() => crearClientePorTelefono(nombreNuevo)}
                  disabled={loading}
                  className="w-1/4 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? "Creando..." : "Crear cliente"}
                </button>
              </div>
            )}
          </div>
        )}

        {metodo === "busqueda" && (
          <div className="w-full mt-2 mb-2">
            <label className="text-xl uppercase text-[var(--color-principal)] block mb-1">
              Búsqueda general
            </label>
            <div className="w-full flex gap-1">
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
                className="w-full text-lg border px-3 py-1 rounded"
              />
              <button
                onClick={buscarClientesGeneral}
                disabled={buscandoGeneral}
                className="bg-[var(--color-secundario)] uppercase text-[var(--color-negro)] text-lg px-3 py-1 rounded hover:bg-[var(--color-secundarioHover)] disabled:opacity-50"
              >
                {buscandoGeneral ? "Buscando..." : "Buscar"}
              </button>
            </div>
            {resultadosBusqueda.length > 0 && (
              <div className="mt-2 p-3 bg-slate-700 rounded border border-[var(--color-principalClaro)] text-white text-left">
                <p className="text-2xl text-[var(--color-principal)]">
                  Resultados:
                </p>
                <ul className="list-disc list-inside">
                  {resultadosBusqueda.map((cliente) => (
                    <li
                      key={cliente.id}
                      className="text-lg flex justify-between items-center py-1"
                    >
                      <span>
                        {cliente.nombre || "Sin nombre"}
                        {cliente.telefono ? ` - ${cliente.telefono}` : ""}
                        {cliente.correo ? ` - ${cliente.correo}` : ""}
                      </span>
                      <button
                        className="ml-2 bg-[var(--color-secundario)] text-[var(--color-negro)] px-2 py-1 rounded hover:bg-[var(--color-secundarioHover)]"
                        onClick={() => {
                          setClienteBusquedaSeleccionado(cliente);
                          setResultadosBusqueda([]);
                          setBusqueda("");
                        }}
                      >
                        Seleccionar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {clienteBusquedaSeleccionado && (
              <div className="mt-4 p-3 bg-slate-700 rounded border border-[var(--color-principalClaro)] text-left">
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
                  className="border text-xls px-3 py-1 rounded w-full mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      registrarVisita(
                        clienteBusquedaSeleccionado.id,
                        montoGastado,
                      )
                    }
                    disabled={loadingVisitaBusqueda || !montoGastado}
                    className="bg-[var(--color-principal)] uppercase text-lg text-[var(--color-negro)] px-3 py-1 rounded hover:bg-[var(--color-secundarioHover)] disabled:opacity-50"
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
                    className="bg-gray-200 text-lg uppercase text-gray-800 px-3 py-1 rounded"
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
          <div className="mt-4 p-3 bg-[var(--color-blanco)] rounded border border-[var(--color-principalClaro)] text-left">
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
              className="w-full border px-3 py-1 rounded mb-2"
            />
            <label className=" text-orange-600 mb-1 block">
              Teléfono (+52...)
            </label>
            <input
              type="tel"
              placeholder="Teléfono (+52...)"
              value={buscarPhone}
              onChange={(e) => setBuscarPhone(e.target.value)}
              className="w-full border px-3 py-1 rounded mb-2"
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
              className="w-full border px-3 py-1 rounded mb-2"
            />
            <div className="flex gap-2">
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
                      await registrarVisita(clienteEncontrado.id, montoGastado);
                    }
                    setClienteEncontrado(null);
                    setNombreNuevo("");
                    setBuscarPhone("+52");
                    setMontoGastado("");
                  } catch (err) {
                    console.error("Error al registrar cliente o visita:", err);
                    toast.error("Error al registrar cliente o visita.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !buscarPhone || !montoGastado}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
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
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : clienteEncontrado ? (
          // Cliente ya existe, mostrar TarjetaInfo y registrar visita
          <div className="mt-4 p-3 bg-[var(--color-blanco)] rounded border border-[var(--color-principalClaro)] text-left">
            <TarjetaInfo uid={clienteEncontrado.id} />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto gastado ($)"
              value={montoGastado}
              onChange={(e) => setMontoGastado(e.target.value)}
              className="border px-3 py-1 rounded w-full mb-2"
            />
            <div className="flex gap-2">
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
                className="bg-[var(--color-principal)] text-[var(--color-negro)] px-3 py-1 rounded hover:bg-[var(--color-secundarioHover)] disabled:opacity-50"
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
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded"
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
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold mb-2 text-orange-500">
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
            <p className="mb-4 text-md">
              ¿Desea usar sus puntos para completar la compra?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={usarPuntosParaCompra}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Sí, usar puntos
              </button>
              <button
                onClick={cerrarModalPuntos}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              >
                No, continuar sin usar puntos
              </button>
            </div>
          </div>
        </Modal>

        {loading && (
          <div className="flex justify-center items-center gap-2 mb-4 text-[var(--color-principal)] ">
            <BarLoader color="var(--color-principalClaro)" />
            Procesando...
          </div>
        )}
      </section>
      <CanjearRecompensas />
    </div>
  );
}
