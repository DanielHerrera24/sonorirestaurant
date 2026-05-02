import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import dayjs from "dayjs";
import { db } from "../firebase";
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
  const [clientes, setClientes] = useState([]);

  const resumenTarjetas = [
    {
      id: "clientes",
      label: "Personas registradas",
      value: clientes.length,
      accent: "text-[var(--color-principal)]",
    },
    {
      id: "visitas",
      label: "Visitas registradas",
      value: visitas.length,
      accent: "text-orange-400",
    },
    {
      id: "recompensas",
      label: "Recompensas canjeadas",
      value: recompensas.length,
      accent: "text-emerald-400",
    },
  ];

  useEffect(() => {
    let start;
    let end;
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
      try {
        const qVisitas = query(
          collection(db, "visitas"),
          where("fecha", ">=", start.toDate()),
          where("fecha", "<=", end.toDate())
        );
        const snapVisitas = await getDocs(qVisitas);
        setVisitas(snapVisitas.docs.map((docSnap) => docSnap.data()));

        const qRecompensas = query(
          collection(db, "recompensas"),
          where("fechaCanje", ">=", start.toDate()),
          where("fechaCanje", "<=", end.toDate())
        );
        const snapRecompensas = await getDocs(qRecompensas);
        setRecompensas(snapRecompensas.docs.map((docSnap) => docSnap.data()));

        const qClientes = query(
          collection(db, "clientes"),
          where("creado", ">=", start.toDate()),
          where("creado", "<=", end.toDate())
        );
        const snapClientes = await getDocs(qClientes);
        setClientes(snapClientes.docs.map((docSnap) => docSnap.data()));
      } catch (error) {
        console.error("Error cargando panel admin:", error);
      }
    };

    fetchData();
  }, [rango, desde, hasta]);

  return (
    <div className="mx-auto w-full max-w-5xl text-white">
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--color-negro)] shadow-2xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-black via-[#171717] to-[#332400] px-4 py-6 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-4xl text-[var(--color-principalHover)] md:text-5xl">
                Panel de Control
              </h3>
              <p className="mt-2 max-w-2xl text-base text-white/75 md:text-lg">
                Consulta rápido altas, visitas y canjes.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="mb-3 text-sm uppercase tracking-[0.22em] text-white/55">
                Periodo analizado
              </p>
              <div className="flex flex-wrap gap-2 text-base">
                {rangos.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`rounded-full px-4 py-2 transition ${
                      rango === item.value
                        ? "bg-[var(--color-principal)] text-[var(--color-negro)] shadow-lg"
                        : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                    onClick={() => setRango(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {rango === "personalizado" && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    className="rounded-xl border border-white/15 bg-white px-3 py-2 text-black"
                  />
                  <input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="rounded-xl border border-white/15 bg-white px-3 py-2 text-black"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 py-5">
          <details className="overflow-hidden border-y border-white/10 bg-white/[0.04]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left">
              <div>
                <p className="text-2xl text-[var(--color-principal)]">
                  Personas registradas
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-principal)] px-3 py-1 text-sm text-black">
                {clientes.length}
              </span>
            </summary>
            <div className="border-t border-white/10 px-5 py-4">
              <div className="overflow-x-auto font-montserrat">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/65">
                      <th className="px-3 py-2">Fecha registro</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Correo o Tel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((cliente, index) => (
                      <tr
                        key={index}
                        className="border-t border-white/10 align-top hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-3 max-w-[160px] overflow-x-auto text-white/80">
                          {cliente.creado
                            ? dayjs(
                                cliente.creado.toDate
                                  ? cliente.creado.toDate()
                                  : cliente.creado
                              ).format("DD/MM/YYYY HH:mm")
                            : ""}
                        </td>
                        <td className="px-3 py-3 max-w-[180px] overflow-x-auto text-white">
                          {cliente.nombre}
                        </td>
                        <td className="px-3 py-3 max-w-[240px] overflow-x-auto text-white/75">
                          {cliente.correo || cliente.telefono}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>

          <details className="overflow-hidden border-y border-white/10 bg-white/[0.04]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left">
              <div>
                <p className="text-2xl text-[var(--color-principal)]">
                  Visitas registradas
                </p>
              </div>
              <span className="rounded-full bg-orange-500 px-3 py-1 text-sm text-white">
                {visitas.length}
              </span>
            </summary>
            <div className="border-t border-white/10 px-5 py-4">
              {visitas.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-center text-white/65">
                  No hay visitas registradas para este rango.
                </div>
              )}
              <div className="overflow-x-auto font-montserrat">
                <table className="hidden min-w-full text-sm sm:table">
                  <thead>
                    <tr className="text-left text-white/65">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Monto compra</th>
                      <th className="px-3 py-2">Puntos obtenidos</th>
                      <th className="px-3 py-2">Puntos usados</th>
                      <th className="px-3 py-2">Puntos finales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitas.map((visita, index) => (
                      <tr
                        key={index}
                        className="border-t border-white/10 align-top hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-3 text-white/80">
                          {visita.fecha
                            ? dayjs(
                                visita.fecha.toDate
                                  ? visita.fecha.toDate()
                                  : visita.fecha
                              ).format("DD/MM/YYYY HH:mm")
                            : ""}
                        </td>
                        <td className="px-3 py-3 text-white">
                          {visita.nombre || visita.clienteUid}
                        </td>
                        <td className="px-3 py-3 text-white/80">
                          {visita.montoGastado && !isNaN(Number(visita.montoGastado))
                            ? `$${Number(visita.montoGastado).toFixed(2)}`
                            : "-"}
                        </td>
                        <td className="px-3 py-3 text-white/80">
                          {visita.puntosGanados && !isNaN(Number(visita.puntosGanados))
                            ? Number(visita.puntosGanados).toFixed(2)
                            : "0"}
                        </td>
                        <td className="px-3 py-3 text-white/80">
                          {visita.puntosCanjeados && !isNaN(Number(visita.puntosCanjeados))
                            ? Number(visita.puntosCanjeados).toFixed(2)
                            : "0"}
                        </td>
                        <td className="px-3 py-3 text-white/80">
                          {visita.puntosDespues && !isNaN(Number(visita.puntosDespues))
                            ? Number(visita.puntosDespues).toFixed(2)
                            : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-2 flex flex-col gap-3 sm:hidden">
                  {visitas.map((visita, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm shadow"
                    >
                      <div className="grid gap-2 text-white/80">
                        <div>
                          <span className="text-[var(--color-principal)]">Fecha:</span>{" "}
                          {visita.fecha
                            ? dayjs(
                                visita.fecha.toDate
                                  ? visita.fecha.toDate()
                                  : visita.fecha
                              ).format("DD/MM/YYYY HH:mm")
                            : ""}
                        </div>
                        <div>
                          <span className="text-[var(--color-principal)]">Cliente:</span>{" "}
                          {visita.nombre || visita.clienteUid}
                        </div>
                        <div>
                          <span className="text-[var(--color-principal)]">Monto compra:</span>{" "}
                          {visita.montoGastado && !isNaN(Number(visita.montoGastado))
                            ? `$${Number(visita.montoGastado).toFixed(2)}`
                            : "-"}
                        </div>
                        <div>
                          <span className="text-[var(--color-principal)]">Puntos obtenidos:</span>{" "}
                          {visita.puntosGanados && !isNaN(Number(visita.puntosGanados))
                            ? Number(visita.puntosGanados).toFixed(2)
                            : "0"}
                        </div>
                        <div>
                          <span className="text-[var(--color-principal)]">Puntos usados:</span>{" "}
                          {visita.puntosCanjeados && !isNaN(Number(visita.puntosCanjeados))
                            ? Number(visita.puntosCanjeados).toFixed(2)
                            : "0"}
                        </div>
                        <div>
                          <span className="text-[var(--color-principal)]">Puntos finales:</span>{" "}
                          {visita.puntosDespues && !isNaN(Number(visita.puntosDespues))
                            ? Number(visita.puntosDespues).toFixed(2)
                            : "0"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>

          <details className="overflow-hidden border-y border-white/10 bg-white/[0.04]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left">
              <div>
                <p className="text-2xl text-[var(--color-principal)]">
                  Recompensas canjeadas
                </p>
              </div>
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-sm text-white">
                {recompensas.length}
              </span>
            </summary>
            <div className="border-t border-white/10 px-5 py-4">
              <div className="overflow-x-auto font-montserrat">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/65">
                      <th className="px-3 py-2">Fecha canje</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recompensas.map((recompensa, index) => (
                      <tr
                        key={index}
                        className="border-t border-white/10 align-top hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-3 text-white/80">
                          {recompensa.fechaCanje
                            ? dayjs(
                                recompensa.fechaCanje.toDate
                                  ? recompensa.fechaCanje.toDate()
                                  : recompensa.fechaCanje
                              ).format("DD/MM/YYYY HH:mm")
                            : ""}
                        </td>
                        <td className="px-3 py-3 text-white">
                          {recompensa.nombre || recompensa.clienteUid}
                        </td>
                        <td className="px-3 py-3 text-white/75">
                          {recompensa.mensaje || "-"}
                          {recompensa.detallesCanje && (
                            <div className="mt-2 rounded-xl bg-black/20 p-3 text-xs text-white/65">
                              {recompensa.detallesCanje.producto && (
                                <div>Producto: {recompensa.detallesCanje.producto}</div>
                              )}
                              {recompensa.detallesCanje.montoProducto && (
                                <div>
                                  Monto producto: ${recompensa.detallesCanje.montoProducto}
                                </div>
                              )}
                              {recompensa.detallesCanje.montoAntesDescuento && (
                                <div>
                                  Monto antes de descuento: $
                                  {recompensa.detallesCanje.montoAntesDescuento}
                                </div>
                              )}
                              {recompensa.detallesCanje.porcentajeDescuento && (
                                <div>
                                  Descuento: {recompensa.detallesCanje.porcentajeDescuento}%
                                </div>
                              )}
                              {recompensa.detallesCanje.descuentoGeneral && (
                                <div>
                                  Descuento general: {recompensa.detallesCanje.descuentoGeneral}
                                </div>
                              )}
                              {recompensa.detallesCanje.montoTotal && (
                                <div>
                                  Total a pagar: ${recompensa.detallesCanje.montoTotal}
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
            </div>
          </details>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-black/80 to-[#1c1c1c] p-4 md:p-5">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.24em] text-white/55">
                Herramienta extra
              </p>
              <h4 className="mt-2 text-2xl text-[var(--color-principal)]">
                Generador de tarjetas QR
              </h4>
            </div>
            <GeneradorTarjetasQR />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelAdmin;
