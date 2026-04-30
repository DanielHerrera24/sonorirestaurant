import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import { MdCancel } from "react-icons/md";
import { FaArrowUp, FaChevronDown, FaChevronUp } from "react-icons/fa";
import GeneradorTarjetasQR from "./GeneradorTarjetasQR";

const rangos = [
  { label: "Hoy", value: "hoy" },
  { label: "Esta semana", value: "semana" },
  { label: "Este mes", value: "mes" },
  { label: "Personalizado", value: "personalizado" },
];

const PanelAdmin = () => {
  const [rango, setRango] = useState("hoy");
  const [desde, setDesde] = useState(dayjs().format("YYYY-MM-DD"));
  const [hasta, setHasta] = useState(dayjs().format("YYYY-MM-DD"));
  const [visitas, setVisitas] = useState([]);
  const [recompensas, setRecompensas] = useState([]);
  const [modalImg, setModalImg] = useState(null);
  const [modalRecompensas, setModalRecompensas] = useState(false);
  const [catalogo, setCatalogo] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [clientes, setClientes] = useState([]);
  const imgPdfRef = useRef();

  useEffect(() => {
    let start, end;
    const hoy = dayjs().startOf("day");
    if (rango === "hoy") {
      start = hoy;
      end = hoy.endOf("day");
    } else if (rango === "semana") {
      start = hoy.startOf("week");
      end = hoy.endOf("week");
    } else if (rango === "mes") {
      start = hoy.startOf("month");
      end = hoy.endOf("month");
    } else {
      start = dayjs(desde);
      end = dayjs(hasta).endOf("day");
    }

    const fetchData = async () => {
      // VISITAS
      const qVisitas = query(
        collection(db, "visitas"),
        where("fecha", ">=", start.toDate()),
        where("fecha", "<=", end.toDate())
      );
      const snapVisitas = await getDocs(qVisitas);
      setVisitas(snapVisitas.docs.map((doc) => doc.data()));

      // RECOMPENSAS
      const qRecompensas = query(
        collection(db, "recompensas"),
        where("fechaCanje", ">=", start.toDate()),
        where("fechaCanje", "<=", end.toDate())
      );
      const snapRecompensas = await getDocs(qRecompensas);
      setRecompensas(snapRecompensas.docs.map((doc) => doc.data()));

      // CLIENTES REGISTRADOS
      const qClientes = query(
        collection(db, "clientes"),
        where("creado", ">=", start.toDate()),
        where("creado", "<=", end.toDate())
      );
      const snapClientes = await getDocs(qClientes);
      setClientes(snapClientes.docs.map((doc) => doc.data()));
    };

    fetchData();
  }, [rango, desde, hasta]);

  // Cargar catálogo al abrir modal
  const cargarCatalogo = async () => {
    const snap = await getDocs(collection(db, "catalogoRecompensas"));
    setCatalogo(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // Abrir modal y cargar recompensas
  const abrirModal = () => {
    setModalRecompensas(true);
    cargarCatalogo();
    setEditando(null);
    setForm({ nombre: "", descripcion: "" });
  };

  // Guardar nueva recompensa o editar
  const guardarRecompensa = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    if (editando) {
      await updateDoc(doc(db, "catalogoRecompensas", editando), form);
    } else {
      // Calcular el siguiente orden disponible
      const snap = await getDocs(collection(db, "catalogoRecompensas"));
      const catalogoActual = snap.docs.map((d) => d.data());
      const ordenMax = Math.max(
        0,
        ...catalogoActual.map((r) =>
          typeof r.orden === "number" ? r.orden : 0
        )
      );
      await addDoc(collection(db, "catalogoRecompensas"), {
        ...form,
        activo: true,
        orden: ordenMax + 1,
      });
    }
    setForm({ nombre: "", descripcion: "" });
    setEditando(null);
    cargarCatalogo();
  };

  // Editar recompensa
  const editarRecompensa = (rec) => {
    setEditando(rec.id);
    setForm({ nombre: rec.nombre, descripcion: rec.descripcion || "" });
  };

  // Eliminar recompensa
  const eliminarRecompensa = async (id) => {
    if (window.confirm("¿Eliminar recompensa?")) {
      await deleteDoc(doc(db, "catalogoRecompensas", id));
      cargarCatalogo();
    }
  };

  // Cerrar modal
  const cerrarModal = () => {
    setModalRecompensas(false);
    setEditando(null);
    setForm({ nombre: "", descripcion: "" });
  };

  const cambiarOrden = async (id, direccion) => {
    // Ordena el catálogo actual
    const ordenados = [...catalogo].sort(
      (a, b) => (a.orden ?? 9999) - (b.orden ?? 9999)
    );
    const idx = ordenados.findIndex((rec) => rec.id === id);
    if (idx === -1) return;

    // Calcula el nuevo índice
    const nuevoIdx = direccion === "up" ? idx - 1 : idx + 1;
    if (nuevoIdx < 0 || nuevoIdx >= ordenados.length) return;

    // Intercambia los valores de orden
    const actual = ordenados[idx];
    const otro = ordenados[nuevoIdx];

    // Actualiza en Firestore ambos documentos
    await updateDoc(doc(db, "catalogoRecompensas", actual.id), {
      orden: otro.orden,
    });
    await updateDoc(doc(db, "catalogoRecompensas", otro.id), {
      orden: actual.orden,
    });

    // Recarga el catálogo
    cargarCatalogo();
  };

  return (
    <>
      <div className="bg-[var(--color-negro)] text-white rounded shadow p-4 mb-4 max-w-2xl mx-auto">
        <h3 className="text-3xl mb-2 text-[var(--color-principalHover)]">
          Panel de Control
        </h3>
        <div className="flex flex-wrap gap-2 mb-4 text-lg">
          {rangos.map((r) => (
            <button
              key={r.value}
              className={`px-3 py-1 rounded ${
                rango === r.value
                  ? "bg-[var(--color-principal)] text-[var(--color-negro)] hover:bg-[var(--color-principalHover)]"
                  : "bg-gray-200 hover:bg-gray-300 text-black"
              }`}
              onClick={() => setRango(r.value)}
            >
              {r.label}
            </button>
          ))}
          {rango === "personalizado" && (
            <>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="border rounded px-2 text-black"
              />
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="border rounded px-2 text-black"
              />
            </>
          )}
        </div>
        <div className="mb-1 text-xl">
          <span className="tracking-wider text-white">Personas registradas:</span>{" "}
          {clientes.length}
        </div>
        <div className="mb-1 text-xl">
          <span className="tracking-wider text-white">Visitas registradas:</span>{" "}
          {visitas.length}
        </div>
        <div className="mb-1 text-xl">
          <span className="tracking-wider text-white">Recompensas canjeadas:</span>{" "}
          {recompensas.length}
        </div>

        {/* Tabla de clientes registrados */}
        <details className="mb-2 text-xl">
          <summary className="cursor-pointer text-[var(--color-principal)]">
            Ver detalle de personas registradas
          </summary>
          <div className="overflow-x-auto font-montserrat">
            <table className="min-w-full text-sm mt-2">
              <thead>
                <tr>
                  <th className="px-2 py-1">Fecha registro</th>
                  <th className="px-2 py-1">Nombre</th>
                  <th className="px-2 py-1">Correo o Tel</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1 max-w-[40px] overflow-x-auto">
                      {c.creado
                        ? dayjs(
                            c.creado.toDate ? c.creado.toDate() : c.creado
                          ).format("DD/MM/YYYY HH:mm")
                        : ""}
                    </td>
                    <td className="px-2 py-1 max-w-[50px] overflow-x-auto">
                      {c.nombre}
                    </td>
                    {c.correo ? (
                      <td className="px-2 py-1 max-w-[100px] overflow-x-auto">
                        {c.correo}
                      </td>
                    ) : (
                      <td className="px-2 py-1 max-w-[100px] overflow-x-auto">
                        {c.telefono}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        {/* Tabla de visitas */}
        <details className="mb-2 text-xl">
          <summary className="cursor-pointer text-[var(--color-principal)]">
            Ver detalle de visitas
          </summary>
          {visitas.length === 0 && (
            <div className="px-2 py-1">No hay visitas registradas.</div>
          )}
          <div className="overflow-x-auto font-montserrat">
            {/* Tabla para pantallas medianas y grandes */}
            <table className="hidden sm:table min-w-full text-sm mt-2">
              <thead>
                <tr>
                  <th className="px-2 py-1">Fecha</th>
                  <th className="px-2 py-1">Cliente</th>
                  <th className="px-2 py-1">Monto compra</th>
                  <th className="px-2 py-1">Puntos obtenidos</th>
                  <th className="px-2 py-1">Puntos usados</th>
                  <th className="px-2 py-1">Puntos finales</th>
                </tr>
              </thead>
              <tbody>
                {visitas.map((v, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">
                      {v.fecha
                        ? dayjs(
                            v.fecha.toDate ? v.fecha.toDate() : v.fecha
                          ).format("DD/MM/YYYY HH:mm")
                        : ""}
                    </td>
                    <td className="px-2 py-1">{v.nombre || v.clienteUid}</td>
                    <td className="px-2 py-1">
                      {v.montoGastado && !isNaN(Number(v.montoGastado))
                        ? `$${Number(v.montoGastado).toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="px-2 py-1">
                      {v.puntosGanados && !isNaN(Number(v.puntosGanados))
                        ? Number(v.puntosGanados).toFixed(2)
                        : "0"}
                    </td>
                    <td className="px-2 py-1">
                      {v.puntosCanjeados && !isNaN(Number(v.puntosCanjeados))
                        ? Number(v.puntosCanjeados).toFixed(2)
                        : "0"}
                    </td>
                    <td className="px-2 py-1">
                      {v.puntosDespues && !isNaN(Number(v.puntosDespues))
                        ? Number(v.puntosDespues).toFixed(2)
                        : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Tarjetas para móvil */}
            <div className="sm:hidden flex flex-col gap-2 mt-2">
              {visitas.map((v, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-2 bg-gray-50 shadow text-xs"
                >
                  <div>
                    <span className=" text-[var(--color-principal)]">
                      Fecha:
                    </span>{" "}
                    {v.fecha
                      ? dayjs(
                          v.fecha.toDate ? v.fecha.toDate() : v.fecha
                        ).format("DD/MM/YYYY HH:mm")
                      : ""}
                  </div>
                  <div>
                    <span className=" text-[var(--color-principal)]">
                      Cliente:
                    </span>{" "}
                    {v.nombre || v.clienteUid}
                  </div>
                  <div>
                    <span className=" text-[var(--color-principal)]">
                      Monto compra:
                    </span>{" "}
                    {v.montoGastado && !isNaN(Number(v.montoGastado))
                      ? `$${Number(v.montoGastado).toFixed(2)}`
                      : "-"}
                  </div>
                  <div>
                    <span className=" text-[var(--color-principal)]">
                      Puntos obtenidos:
                    </span>{" "}
                    {v.puntosGanados && !isNaN(Number(v.puntosGanados))
                      ? Number(v.puntosGanados).toFixed(2)
                      : "0"}
                  </div>
                  <div>
                    <span className=" text-[var(--color-principal)]">
                      Puntos usados:
                    </span>{" "}
                    {v.puntosCanjeados && !isNaN(Number(v.puntosCanjeados))
                      ? Number(v.puntosCanjeados).toFixed(2)
                      : "0"}
                  </div>
                  <div>
                    <span className=" text-[var(--color-principal)]">
                      Puntos finales:
                    </span>{" "}
                    {v.puntosDespues && !isNaN(Number(v.puntosDespues))
                      ? Number(v.puntosDespues).toFixed(2)
                      : "0"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>

        {/* Tabla de recompensas */}
        <details className="mb-2 text-xl">
          <summary className="cursor-pointer text-[var(--color-principal)]">
            Ver detalle de recompensas
          </summary>
          <div className="overflow-x-auto font-montserrat">
            <table className="min-w-full text-sm mt-2">
              <thead>
                <tr>
                  <th className="px-2 py-1">Fecha canje</th>
                  <th className="px-2 py-1">Cliente</th>
                  <th className="px-2 py-1">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {recompensas.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">
                      {r.fechaCanje
                        ? dayjs(
                            r.fechaCanje.toDate
                              ? r.fechaCanje.toDate()
                              : r.fechaCanje
                          ).format("DD/MM/YYYY HH:mm")
                        : ""}
                    </td>
                    <td className="px-2 py-1">{r.nombre || r.clienteUid}</td>
                    <td className="px-2 py-1">
                      {r.mensaje || "-"}
                      {r.detallesCanje && (
                        <div className="text-xs text-gray-600">
                          {r.detallesCanje.producto && (
                            <div>Producto: {r.detallesCanje.producto}</div>
                          )}
                          {r.detallesCanje.montoProducto && (
                            <div>
                              Monto producto: ${r.detallesCanje.montoProducto}
                            </div>
                          )}
                          {r.detallesCanje.montoAntesDescuento && (
                            <div>
                              Monto antes de descuento: $
                              {r.detallesCanje.montoAntesDescuento}
                            </div>
                          )}
                          {r.detallesCanje.porcentajeDescuento && (
                            <div>
                              Descuento: {r.detallesCanje.porcentajeDescuento}%
                            </div>
                          )}
                          {r.detallesCanje.descuentoGeneral && (
                            <div>
                              Descuento general:{" "}
                              {r.detallesCanje.descuentoGeneral}
                            </div>
                          )}
                          {r.detallesCanje.montoTotal && (
                            <div>
                              Total a pagar: ${r.detallesCanje.montoTotal}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <button
          className="bg-[var(--color-principal)] text-xl text-[var(--color-negro)] hover:bg-[var(--color-principalHover)] px-4 py-2 rounded shadow my-4"
          onClick={abrirModal}
        >
          Catálogo de Recompensas
        </button>

        {/* Modal de Recompensas */}
        {modalRecompensas && (
          <div className="fixed inset-0 bg-black bg-opacity-60 mt-20 flex items-center justify-center z-50">
            <div className="bg-[var(--color-negro)] max-h-[70vh] border-2 border-[var(--color-principal)] rounded-lg shadow-lg p-6 w-full overflow-y-auto max-w-lg relative">
              <button
                className="absolute top-2 right-2 text-red-500 hover:text-[var(--color-promocion)] text-xl"
                onClick={cerrarModal}
              >
                <MdCancel size={24} />
              </button>
              <h2 className="text-3xl mb-4 text-[var(--color-principalHover)]">
                Catálogo de Recompensas
              </h2>
              <form
                onSubmit={guardarRecompensa}
                className="mb-4 text-lg flex flex-col gap-2"
              >
                <input
                  type="text"
                  placeholder="Nombre de la recompensa"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="border px-3 py-1 rounded text-black"
                  required
                />
                <textarea
                  placeholder="Descripción (opcional)"
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  className="border px-3 py-1 rounded text-black"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-[var(--color-loNuevo)] hover:bg-[var(--color-loNuevoHover)] text-[var(--color-negro)] px-4 py-1 rounded"
                  >
                    {editando ? "Actualizar" : "Agregar"}
                  </button>
                  {editando && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(null);
                        setForm({ nombre: "", descripcion: "" });
                      }}
                      className="bg-gray-400 text-[var(--color-blanco)] px-4 py-1 rounded"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
              <ul className="divide-y">
                {catalogo
                  .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999))
                  .map((rec, idx, arr) => (
                    <li
                      key={rec.id}
                      className="py-2 flex gap-1 justify-between items-center"
                    >
                      <div>
                        <span className="text-xl font-medium text-[var(--color-principal)] mr-1">
                          {rec.orden}
                        </span>
                        <span className="text-2xl text-orange-600">{rec.nombre}</span>
                        {rec.descripcion && (
                          <div className="text-md text-gray-100">
                            {rec.descripcion}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 items-center">
                        {/* Botón subir */}
                        <button
                          disabled={idx === 0}
                          onClick={() => cambiarOrden(rec.id, "up")}
                          className={`text-xs px-2 py-1 rounded ${
                            idx === 0
                              ? "bg-gray-200 text-gray-500"
                              : "bg-[var(--color-principal)] text-[var(--color-negro)] hover:bg-[var(--color-principalHover)]"
                          }`}
                          title="Subir"
                        >
                          <FaChevronUp />
                        </button>
                        {/* Botón bajar */}
                        <button
                          disabled={idx === arr.length - 1}
                          onClick={() => cambiarOrden(rec.id, "down")}
                          className={`text-xs px-2 py-1 rounded ${
                            idx === arr.length - 1
                              ? "bg-gray-200 text-gray-500"
                              : "bg-[var(--color-principal)] text-[var(--color-negro)] hover:bg-[var(--color-principalHover)]"
                          }`}
                          title="Bajar"
                        >
                          <FaChevronDown />
                        </button>
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => editarRecompensa(rec)}
                            className="text-base text-[var(--color-blanco)] bg-orange-600 hover:bg-[var(--color-secundarioHover)] px-2 py-1 rounded-full"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarRecompensa(rec.id)}
                            className="text-base text-[var(--color-blanco)] bg-[var(--color-promocion)] hover:bg-[var(--color-promocionHover)] px-2 py-1 rounded-full"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
        <GeneradorTarjetasQR />
      </div>
      {modalImg && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div
            className="bg-[var(--color-blanco)] rounded-lg shadow-lg p-4 relative max-w-full max-h-full flex flex-col items-center"
            ref={imgPdfRef}
          >
            <img
              src={modalImg}
              className="max-h-[80vh] max-w-[90vw] rounded mb-4"
            />
            <div className="flex gap-2">
              <button
                className="bg-[var(--color-promocion)] rounded text-[var(--color-blanco)] py-2 px-4 font-bold"
                onClick={() => setModalImg(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PanelAdmin;
