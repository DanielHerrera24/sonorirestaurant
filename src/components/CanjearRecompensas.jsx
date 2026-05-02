import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  increment,
} from "firebase/firestore";
import { toast } from "react-toastify";
import {
  RECOMPENSAS_POR_PUNTOS,
  getMissingPoints,
} from "../data/recompensasPorPuntos";
import { IoClose } from "react-icons/io5";

export default function CanjearRecompensas() {
  const metodosDisponibles = [
    {
      id: "qr",
      label: "Escanear QR",
      description: "Lee la tarjeta digital y carga al cliente al instante.",
    },
    {
      id: "telefono",
      label: "Por teléfono",
      description: "Encuentra al cliente por su número celular.",
    },
    {
      id: "tarjeta",
      label: "Por tarjeta",
      description: "Busca una tarjeta física manualmente.",
    },
    {
      id: "busqueda",
      label: "Búsqueda general",
      description: "Ubica clientes por nombre, teléfono o correo.",
    },
  ];

  const [cliente, setCliente] = useState(null);
  const [scanning, setScanning] = useState(false);
  const qrRef = useRef(null);
  const scanner = useRef(null);
  const [modalCanje, setModalCanje] = useState(false);
  const [recompensaSeleccionada, setRecompensaSeleccionada] = useState(null);
  const [datosCanje, setDatosCanje] = useState({
    montoProducto: "",
    producto: "",
    porcentajeDescuento: "",
    montoTotal: "",
    montoAntesDescuento: "",
    descuentoGeneral: "",
  });
  const [tipoCanje, setTipoCanje] = useState(""); // "productoGratis", "descuentoProducto", "descuentoGeneral"
  const [metodo, setMetodo] = useState("qr"); // "qr", "telefono", "tarjeta", "busqueda"
  const [manualUid, setManualUid] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscandoGeneral, setBuscandoGeneral] = useState(false);
  const [buscarPhone, setBuscarPhone] = useState("+52");
  const [loadingTelefono, setLoadingTelefono] = useState(false);
  const puntosCliente = Number(cliente?.puntos || 0);
  const metodoActivo =
    metodosDisponibles.find((item) => item.id === metodo) ||
    metodosDisponibles[0];

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

  // Normaliza teléfono: quita espacios/caracteres y asegura prefijo + (por defecto +52)
  const normalizarPhone = (input) => {
    if (!input) return "";
    let val = input.toString().replace(/\s/g, "");
    val = val.replace(/[^+\d]/g, "");
    if (!val.startsWith("+")) {
      val = "+52" + val.replace(/\D/g, "");
    }
    return val;
  };

  // Buscar cliente por UID (doc id) o por campo 'uid' almacenado o por teléfono
  const buscarClientePorUid = async (uid) => {
    setCliente(null);
    try {
      // 1) Intentar doc por id
      const ref = doc(db, "clientes", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setCliente({ ...snap.data(), id: ref.id });
        toast.success("Cliente encontrado (por ID)");
        return;
      }

      // 2) Intentar buscar por campo 'uid' (si guardas uid personalizado)
      const qUid = query(collection(db, "clientes"), where("uid", "==", uid));
      const snapUid = await getDocs(qUid);
      if (!snapUid.empty) {
        const d = snapUid.docs[0];
        setCliente({ ...d.data(), id: d.id });
        toast.success("Cliente encontrado (por UID personalizado)");
        return;
      }

      // 3) Intentar buscar por teléfono (por si el escaneo devolvió el teléfono)
      const telefono = normalizarPhone(uid);
      if (telefono) {
        const qTel = query(
          collection(db, "clientes"),
          where("telefono", "==", telefono),
        );
        const snapTel = await getDocs(qTel);
        if (!snapTel.empty) {
          const d = snapTel.docs[0];
          setCliente({ ...d.data(), id: d.id });
          toast.success("Cliente encontrado (por teléfono)");
          return;
        }
      }

      toast.error("Cliente no encontrado.");
    } catch (error) {
      console.error("buscarClientePorUid:", error);
      toast.error("Error al buscar cliente.");
    }
  };

  const buscarClientesGeneral = async () => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) {
      toast.error("Ingresa un nombre, teléfono o correo para buscar.");
      return;
    }

    setBuscandoGeneral(true);
    try {
      const snap = await getDocs(collection(db, "clientes"));
      const coincidencias = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((clienteItem) => {
          const nombre = String(clienteItem.nombre || "").toLowerCase();
          const telefono = String(clienteItem.telefono || "").toLowerCase();
          const correo = String(clienteItem.correo || "").toLowerCase();

          return (
            nombre.includes(termino) ||
            telefono.includes(termino) ||
            correo.includes(termino)
          );
        })
        .slice(0, 15);

      setResultadosBusqueda(coincidencias);
      if (coincidencias.length === 0) {
        toast.info("No se encontraron clientes con ese criterio.");
      }
    } catch (error) {
      console.error("buscarClientesGeneral:", error);
      toast.error("Error al realizar la búsqueda general.");
    } finally {
      setBuscandoGeneral(false);
    }
  };

  const canjear = async (recompensa, detalles = {}) => {
    if (!cliente) {
      toast.error("No hay cliente seleccionado.");
      return;
    }

    if (puntosCliente < recompensa.puntos) {
      toast.error(
        "El cliente no tiene puntos suficientes para esta recompensa.",
      );
      return;
    }

    try {
      const ref = doc(db, "clientes", cliente.id);
      const puntosRestantes = puntosCliente - recompensa.puntos;

      await updateDoc(ref, {
        puntos: puntosRestantes,
        recompensasCanjeadas: increment(1),
        feedback: {
          tipo: "success",
          mensaje: `✅ Canjeaste ${recompensa.nombre} por ${recompensa.puntos} puntos.`,
          timestamp: Date.now(),
        },
      });

      // Registrar canje global
      await addDoc(collection(db, "recompensas"), {
        clienteUid: cliente.id,
        nombre: cliente.nombre || "",
        correo: cliente.correo || "",
        fecha: new Date(),
        recompensaId: recompensa.id,
        codigo: recompensa.id,
        mensaje: recompensa.nombre,
        canjeado: true,
        fechaCanje: new Date(),
        puntosCanjeados: recompensa.puntos,
        detallesCanje: {
          ...detalles,
          tipoCanje,
          recompensaNombre: recompensa.nombre,
        },
      });

      // Actualizar cliente localmente en UI
      setCliente({
        ...cliente,
        puntos: puntosRestantes,
        recompensasCanjeadas: (cliente.recompensasCanjeadas || 0) + 1,
      });

      toast.success("Recompensa canjeada correctamente.");
    } catch (err) {
      console.error("canjear:", err);
      toast.error("Error al canjear recompensa.");
      try {
        await updateDoc(doc(db, "clientes", cliente.id), {
          feedback: {
            tipo: "error",
            mensaje: "❌ Error al canjear recompensa.",
            timestamp: Date.now(),
          },
        });
      } catch (e) {
        console.error("Error guardando feedback:", e);
      }
    }
  };

  const startScanner = () => {
    if (scanner.current || scanning) {
      return;
    }

    setScanning(true);
    scanner.current = new Html5Qrcode("qr-reader-canjear");

    let yaProcesado = false;

    scanner.current
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: 250,
        },
        async (uidEscaneado) => {
          if (!uidEscaneado || yaProcesado) return;
          yaProcesado = true;

          await cerrarScanner();

          // usar búsqueda robusta para el valor escaneado
          await buscarClientePorUid(uidEscaneado);
        },
        (err) => {
          console.warn("QR Error", err);
        },
      )
      .catch((err) => {
        console.error("Error al iniciar escáner", err);
        void cerrarScanner();
        toast.error("No fue posible iniciar el escáner.");
      });
  };

  useEffect(() => {
    return () => {
      void cerrarScanner({ resetState: false });
    };
  }, []);

  useEffect(() => {
    if (tipoCanje === "descuentoProducto") {
      const monto = parseFloat(datosCanje.montoProducto) || 0;
      const porcentaje = parseFloat(datosCanje.porcentajeDescuento) || 0;
      const total = monto - (monto * porcentaje) / 100;
      setDatosCanje((prev) => ({
        ...prev,
        montoTotal: total > 0 ? total.toFixed(2) : "",
      }));
    }
  }, [datosCanje.montoProducto, datosCanje.porcentajeDescuento, tipoCanje]);

  useEffect(() => {
    if (tipoCanje === "descuentoGeneral") {
      const montoAntes = parseFloat(datosCanje.montoAntesDescuento) || 0;
      const descuento = parseFloat(datosCanje.descuentoGeneral) || 0;
      let total = montoAntes;

      if (descuento > 0) {
        if (descuento <= 100) {
          total -= (montoAntes * descuento) / 100; // Porcentaje
        } else {
          total -= descuento; // Monto fijo
        }
      }

      setDatosCanje((prev) => ({
        ...prev,
        montoTotal: total > 0 ? total.toFixed(2) : "",
      }));
    }
  }, [datosCanje.montoAntesDescuento, datosCanje.descuentoGeneral, tipoCanje]);

  const buscarClientePorTelefono = async () => {
    setLoadingTelefono(true);
    try {
      const telefono = normalizarPhone(buscarPhone);
      const q = query(
        collection(db, "clientes"),
        where("telefono", "==", telefono),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        setCliente({ ...d.data(), id: d.id });
        toast.success("Cliente encontrado.");
      } else {
        setCliente(null);
        toast.info("No se encontró cliente con ese número.");
      }
    } catch (err) {
      console.error("buscarClientePorTelefono:", err);
      toast.error("Error al buscar cliente.");
    } finally {
      setLoadingTelefono(false);
    }
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-black/10 bg-[var(--color-fondo)] shadow-2xl">
      <div className="border-b border-white/10 bg-gradient-to-r from-black via-[#171717] to-[#22310c] px-4 py-5 text-left md:px-6">
        <span className="inline-flex rounded-full border border-[var(--color-loNuevo)]/20 bg-[var(--color-loNuevo)]/10 px-4 py-1 text-sm uppercase tracking-[0.24em] text-[var(--color-loNuevo)]">
          Operación de canje
        </span>
        <h2 className="mt-4 text-4xl uppercase text-[var(--color-principal)]">
          Canjear recompensa
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-white/70">
          Busca al cliente, valida su saldo y registra el canje.
        </p>
      </div>

      <div className="">
        <div className=" bg-white/[0.04] p-4 text-left shadow-lg">
          <p className="text-sm uppercase tracking-[0.22em] text-white/55">
            Método activo
          </p>
          <h3 className="mt-2 text-3xl text-[var(--color-principal)]">
            {metodoActivo.label}
          </h3>
          <p className="mt-1 max-w-2xl text-white/70">
            {metodoActivo.description}
          </p>

          <div className="mt-4 grid gap-3 grid-cols-2 xl:grid-cols-4">
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
                  <span className="block text-xl uppercase">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* QR */}
        {metodo === "qr" && (
          <div className=" bg-black/20 p-4 md:p-5">
            <div className="mb-4 text-left">
              <p className="text-sm uppercase tracking-[0.22em] text-white/55">
                Escaneo en vivo
              </p>
              <p className="mt-1 text-white/75">
                Escanea el QR del cliente para abrir su saldo de puntos y sus
                recompensas disponibles.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              {!scanning && (
                <button
                  onClick={startScanner}
                  className="rounded-full bg-[var(--color-principal)] px-6 py-3 text-lg uppercase text-[var(--color-negro)] hover:bg-[var(--color-principalHover)] transition"
                >
                  Escanear código QR
                </button>
              )}
              {scanning && (
                <button
                  onClick={async () => {
                    try {
                      await cerrarScanner();
                    } catch (err) {
                      console.error("Error al cancelar escaneo", err);
                    }
                  }}
                  className="rounded-full bg-[var(--color-promocion)] px-6 py-3 text-[var(--color-blanco)] hover:bg-[var(--color-promocionHover)] transition"
                >
                  Cancelar escaneo
                </button>
              )}
              <div
                id="qr-reader-canjear"
                ref={qrRef}
                className={`mx-auto w-full ${scanning ? "my-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-2" : "hidden"}`}
              />
            </div>
          </div>
        )}

        {/* Teléfono */}
        {metodo === "telefono" && (
          <div className=" bg-black/20 p-4 text-left md:p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-white/55">
              Teléfono del cliente
            </p>
            <label className="mt-3 block text-lg uppercase text-[var(--color-principal)]">
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
                disabled={scanning}
              />
              <button
                onClick={buscarClientePorTelefono}
                disabled={loadingTelefono || scanning}
                className="w-full rounded-full bg-[var(--color-secundario)] px-4 py-3 font-medium text-[var(--color-negro)] hover:bg-[var(--color-secundarioHover)] disabled:opacity-50 md:w-1/4"
              >
                {loadingTelefono ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>
        )}

        {/* Por tarjeta */}
        {metodo === "tarjeta" && (
          <div className="bg-black/20 p-4 text-left md:p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-white/55">
              Tarjeta física
            </p>
            <label className="mt-3 block tracking-wider text-[var(--color-blanco)]">
              Ingresa número de tarjeta física:
            </label>
            <input
              type="text"
              value={manualUid}
              onChange={(e) => setManualUid(e.target.value)}
              placeholder="12345678"
              className="mt-2 flex-1 rounded-2xl border border-white/15 bg-white px-4 py-3 text-black"
              disabled={scanning}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  if (!manualUid) {
                    toast.error("Ingresa el número de tarjeta.");
                    return;
                  }
                  await buscarClientePorUid(manualUid);
                }}
                className="w-full rounded-full bg-[var(--color-principal)] px-4 py-3 text-[var(--color-negro)] hover:bg-[var(--color-secundarioHover)]"
                disabled={scanning}
              >
                Buscar tarjeta
              </button>
            </div>
          </div>
        )}

        {/* Búsqueda general */}
        {metodo === "busqueda" && (
          <div className="bg-black/20 p-4 text-left md:p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-white/55">
              Búsqueda amplia
            </p>
            <label className="mt-3 block tracking-wider text-[var(--color-blanco)]">
              Buscar por nombre, teléfono o correo:
            </label>
            <div className="mt-2 flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej: Juan, +5265..., correo@correo.com"
                className="flex-1 rounded-2xl border border-white/15 bg-white px-4 py-3 text-black"
                disabled={scanning}
              />
              <button
                onClick={buscarClientesGeneral}
                className="rounded-full bg-[var(--color-principal)] px-5 py-3 text-[var(--color-negro)] hover:bg-[var(--color-secundarioHover)]"
                disabled={buscandoGeneral || scanning}
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
                  {resultadosBusqueda.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-lg"
                    >
                      <button
                        onClick={() => {
                          setCliente(c);
                          setResultadosBusqueda([]);
                          setBusqueda("");
                        }}
                      >
                        {c.nombre || "Sin nombre"}
                        {c.telefono ? ` - ${c.telefono}` : ""}
                        {c.correo ? ` - ${c.correo}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {cliente && (
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 shadow-lg md:p-5">
            <div className="mb-5 grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-left md:grid-cols-[1.6fr_0.9fr] md:p-5">
              <div className="text-white">
                <p className="text-sm uppercase tracking-[0.22em] text-white/55">
                  Cliente seleccionado
                </p>
                <p className="mt-3 text-3xl text-[var(--color-principal)]">
                  {cliente.nombre || "Sin nombre"}
                </p>
                {cliente.correo && (
                  <p className="mt-2 text-lg text-gray-200">
                    Correo:{" "}
                    <span className="text-[var(--color-secundario)]">
                      {cliente.correo}
                    </span>
                  </p>
                )}
                {cliente.telefono && (
                  <p className="mt-1 text-lg text-gray-200">
                    Teléfono:{" "}
                    <span className="text-[var(--color-principal)]">
                      {cliente.telefono}
                    </span>
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--color-principal)]/20 bg-[var(--color-principal)]/10 p-4 text-center">
                <p className="text-sm uppercase tracking-[0.22em] text-white/55">
                  Saldo actual
                </p>
                <p className="mt-3 text-5xl text-[var(--color-principal)]">
                  {puntosCliente.toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-white/70">
                  Sonori-puntos disponibles
                </p>
              </div>
            </div>

            <div className="text-left">
              <h3 className="text-3xl text-[var(--color-principal)]">
                Recompensas por puntos
              </h3>
              <p className="mt-1 text-white/70">
                Sólo se habilitan las recompensas que el cliente ya puede pagar
                con sus puntos.
              </p>

              {RECOMPENSAS_POR_PUNTOS.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {RECOMPENSAS_POR_PUNTOS.map((r) => {
                    const disponible = puntosCliente >= r.puntos;

                    return (
                      <div
                        key={r.id}
                        className={`rounded-2xl border p-4 shadow-sm ${
                          disponible
                            ? "border-[var(--color-loNuevo)]/25 bg-emerald-500/10"
                            : "border-white/10 bg-black/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-2xl text-[var(--color-principal)]">
                              {r.nombre}
                            </p>
                            <p className="mt-1 text-sm text-white/65">
                              {r.descripcion}
                            </p>
                          </div>
                          <span className="rounded-full bg-black/30 px-3 py-1 text-sm text-white">
                            {r.puntos} pts
                          </span>
                        </div>

                        <div className="mt-4">
                          {disponible ? (
                            <button
                              onClick={() => {
                                setRecompensaSeleccionada(r);
                                setModalCanje(true);
                                setTipoCanje("productoGratis");
                                setDatosCanje({
                                  montoProducto: "",
                                  producto: r.nombre,
                                  porcentajeDescuento: "",
                                  montoTotal: "",
                                  montoAntesDescuento: "",
                                  descuentoGeneral: "",
                                });
                              }}
                              className="rounded-full bg-[var(--color-loNuevo)] px-4 py-2 text-sm text-[var(--color-blanco)] transition hover:bg-[var(--color-loNuevoHover)]"
                            >
                              Canjear ahora
                            </button>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-700">
                              Faltan{" "}
                              {getMissingPoints(puntosCliente, r).toFixed(2)}{" "}
                              pts
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-200">
                  No tiene recompensas.
                </p>
              )}
            </div>
          </div>
        )}

        {modalCanje && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
            <div className="relative max-h-[70vh] w-full max-w-md overflow-auto rounded-[1.75rem] border-b-[12px] border-white bg-[var(--color-blanco)] p-6 text-xl shadow-2xl">
              <button
                className="absolute top-2 right-2 text-gray-600 hover:text-[var(--color-promocion)] font-bold text-xl"
                onClick={() => setModalCanje(false)}
              >
                <IoClose size={28} />
              </button>
              <h2 className="text-2xl font-bold mb-4 text-orange-500">
                Canjear recompensa por puntos
              </h2>
              <h3 className="mb-2">Recompensa seleccionada:</h3>
              <p className="text-orange-500 mb-2">
                {recompensaSeleccionada.nombre || ""}
              </p>
              <p className="mb-3 text-sm text-gray-700">
                Se descontarán {recompensaSeleccionada.puntos} puntos del saldo
                del cliente.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await canjear(recompensaSeleccionada, datosCanje);
                  setModalCanje(false);
                }}
                className="flex flex-col gap-3"
              >
                <label className="">Producto entregado:</label>
                <input
                  type="text"
                  value={datosCanje.producto || ""}
                  onChange={(e) =>
                    setDatosCanje({ ...datosCanje, producto: e.target.value })
                  }
                  className="border px-3 py-1 rounded"
                  placeholder="Ej: Aderezo chipotle"
                  required
                />
                <label className="">Monto referencial del producto ($):</label>
                <input
                  type="number"
                  step="0.01"
                  value={datosCanje.montoProducto}
                  onChange={(e) =>
                    setDatosCanje({
                      ...datosCanje,
                      montoProducto: e.target.value,
                    })
                  }
                  className="border px-3 py-1 rounded"
                  placeholder="Ej: 45"
                />
                <button
                  type="submit"
                  className="bg-[var(--color-loNuevo)] hover:bg-[var(--color-loNuevoHover)] transition text-[var(--color-blanco)] px-4 py-2 rounded"
                >
                  Confirmar canje
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
