import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, where, getDocs } from "firebase/firestore";
import { FiSearch, FiCalendar, FiEye } from "react-icons/fi";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import toast from "react-hot-toast";

dayjs.extend(isoWeek);

const RANGOS = [
  { label: "Hoy", value: "hoy" },
  { label: "Esta semana", value: "semana" },
  { label: "Este mes", value: "mes" },
  { label: "Personalizado", value: "personalizado" },
];

const formatearPagoVenta = (venta) => {
  const desglose = venta.desglosePago;

  if (desglose && typeof desglose === "object") {
    const partes = [];
    const efectivo = [];

    if (Number(desglose.efectivoMXN) > 0) {
      efectivo.push(`$${Number(desglose.efectivoMXN).toFixed(2)} MXN`);
    }
    if (Number(desglose.efectivoUSD) > 0) {
      efectivo.push(`$${Number(desglose.efectivoUSD).toFixed(2)} USD`);
    }
    if (efectivo.length > 0) {
      partes.push(`Efectivo: ${efectivo.join(" + ")}`);
    }
    if (Number(desglose.tarjeta) > 0) {
      partes.push(`Tarjeta: $${Number(desglose.tarjeta).toFixed(2)}`);
    }
    if (Number(desglose.transferencia) > 0) {
      partes.push(
        `Transferencia: $${Number(desglose.transferencia).toFixed(2)}`,
      );
    }

    if (partes.length > 0) {
      return partes.join(" / ");
    }
  }

  if (venta.tipoPago) {
    return venta.tipoPago.charAt(0).toUpperCase() + venta.tipoPago.slice(1);
  }

  return "-";
};

export default function ListaVentas({ onSelectVenta }) {
  const [ventas, setVentas] = useState([]);
  const [rango, setRango] = useState("hoy");
  const [desde, setDesde] = useState(dayjs().format("YYYY-MM-DD"));
  const [hasta, setHasta] = useState(dayjs().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarVentas();
    // eslint-disable-next-line
  }, [rango, desde, hasta]);

  const cargarVentas = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, "ventas"), orderBy("fecha", "desc"));
      const hoy = dayjs().startOf("day");
      const finHoy = dayjs().endOf("day");
      if (rango === "hoy") {
        q = query(
          q,
          where("fecha", ">=", hoy.toDate()),
          where("fecha", "<=", finHoy.toDate())
        );
      } else if (rango === "semana") {
        const inicio = dayjs().startOf("isoWeek");
        const fin = dayjs().endOf("isoWeek");
        q = query(
          q,
          where("fecha", ">=", inicio.toDate()),
          where("fecha", "<=", fin.toDate())
        );
      } else if (rango === "mes") {
        const inicio = dayjs().startOf("month");
        const fin = dayjs().endOf("month");
        q = query(
          q,
          where("fecha", ">=", inicio.toDate()),
          where("fecha", "<=", fin.toDate())
        );
      } else if (rango === "personalizado") {
        if (desde && hasta) {
          const inicio = dayjs(desde).startOf("day");
          const fin = dayjs(hasta).endOf("day");
          q = query(
            q,
            where("fecha", ">=", inicio.toDate()),
            where("fecha", "<=", fin.toDate())
          );
        }
      }
      const snap = await getDocs(q);
      const datos = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setVentas(datos);
    } catch (err) {
      toast.error("Error al cargar ventas");
    }
    setLoading(false);
  };

  const ventasActivas = ventas.filter(v => v.estado !== "cancelada");

  const totalVentas = ventasActivas.reduce(
    (acc, v) => acc + (Number(v.total) || 0),
    0
  );
  const totalVentasEnCaja = ventasActivas.reduce(
    (acc, v) => acc + (Number(v.total) || 0),
    0
  );
  const totalPuntosUsados = ventasActivas.reduce(
    (acc, v) => acc + (Number(v.puntosUsados) || 0),
    0
  );

  return (
    <div className="bg-white rounded shadow p-2 mt-10 sm:mt-0">
      <h3 className="text-xl font-semibold text-orange-500 mb-4 flex items-center gap-2">
        <FiSearch /> Ventas registradas
      </h3>
      {/* Filtros por fecha */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {RANGOS.map((r) => (
          <button
            key={r.value}
            onClick={() => setRango(r.value)}
            className={`px-3 py-1 rounded-full font-semibold transition text-sm
              ${rango === r.value
                ? "bg-orange-500 text-white shadow"
                : "bg-gray-100 text-orange-500 hover:bg-orange-600 hover:text-white"}
            `}
          >
            {r.label}
          </button>
        ))}
        {rango === "personalizado" && (
          <>
            <label className="flex items-center gap-1 text-sm">
              <FiCalendar />
              Desde:
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <FiCalendar />
              Hasta:
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </label>
          </>
        )}
      </div>
      {/* Totales */}
      <div className="mb-2 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-lg font-bold text-green-700">
          Total en caja: ${totalVentasEnCaja}
        </div>
      </div>
      {/* Listado de ventas */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Productos</th>
              <th className="p-2 text-right">Total original</th>
              <th className="p-2 text-center">Desc. empleado</th>
              <th className="p-2 text-center">Pago</th>
              <th className="p-2 text-center">Canje recompensa</th>
              <th className="p-2 text-right">Total final</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-6">
                  Cargando ventas...
                </td>
              </tr>
            ) : ventas.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6">
                  No hay ventas en este rango.
                </td>
              </tr>
            ) : (
              ventas.map((venta) => (
                <tr key={venta.id} className={`border-b hover:bg-orange-50 ${venta.estado === "cancelada" ? "bg-red-100 opacity-60" : ""}`}>
                  <td className="p-2">
                    {venta.fecha?.toDate
                      ? dayjs(venta.fecha.toDate()).format("DD/MM/YYYY HH:mm")
                      : ""}
                  </td>
                  <td className="p-2 min-w-40">
                    <ul>
                      {venta.productos?.map((p) => (
                        <li key={p.id}>
                          {p.nombre} x {p.cantidad}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-2 text-right font-bold">
                    {venta.totalOriginal !== undefined
                      ? `$${Number(venta.totalOriginal).toFixed(2)}`
                      : "-"}
                  </td>
                  <td className="p-2 text-center">
                    {venta.descuentoEmpleado
                      ? <span className="text-blue-700 font-bold">Sí</span>
                      : <span className="text-gray-400">No</span>}
                  </td>
                  <td className="p-2 text-center">
                    <span className="font-semibold">{formatearPagoVenta(venta)}</span>
                  </td>
                  <td className="p-2 text-center">
                    {venta.canjeRecompensa
                      ? (
                        <span className="text-purple-700 font-semibold">
                          {venta.canjeRecompensa.nombre
                            ? venta.canjeRecompensa.nombre
                            : typeof venta.canjeRecompensa === "string"
                              ? venta.canjeRecompensa
                              : "Canje realizado"}
                        </span>
                      )
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="p-2 text-right font-bold text-green-700">
                    {venta.total !== undefined
                      ? `$${Number(venta.total).toFixed(2)}`
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vista móvil: tarjetas */}
      <div className="flex flex-col gap-3 sm:hidden">
        {loading ? (
          <div className="text-center py-6">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="text-center py-6">No hay ventas en este rango.</div>
        ) : (
          ventas.map((venta) => (
            <div
              key={venta.id}
              className={`rounded-lg shadow p-3 border-l-4 ${
                venta.estado === "cancelada"
                  ? "border-red-500 bg-red-100 opacity-60"
                  : "border-green-500 bg-white"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[var(--color-principal)]">
                  {venta.fecha?.toDate
                    ? dayjs(venta.fecha.toDate()).format("DD/MM/YYYY HH:mm")
                    : ""}
                </span>
                <span className="text-xs">
                  {venta.estado === "cancelada" ? (
                    <span className="text-red-500 font-bold">Cancelada</span>
                  ) : (
                    <span className="text-green-600 font-semibold">Activa</span>
                  )}
                </span>
              </div>
              <div className="mb-1">
                <span className="font-semibold">Productos:</span>
                <ul className="ml-2 list-disc">
                  {venta.productos?.map((p) => (
                    <li key={p.id}>
                      {p.nombre} x {p.cantidad}
                    </li>
                  ))}
                </ul>
              </div>
              {/* NUEVO: Canje de recompensa */}
              <div className="mb-1">
                <span className="font-semibold">Pago: </span>
                <span>{formatearPagoVenta(venta)}</span>
              </div>
              <div className="mb-1">
                <span className="">Canje recompensa: </span>
                {venta.canjeRecompensa
                  ? (
                    <span className="text-purple-700 font-semibold">
                      {venta.canjeRecompensa.nombre
                        ? venta.canjeRecompensa.nombre
                        : typeof venta.canjeRecompensa === "string"
                          ? venta.canjeRecompensa
                          : "Canje realizado"}
                    </span>
                  )
                  : <span className="text-gray-400">—</span>
                }
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span>
                  Total original:{" "}
                  {venta.totalOriginal !== undefined
                    ? `$${Number(venta.totalOriginal).toFixed(2)}`
                    : "-"}
                </span>
                <span className="font-bold text-green-700">
                  Total en caja:{" "}
                  {venta.total !== undefined
                    ? `$${Number(venta.total).toFixed(2)}`
                    : "-"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}