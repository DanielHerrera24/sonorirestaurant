import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { toast } from "react-toastify";

export default function CanjearRecompensas() {
  const [uidCliente, setUidCliente] = useState("");
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
  const [clienteEncontrado, setClienteEncontrado] = useState(undefined); // null: no existe, objeto: encontrado, undefined: sin buscar
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [loadingTelefono, setLoadingTelefono] = useState(false);

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

  // Búsqueda flexible desde el input: si empieza con + lo tratamos como teléfono, si es largo o tiene + usamos teléfono, si es 8 dígitos intentamos UID/docId
  const buscarClienteFlexible = async () => {
    setCliente(null);
    const input = (uidCliente || "").trim();
    if (!input) {
      toast.error("Ingresa UID o número de teléfono.");
      return;
    }

    // Decide heurística: si contiene + o es mayor a 8 caracteres -> teléfono
    const puedeSerTelefono =
      input.startsWith("+") || input.length > 8 || /[^\d]/.test(input);
    if (puedeSerTelefono) {
      const telefono = normalizarPhone(input);
      try {
        const q = query(
          collection(db, "clientes"),
          where("telefono", "==", telefono),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          setCliente({ ...d.data(), id: d.id });
          toast.success("Cliente encontrado (por teléfono)");
          return;
        } else {
          toast.info("No se encontró cliente con ese número.");
          return;
        }
      } catch (err) {
        console.error("buscarClienteFlexible (tel):", err);
        toast.error("Error al buscar por teléfono.");
        return;
      }
    }

    // Si llegamos aquí, intentamos por doc id / uid personalizado
    await buscarClientePorUid(input);
  };

  const canjear = async (recompensa, detalles = {}) => {
    if (!cliente) {
      toast.error("No hay cliente seleccionado.");
      return;
    }
    try {
      const ref = doc(db, "clientes", cliente.id);

      // Remueve recompensa original
      await updateDoc(ref, {
        recompensas: arrayRemove(recompensa),
      });

      const recompensaCanjeada = {
        ...recompensa,
        canjeado: true,
        fechaCanje: new Date().toISOString(),
        detallesCanje: { ...detalles, tipoCanje },
      };

      // Agregar la recompensa canjeada y feedback
      await updateDoc(ref, {
        recompensas: arrayUnion(recompensaCanjeada),
        feedback: {
          tipo: "success",
          mensaje: "✅ Recompensa canjeada correctamente.",
          timestamp: Date.now(),
        },
      });

      // Registrar canje global
      await addDoc(collection(db, "recompensas"), {
        clienteUid: cliente.id,
        nombre: cliente.nombre || "",
        correo: cliente.correo || "",
        fecha: new Date(),
        codigo: recompensa.codigo,
        mensaje: recompensa.mensaje,
        canjeado: true,
        fechaCanje: new Date(),
        detallesCanje: detalles,
      });

      // Actualizar cliente localmente en UI
      const nuevasRecompensas = (cliente.recompensas || [])
        .filter((r) => r.codigo !== recompensa.codigo)
        .concat(recompensaCanjeada);
      setCliente({ ...cliente, recompensas: nuevasRecompensas });

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

          await scanner.current.stop();
          setScanning(false);

          setUidCliente(uidEscaneado);
          // usar búsqueda robusta para el valor escaneado
          await buscarClientePorUid(uidEscaneado);
        },
        (err) => {
          console.warn("QR Error", err);
        },
      )
      .catch((err) => {
        console.error("Error al iniciar escáner", err);
        setScanning(false);
        toast.error("No fue posible iniciar el escáner.");
      });
  };

  useEffect(() => {
    return () => {
      if (scanner.current) {
        scanner.current.stop().catch(() => {});
      }
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
    setClienteEncontrado(undefined);
    try {
      const telefono = normalizarPhone(buscarPhone);
      const q = query(
        collection(db, "clientes"),
        where("telefono", "==", telefono),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        setClienteEncontrado({ ...d.data(), id: d.id });
        setCliente({ ...d.data(), id: d.id });
        toast.success("Cliente encontrado.");
      } else {
        setClienteEncontrado(null);
        setCliente(null);
        toast.info("No se encontró cliente con ese número.");
      }
    } catch (err) {
      toast.error("Error al buscar cliente.");
    } finally {
      setLoadingTelefono(false);
    }
  };

  const crearClientePorTelefono = async (nombre = "") => {
    setLoadingTelefono(true);
    try {
      const telefono = normalizarPhone(buscarPhone);
      const docRef = await addDoc(collection(db, "clientes"), {
        nombre,
        telefono,
        creado: new Date(),
        recompensas: [],
        estrellas: 0,
      });
      const snap = await getDoc(docRef);
      setClienteEncontrado({ ...snap.data(), id: docRef.id });
      setCliente({ ...snap.data(), id: docRef.id });
      toast.success("Cliente creado correctamente.");
    } catch (err) {
      toast.error("Error al crear cliente.");
    } finally {
      setLoadingTelefono(false);
    }
  };

  return (
    <div className="bg-[var(--color-fondo)] p-4 mt-6 rounded shadow-md max-w-md mx-auto">
      <h2 className="text-3xl uppercase mb-2 text-center text-[var(--color-principal)]">
        Canjear recompensa
      </h2>

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

      {/* QR */}
      {metodo === "qr" && (
        <div className="flex flex-col items-center gap-2 mb-2">
          {!scanning && (
            <button
              onClick={startScanner}
              className="bg-[var(--color-principal)] text-[var(--color-negro)] text-lg uppercase px-4 py-2 rounded hover:bg-[var(--color-principalHover)] transition"
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
                  } catch (err) {
                    console.error("Error al cancelar escaneo", err);
                  }
                }
              }}
              className="bg-[var(--color-promocion)] text-[var(--color-blanco)] px-4 py-2 rounded hover:bg-[var(--color-promocionHover)] transition"
            >
              Cancelar escaneo
            </button>
          )}
          <div
            id="qr-reader"
            ref={qrRef}
            className={`w-full mx-auto ${scanning ? "my-4" : "hidden"}`}
          />
        </div>
      )}

      {/* Teléfono */}
      {metodo === "telefono" && (
        <div className="w-full mt-4 mb-4">
          <label className="text-lg uppercase text-[var(--color-principal)] block mb-1">
            Buscar por número de teléfono
          </label>
          <div className="w-full flex gap-1">
            <input
              type="tel"
              placeholder="+526531231234"
              value={buscarPhone}
              onChange={(e) => {
                let val = e.target.value.replace(/\s/g, "");
                if (!val.startsWith("+")) val = "+52" + val.replace(/\D/g, "");
                setBuscarPhone(val);
              }}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              className="w-3/4 border px-3 py-1 rounded"
              disabled={scanning}
            />
            <button
              onClick={buscarClientePorTelefono}
              disabled={loadingTelefono || scanning}
              className="w-1/4 bg-[var(--color-secundario)] text-[var(--color-negro)] font-medium px-3 py-1 rounded hover:bg-[var(--color-secundarioHover)] disabled:opacity-50"
            >
              {loadingTelefono ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      )}

      {/* Por tarjeta */}
      {metodo === "tarjeta" && (
        <div className="flex flex-col gap-2 mb-4">
          <label className="tracking-wider text-[var(--color-blanco)]">
            Ingresa número de tarjeta física:
          </label>
          <input
            type="text"
            value={manualUid}
            onChange={(e) => setManualUid(e.target.value)}
            placeholder="12345678"
            className="flex-1 border px-3 py-1 rounded"
            disabled={scanning}
          />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!manualUid) {
                  toast.error("Ingresa el número de tarjeta.");
                  return;
                }
                await buscarClientePorUid(manualUid);
              }}
              className="bg-[var(--color-principal)] w-full text-[var(--color-negro)] px-4 py-1 rounded hover:bg-[var(--color-secundarioHover)]"
              disabled={scanning}
            >
              Buscar tarjeta
            </button>
          </div>
        </div>
      )}

      {/* Búsqueda general */}
      {metodo === "busqueda" && (
        <div className="flex flex-col gap-2 mb-4">
          <label className="tracking-wider text-[var(--color-blanco)]">
            Buscar por nombre, teléfono o correo:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej: Juan, +5265..., correo@correo.com"
              className="flex-1 border px-3 py-1 rounded"
              disabled={scanning}
            />
            <button
              onClick={buscarClientesGeneral}
              className="bg-[var(--color-principal)] text-[var(--color-negro)] px-4 py-1 rounded hover:bg-[var(--color-secundarioHover)]"
              disabled={buscandoGeneral || scanning}
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
                {resultadosBusqueda.map((c) => (
                  <li
                    key={c.id}
                    className="text-lg flex justify-between items-center py-1"
                  >
                    <span>
                      {c.nombre || "Sin nombre"}
                      {c.telefono ? ` - ${c.telefono}` : ""}
                      {c.correo ? ` - ${c.correo}` : ""}
                    </span>
                    <button
                      className="ml-2 bg-[var(--color-secundario)] text-[var(--color-negro)] px-2 py-1 rounded hover:bg-[var(--color-secundarioHover)]"
                      onClick={() => {
                        setCliente(c);
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
        </div>
      )}

      {cliente && (
        <div className="bg-[var(--color-fondo)] p-4 rounded shadow-md">
          <div className="text-center text-white">
            <p className="mb-1 text-2xl">
              Nombre:{" "}
              <span className="text-[var(--color-principal)]">
                {cliente.nombre}
              </span>
            </p>
            {cliente.correo && (
              <p className="mb-1 text-xl text-gray-200">
                Correo:{" "}
                <span className="text-[var(--color-secundario)]">
                  {cliente.correo}
                </span>
              </p>
            )}
            {cliente.telefono && (
              <p className="mb-1 text-xl text-gray-200">
                Teléfono:{" "}
                <span className="text-[var(--color-principal)] ">
                  {cliente.telefono}
                </span>
              </p>
            )}
            <p className="mb-1 text-xl text-gray-200">
              Estrellas:{" "}
              <span className="text-[var(--color-principal)] ">
                {cliente.estrellas}
              </span>
            </p>

            <h3 className="text-3xl mb-2 text-[var(--color-principal)]">
              Recompensas:
            </h3>
            {cliente.recompensas && cliente.recompensas.length > 0 ? (
              cliente.recompensas.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-2 items-center border-b py-1"
                >
                  <span className="text-sm text-center text-[var(--color-principal)]">
                    {r.mensaje || "🎁 Recompensa"}
                  </span>
                  <span className="text-sm text-center text-white">
                    {" Código: "}
                    {r.codigo}
                  </span>
                  {!r.canjeado && (
                    <button
                      onClick={() => {
                        setRecompensaSeleccionada(r);
                        setModalCanje(true);
                        setTipoCanje("");
                        setDatosCanje({
                          montoProducto: "",
                          producto: "",
                          porcentajeDescuento: "",
                          montoTotal: "",
                          montoAntesDescuento: "",
                          descuentoGeneral: "",
                        });
                      }}
                      className="bg-[var(--color-loNuevo)] text-[var(--color-blanco)] text-sm px-3 py-1 rounded hover:bg-[var(--color-loNuevoHover)] transition"
                    >
                      Canjear
                    </button>
                  )}
                  {r.canjeado && (
                    <span className="bg-green-100 text-[var(--color-loNuevoHover)] text-xs  px-1 py-1 rounded">
                      {r.canjeado && " ✅ CANJEADO"}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-200">No tiene recompensas.</p>
            )}
          </div>
        </div>
      )}

      {modalCanje && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
          <div className="bg-[var(--color-blanco)] rounded-lg shadow-lg p-6 w-full max-w-md max-h-[70vh] overflow-auto border-b-[12px] border-white relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-[var(--color-promocion)] font-bold text-xl"
              onClick={() => setModalCanje(false)}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 text-[var(--color-principal)]">
              Detalles del canje
            </h2>
            <h3 className="font-bold mb-2">Recompensa seleccionada:</h3>
            <p className="font-bold text-[var(--color-principal)] mb-2">
              {recompensaSeleccionada.mensaje || ""}
            </p>
            <h3 className="font-bold mb-2">Selecciona el tipo de canjeo:</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await canjear(recompensaSeleccionada, datosCanje);
                setModalCanje(false);
              }}
              className="flex flex-col gap-3"
            >
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  className={`px-3 py-1 rounded  border border-[var(--color-principalClaro)] ${
                    tipoCanje === "productoGratis"
                      ? "bg-[var(--color-principal)] text-[var(--color-negro)]"
                      : "bg-[var(--color-blanco)] text-[var(--color-negro)]"
                  }`}
                  onClick={() => setTipoCanje("productoGratis")}
                >
                  Producto gratis
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded  border border-[var(--color-principalClaro)] ${
                    tipoCanje === "descuentoProducto"
                      ? "bg-[var(--color-principal)] text-[var(--color-negro)]"
                      : "bg-[var(--color-blanco)] text-[var(--color-negro)]"
                  }`}
                  onClick={() => setTipoCanje("descuentoProducto")}
                >
                  Descuento a producto
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded  border border-[var(--color-principalClaro)] ${
                    tipoCanje === "descuentoGeneral"
                      ? "bg-[var(--color-principal)] text-[var(--color-negro)]"
                      : "bg-[var(--color-blanco)] text-[var(--color-negro)]"
                  }`}
                  onClick={() => setTipoCanje("descuentoGeneral")}
                >
                  Descuento general
                </button>
              </div>

              {/* Campos según el tipo de recompensa (mantener como antes) */}
              {tipoCanje === "productoGratis" && (
                <>
                  <label className="">Producto obtenido:</label>
                  <input
                    type="text"
                    value={
                      recompensaSeleccionada.mensaje ||
                      datosCanje.producto ||
                      ""
                    }
                    onChange={(e) =>
                      setDatosCanje({ ...datosCanje, producto: e.target.value })
                    }
                    className="border px-3 py-1 rounded"
                    placeholder="Ej: Café expreso"
                    required
                  />
                  <label className="">Monto del producto ($):</label>
                  <input
                    type="number"
                    value={datosCanje.montoProducto}
                    onChange={(e) =>
                      setDatosCanje({
                        ...datosCanje,
                        montoProducto: e.target.value,
                      })
                    }
                    className="border px-3 py-1 rounded"
                    placeholder="Ej: 45"
                    required
                  />
                </>
              )}
              {tipoCanje === "descuentoProducto" && (
                <>
                  <label className="">Producto:</label>
                  <input
                    type="text"
                    value={
                      recompensaSeleccionada.mensaje ||
                      datosCanje.producto ||
                      ""
                    }
                    onChange={(e) =>
                      setDatosCanje({ ...datosCanje, producto: e.target.value })
                    }
                    className="border px-3 py-1 rounded"
                    placeholder="Ej: Café expreso"
                    required
                  />
                  <label className="">Monto original ($):</label>
                  <input
                    type="number"
                    value={datosCanje.montoProducto}
                    onChange={(e) =>
                      setDatosCanje({
                        ...datosCanje,
                        montoProducto: e.target.value,
                      })
                    }
                    className="border px-3 py-1 rounded"
                    placeholder="Ej: 45"
                    required
                  />
                  <label className="">Porcentaje de descuento (%):</label>
                  <input
                    type="number"
                    value={datosCanje.porcentajeDescuento}
                    onChange={(e) =>
                      setDatosCanje({
                        ...datosCanje,
                        porcentajeDescuento: e.target.value,
                      })
                    }
                    className="border px-3 py-1 rounded"
                    placeholder="Ej: 20"
                    required
                  />
                  <label className="">Monto total a pagar ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={datosCanje.montoTotal}
                    onChange={(e) =>
                      setDatosCanje({
                        ...datosCanje,
                        montoTotal: e.target.value,
                      })
                    }
                    className="border px-3 py-1 rounded"
                    placeholder="Ej: 36"
                  />
                </>
              )}
              {tipoCanje === "descuentoGeneral" && (
                <>
                  <label className="">Monto total a pagar ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={datosCanje.montoAntesDescuento}
                    onChange={(e) =>
                      setDatosCanje({
                        ...datosCanje,
                        montoAntesDescuento: e.target.value,
                      })
                    }
                    className="border px-3 py-1 rounded"
                    placeholder="Ej: 100"
                    required
                  />
                  <label className="">Descuento general ($ o %):</label>
                  <input
                    type="text"
                    value={datosCanje.descuentoGeneral}
                    onChange={(e) =>
                      setDatosCanje({
                        ...datosCanje,
                        descuentoGeneral: e.target.value,
                      })
                    }
                    className="border px-3 py-1 rounded"
                    placeholder="Ej: 20 o 20%"
                    required
                  />
                  <label className="">Monto total a pagar ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={datosCanje.montoTotal}
                    onChange={(e) =>
                      setDatosCanje({
                        ...datosCanje,
                        montoTotal: e.target.value,
                      })
                    }
                    className="border px-3 py-1 rounded"
                    placeholder="Ej: 80"
                  />
                </>
              )}
              <button
                type="submit"
                className="bg-[var(--color-loNuevo)] hover:bg-[var(--color-loNuevoHover)] transition text-[var(--color-blanco)] px-4 py-2 rounded font-bold"
              >
                Confirmar canje
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
