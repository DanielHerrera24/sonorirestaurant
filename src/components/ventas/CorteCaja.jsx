import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { FiScissors, FiDollarSign, FiCalendar, FiList } from "react-icons/fi";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const obtenerDesgloseVenta = (venta) => {
  if (venta.desglosePago && typeof venta.desglosePago === "object") {
    return {
      efectivo: Number(venta.desglosePago.efectivoAplicadoMXN) || 0,
      tarjeta: Number(venta.desglosePago.tarjeta) || 0,
      transferencia: Number(venta.desglosePago.transferencia) || 0,
    };
  }

  const monto = Number(venta.total) || 0;
  const raw = (
    venta.metodoPago ||
    venta.metodo ||
    venta.tipoPago ||
    venta.pago ||
    venta.formaPago ||
    ""
  )
    .toString()
    .toLowerCase();

  if (
    raw.includes("tarj") ||
    raw.includes("card") ||
    raw.includes("credit") ||
    raw.includes("debit") ||
    raw === "tarjeta"
  ) {
    return { efectivo: 0, tarjeta: monto, transferencia: 0 };
  }

  if (raw.includes("trans") || raw.includes("transfer")) {
    return { efectivo: 0, tarjeta: 0, transferencia: monto };
  }

  return { efectivo: monto, tarjeta: 0, transferencia: 0 };
};

export default function CorteCaja() {
  const [ventasDia, setVentasDia] = useState([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalPropinas, setTotalPropinas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [corteRealizado, setCorteRealizado] = useState(false);
  const [propinaManual, setPropinaManual] = useState(0);
  const [corteHoy, setCorteHoy] = useState(null);
  const [rol, setRol] = useState(null);
  const { user } = useAuth();

  // turno: 'manana' o 'tarde'
  const [turno, setTurno] = useState("manana");

  const [tieneCorteMananaHoy, setTieneCorteMananaHoy] = useState(false);

  // inicios de caja
  const [inicioManana, setInicioManana] = useState(null);
  const [inicioTarde, setInicioTarde] = useState(null);
  const [inicioDocs, setInicioDocs] = useState({
    mananaId: null,
    tardeId: null,
  });

  // modal para agregar/editar inicio
  const [showInicioModal, setShowInicioModal] = useState(false);
  const [inicioMontoInput, setInicioMontoInput] = useState("");
  const [inicioTurnoParaGuardar, setInicioTurnoParaGuardar] = useState(null);
  const [inicioFechaParaGuardar, setInicioFechaParaGuardar] = useState(null);

  // confirmación antes de cortar
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [desglosePagos, setDesglosePagos] = useState({
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    propinas: 0,
    total: 0,
  });
  const [conteoPagos, setConteoPagos] = useState({
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    propinas: 0,
  });
  const [dolaresEnCaja, setDolaresEnCaja] = useState("");
  const [tipoCambio, setTipoCambio] = useState(null);
  const [efectivoEnCaja, setEfectivoEnCaja] = useState("");

  useEffect(() => {
    const fetchTipoCambio = async () => {
      try {
        const snap = await getDoc(doc(db, "configuracion", "tipoCambio"));
        if (snap.exists()) {
          const data = snap.data();
          setTipoCambio(Number(data.valor) || null);
        }
      } catch (err) {
        setTipoCambio(null);
      }
    };
    fetchTipoCambio();
  }, []);

  useEffect(() => {
    if (!user) return;
    const cargarRol = async () => {
      try {
        const q = query(
          collection(db, "clientes"),
          where("authUid", "==", user.uid),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setRol(data.rol || "cliente");
        }
      } catch (err) {
        console.error("cargar rol:", err);
      }
    };
    cargarRol();
  }, [user]);

  // cargar ventas del turno seleccionado
  useEffect(() => {
    const cargarVentasTurno = async () => {
      setLoading(true);
      try {
        const hoy = dayjs().format("YYYY-MM-DD");
        let inicio, fin;

        // Busca el corte de la mañana
        let corteManana = null;
        if (turno === "manana" || turno === "tarde") {
          const qCortes = query(
            collection(db, "cortesCaja"),
            where("fechaTexto", "==", hoy),
            where("turno", "==", "manana"),
          );
          const snapCortes = await getDocs(qCortes);
          if (!snapCortes.empty) {
            corteManana = snapCortes.docs[0].data();
          }
        }

        if (turno === "manana") {
          // El turno de la mañana es desde el inicio del día hasta que se haga el corte de la mañana (o hasta el final del día si no hay corte)
          inicio = dayjs().startOf("day").toDate();
          fin = corteManana?.fechaCorte?.toDate
            ? corteManana.fechaCorte.toDate()
            : dayjs().endOf("day").toDate();
        } else {
          // El turno de la tarde es desde el corte de la mañana (si existe) hasta el final del día
          inicio = corteManana?.fechaCorte?.toDate
            ? corteManana.fechaCorte.toDate()
            : dayjs().endOf("day").toDate(); // Si no hay corte de mañana, no debería haber ventas en la tarde
          fin = dayjs().endOf("day").toDate();
        }

        const q = query(
          collection(db, "ventas"),
          where("fecha", ">=", inicio),
          where("fecha", "<=", fin),
          orderBy("fecha", "asc"),
        );
        const snap = await getDocs(q);
        const datos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVentasDia(datos);
        setTotalVentas(
          datos
            .filter((v) => v.estado !== "cancelada")
            .reduce((acc, v) => acc + (Number(v.total) || 0), 0),
        );
        setTotalPropinas(
          datos
            .filter((v) => v.estado !== "cancelada")
            .reduce((acc, v) => acc + (Number(v.propina) || 0), 0),
        );
      } catch (err) {
        toast.error("Error al cargar ventas del turno");
      }
      setLoading(false);
    };
    cargarVentasTurno();
  }, [corteRealizado, turno]);

  // cargar historial de cortes e inicios del día
  useEffect(() => {
    const cargarHistorialYInicios = async () => {
      try {
        const qCortes = query(
          collection(db, "cortesCaja"),
          orderBy("fechaCorte", "desc"),
        );
        const snapCortes = await getDocs(qCortes);
        const cortes = snapCortes.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistorial(cortes);

        const hoy = dayjs().format("YYYY-MM-DD");
        const corteDelTurno = cortes.find(
          (c) => c.fechaTexto === hoy && c.turno === turno,
        );
        setCorteHoy(corteDelTurno || null);

        const existeManana = cortes.some(
          (c) => c.fechaTexto === hoy && c.turno === "manana",
        );
        setTieneCorteMananaHoy(!!existeManana);

        // cargar inicios para hoy
        const qInicios = query(
          collection(db, "iniciosCaja"),
          where("fechaTexto", "==", hoy),
        );
        const snapInicios = await getDocs(qInicios);
        let mananaDoc = null;
        let tardeDoc = null;
        snapInicios.docs.forEach((d) => {
          const data = d.data();
          if (data.turno === "manana") {
            mananaDoc = { id: d.id, ...data };
          } else if (data.turno === "tarde") {
            tardeDoc = { id: d.id, ...data };
          }
        });
        setInicioManana(mananaDoc ? (mananaDoc.monto ?? null) : null);
        setInicioTarde(tardeDoc ? (tardeDoc.monto ?? null) : null);
        setInicioDocs({
          mananaId: mananaDoc?.id || null,
          tardeId: tardeDoc?.id || null,
        });
      } catch (err) {
        toast.error("Error al cargar historial de cortes/inicios");
      }
    };
    cargarHistorialYInicios();
  }, [corteRealizado, turno]);

  // si es inicio de día y no existe inicio mañana, abrir modal para establecerlo
  useEffect(() => {
    if (dayjs().hour() < 15 && inicioManana == null) {
      // abrir modal una sola vez por recarga de componente
      abrirModalInicio("manana");
    }
  }, [inicioManana]);

  const inicioDayTo15 = (inicioDay) => inicioDay.hour(15).minute(0).second(0);

  const totalPropinasCorte = totalPropinas + (Number(propinaManual) || 0);

  const abrirModalInicio = async (turnoParam) => {
    const fechaPara = dayjs().format("YYYY-MM-DD");
    // verificar si ya existe inicio para esa fecha y turno -> si existe no permitir editar
    try {
      const q = query(
        collection(db, "iniciosCaja"),
        where("fechaTexto", "==", fechaPara),
        where("turno", "==", turnoParam),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("El inicio de caja ya fue registrado y no puede editarse.");
        return;
      }
    } catch (err) {
      console.error("Error verificando inicio previo:", err);
      toast.error("No se pudo verificar inicio de caja.");
      return;
    }

    // si no existe, abrir modal para registrar
    setInicioTurnoParaGuardar(turnoParam);
    setInicioFechaParaGuardar(fechaPara);
    setInicioMontoInput("");
    setShowInicioModal(true);
  };

  const guardarInicioCaja = async () => {
    const monto = Number(inicioMontoInput || 0);
    if (isNaN(monto) || monto < 0) {
      toast.error("Ingresa un monto válido.");
      return;
    }
    try {
      const q = query(
        collection(db, "iniciosCaja"),
        where("fechaTexto", "==", inicioFechaParaGuardar),
        where("turno", "==", inicioTurnoParaGuardar),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docId = snap.docs[0].id;
        await updateDoc(doc(db, "iniciosCaja", docId), {
          monto,
          actualizadoPor: user?.uid || null,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "iniciosCaja"), {
          fechaTexto: inicioFechaParaGuardar,
          turno: inicioTurnoParaGuardar,
          monto,
          creadoPor: user?.uid || null,
          createdAt: serverTimestamp(),
        });
      }
      toast.success("Inicio de caja guardado.");
      setShowInicioModal(false);
      setCorteRealizado((v) => !v); // recargar inicios/cortes
    } catch (err) {
      console.error("Error guardando inicio de caja:", err);
      toast.error("No se pudo guardar el inicio de caja.");
    }
  };

  const abrirConfirmCorte = async () => {
    const pendientesSnap = await getDocs(collection(db, "pedidosPendientes"));
    if (!pendientesSnap.empty) {
      toast.error(
        "No puedes realizar el corte de caja mientras haya pedidos pendientes. Termina o elimina esas ventas antes de continuar.",
      );
      return;
    }

    if (ventasDia.length === 0) {
      toast.error("No hay ventas para cortar en este turno.");
      return;
    }
    if (turno === "manana" && inicioManana == null) {
      toast.error(
        "Debe registrar el inicio de caja de la mañana antes de cortar.",
      );
      abrirModalInicio("manana");
      return;
    }
    if (turno === "tarde" && !tieneCorteMananaHoy) {
      toast.error(
        "Primero debe realizarse el corte de la mañana antes de hacer el corte de la tarde.",
      );
      return;
    }
    if (turno === "tarde" && inicioTarde == null) {
      toast.error(
        "Debe confirmar/registrar el inicio de caja de la tarde antes de cortar.",
      );
      abrirModalInicio("tarde");
      return;
    }
    if (corteHoy) {
      toast.error(`Ya se realizó el corte de caja del turno ${turno} hoy.`);
      return;
    }

    // calcular desglose por tipo de pago
    const desglose = {
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      propinas: 0,
      total: 0,
    };
    const conteo = { efectivo: 0, tarjeta: 0, transferencia: 0, propinas: 0 };
    ventasDia.forEach((v) => {
      if (v.estado === "cancelada") return;
      const monto = Number(v.total) || 0;
      const desgloseVenta = obtenerDesgloseVenta(v);

      desglose.efectivo += desgloseVenta.efectivo;
      desglose.tarjeta += desgloseVenta.tarjeta;
      desglose.transferencia += desgloseVenta.transferencia;

      if (desgloseVenta.efectivo > 0) conteo.efectivo += 1;
      if (desgloseVenta.tarjeta > 0) conteo.tarjeta += 1;
      if (desgloseVenta.transferencia > 0) conteo.transferencia += 1;

      desglose.total += monto;
    });

    // agregar las propinas del input al desglose y al total
    desglose.propinas = totalPropinasCorte;
    conteo.propinas = 1; // indicador; no representa ventas
    desglose.total += totalPropinasCorte;

    setDesglosePagos(desglose);
    setConteoPagos(conteo);
    setShowConfirmModal(true);
  };

  const confirmarCorte = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await addDoc(collection(db, "cortesCaja"), {
        fechaCorte: serverTimestamp(),
        fechaTexto: dayjs().format("YYYY-MM-DD"),
        turno,
        totalVentas,
        totalPropinas: totalPropinasCorte,
        propinaManual: Number(propinaManual) || 0,
        ventasIncluidas: ventasDia.map((v) => v.id),
        desglosePagos,
        createdBy: user?.uid || null,
      });
      toast.success(`¡Corte de caja ${turno} realizado!`);
      setCorteRealizado((v) => !v);
      setPropinaManual(0);
      if (turno === "manana") abrirModalInicio("tarde");
    } catch (err) {
      console.error("Error al confirmar corte:", err);
      toast.error("Error al realizar el corte de caja.");
    }
    setLoading(false);
  };

  return (
    <section className="bg-white rounded shadow p-4 mt-10 sm:mt-0">
      <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2 mb-4">
        <FiScissors /> Corte de caja
      </h3>

      {/* 1) Si no se ha establecido el fondo de la mañana, obligar a establecerlo */}
      {inicioManana == null ? (
        <div className="p-6 border rounded bg-yellow-50 text-center">
          <p className="mb-4 font-semibold text-lg">
            Debes establecer el monto de fondo de caja para iniciar el día
            (turno mañana).
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => abrirModalInicio("manana")}
              className="px-4 py-2 bg-orange-500 text-white rounded"
            >
              Establecer fondo de mañana
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Selector de turno */}
          <div className="mb-4 flex gap-2 items-center">
            <div className="text-sm font-semibold">Turno:</div>
            <button
              onClick={() => setTurno("manana")}
              className={`px-3 py-1 rounded-full font-semibold border ${
                turno === "manana"
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-orange-500 border-orange-600"
              }`}
            >
              Mañana
            </button>
            <button
              onClick={() => setTurno("tarde")}
              className={`px-3 py-1 rounded-full font-semibold border ${
                turno === "tarde"
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-orange-500 border-orange-600"
              }`}
            >
              Tarde
            </button>
            <div className="ml-auto text-sm text-gray-600">
              Ventas en {turno === "manana" ? "la mañana" : "la tarde"}
            </div>
          </div>

          {/* 2) Mostrar solo información relevante según turno y estado */}
          {turno === "manana" && (
            <>
              {/* Inicio de mañana */}
              <div className="mb-3 flex items-center gap-3">
                <div>
                  <div className="text-sm text-gray-600">Inicio mañana:</div>
                  <div className="font-bold">
                    {inicioManana != null
                      ? `$${inicioManana}`
                      : "No establecido"}
                  </div>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => abrirModalInicio("manana")}
                    disabled={inicioManana != null}
                    className={`px-3 py-1 rounded ${inicioManana != null ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[var(--color-secundario)] text-[var(--color-principal)] hover:bg-[var(--color-secundarioHover)]"}`}
                  >
                    Registrar inicio (mañana)
                  </button>
                </div>
              </div>

              {/* Resumen y control del turno mañana */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2 bg-orange-50 rounded p-2">
                    <FiCalendar className="text-orange-500" />
                    <span className="font-semibold">Fecha:</span>
                    <span>{dayjs().format("DD/MM/YYYY")}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 rounded p-2">
                    <FiDollarSign className="text-green-600" />
                    <span className="font-semibold">Total ventas:</span>
                    <span className="text-green-700 font-bold text-lg">
                      ${totalVentas}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Ventas en el turno:{" "}
                  <span className="font-bold">{ventasDia.filter((v) => v.estado !== "cancelada").length}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex items-center gap-2 bg-blue-50 rounded p-2">
                  <FiDollarSign className="text-blue-600" />
                  <span className="font-semibold">Propinas del turno:</span>
                  <input
                    type="number"
                    min={0}
                    value={propinaManual}
                    onChange={(e) => setPropinaManual(e.target.value)}
                    className="w-24 border rounded px-2 py-1 bg-white text-lg"
                    placeholder="0"
                    disabled={!!corteHoy}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  (Se sumará al total de propinas del corte)
                </span>
              </div>

              <div className="flex justify-center mb-6 mt-4">
                <button
                  onClick={abrirConfirmCorte}
                  disabled={loading || ventasDia.length === 0 || !!corteHoy}
                  className="bg-orange-500 text-white font-bold px-6 py-2 rounded-full shadow hover:scale-105 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <FiScissors />
                  {corteHoy
                    ? `Corte ${turno} ya realizado hoy`
                    : loading
                      ? "Realizando corte..."
                      : `Realizar corte (mañana)`}
                </button>
              </div>
            </>
          )}

          {turno === "tarde" && (
            <>
              {/* Si no se hizo el corte de mañana, bloquear acceso a tarde */}
              {!tieneCorteMananaHoy ? (
                <div className="p-4 border rounded bg-red-50 text-center">
                  <p className="font-semibold mb-2">
                    No se puede operar en turno tarde.
                  </p>
                  <p className="text-sm">
                    Debes esperar a que se realice el corte de la mañana.
                  </p>
                </div>
              ) : (
                <>
                  {/* Inicio de tarde */}
                  <div className="mb-3 flex items-center gap-3">
                    <div>
                      <div className="text-sm text-gray-600">Inicio tarde:</div>
                      <div className="font-bold">
                        {inicioTarde != null
                          ? `$${inicioTarde}`
                          : "No establecido"}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <button
                        onClick={() => abrirModalInicio("tarde")}
                        disabled={inicioTarde != null}
                        className={`px-3 py-1 rounded ${inicioTarde != null ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[var(--color-secundario)] text-[var(--color-principal)] hover:bg-[var(--color-secundarioHover)]"}`}
                      >
                        Registrar inicio (tarde)
                      </button>
                    </div>
                  </div>

                  {/* Resumen y control del turno tarde (mismo contenido que mañana pero para tarde) */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2 bg-orange-50 rounded p-2">
                        <FiCalendar className="text-orange-500" />
                        <span className="font-semibold">Fecha:</span>
                        <span>{dayjs().format("DD/MM/YYYY")}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-green-50 rounded p-2">
                        <FiDollarSign className="text-green-600" />
                        <span className="font-semibold">Total ventas:</span>
                        <span className="text-green-700 font-bold text-lg">
                          ${totalVentas}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Ventas en el turno:{" "}
                      <span className="font-bold">{ventasDia.filter((v) => v.estado !== "cancelada").length}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="flex items-center gap-2 bg-blue-50 rounded p-2">
                      <FiDollarSign className="text-blue-600" />
                      <span className="font-semibold">Propinas del turno:</span>
                      <input
                        type="number"
                        min={0}
                        value={propinaManual}
                        onChange={(e) => setPropinaManual(e.target.value)}
                        className="w-24 border rounded px-2 py-1 bg-white text-lg"
                        placeholder="0"
                        disabled={!!corteHoy}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      (Se sumará al total de propinas del corte)
                    </span>
                  </div>

                  <div className="flex justify-center mb-6 mt-4">
                    <button
                      onClick={abrirConfirmCorte}
                      disabled={loading || ventasDia.length === 0 || !!corteHoy}
                      className="bg-orange-500 text-white font-bold px-6 py-2 rounded-full shadow hover:scale-105 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <FiScissors />
                      {corteHoy
                        ? `Corte ${turno} ya realizado hoy`
                        : loading
                          ? "Realizando corte..."
                          : `Realizar corte (tarde)`}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Historial (admin) */}
      {rol === "admin" && (
        <div className="mt-6">
          <h4 className="font-semibold text-orange-500 flex items-center gap-2 mb-2">
            <FiList /> Historial de cortes
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Turno</th>
                  <th className="p-2 text-right">Total ventas</th>
                  <th className="p-2 text-right">Propinas</th>
                  <th className="p-2 text-center"># Ventas</th>
                </tr>
              </thead>
              <tbody>
                {historial.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6">
                      No hay cortes registrados.
                    </td>
                  </tr>
                ) : (
                  historial.map((corte) => (
                    <tr key={corte.id} className="border-b hover:bg-yellow-50">
                      <td className="p-2">
                        {corte.fechaTexto ||
                          (corte.fechaCorte?.toDate
                            ? dayjs(corte.fechaCorte.toDate()).format(
                                "DD/MM/YYYY",
                              )
                            : "")}
                      </td>
                      <td className="p-2">{corte.turno}</td>
                      <td className="p-2 text-right font-bold">
                        ${corte.totalVentas}
                      </td>
                      <td className="p-2 text-right">${corte.totalPropinas}</td>
                      <td className="p-2 text-center">
                        {corte.ventasIncluidas?.length || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para ingresar inicio de caja */}
      {showInicioModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 z-50">
            <h4 className="text-lg font-bold mb-3">
              Inicio de caja -{" "}
              {inicioTurnoParaGuardar === "manana" ? "Mañana" : "Tarde"}
            </h4>
            <p className="text-sm mb-3">
              Ingresa el monto de inicio de caja para{" "}
              <strong>{inicioTurnoParaGuardar}</strong> (fecha{" "}
              {inicioFechaParaGuardar}).
            </p>
            <input
              type="number"
              min="0"
              value={inicioMontoInput}
              onChange={(e) => setInicioMontoInput(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-4"
              placeholder="0.00"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowInicioModal(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={guardarInicioCaja}
                className="px-4 py-2 bg-orange-500 text-white rounded"
              >
                Guardar inicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación del corte con desglose por tipo de pago */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h4 className="text-lg font-bold mb-3">
              Verificar corte - {turno === "manana" ? "Mañana" : "Tarde"}
            </h4>
            <p className="text-sm mb-2">
              Revisa el desglose por tipo de pago antes de confirmar el corte:
            </p>
            <p className="text-sm text-gray-600 mb-4">
              El apartado de efectivo y dólares es solo una calculadora para
              ayudarte a hacer el corte, no afecta los datos del sistema.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 border rounded">
                <div className="text-sm text-gray-600">Efectivo</div>
                <div className="font-bold text-lg">
                  ${desglosePagos.efectivo.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {conteoPagos.efectivo} ventas
                </div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-gray-600">Tarjeta</div>
                <div className="font-bold text-lg">
                  ${desglosePagos.tarjeta.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {conteoPagos.tarjeta} ventas
                </div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-gray-600">Transferencia</div>
                <div className="font-bold text-lg">
                  ${desglosePagos.transferencia.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {conteoPagos.transferencia} ventas
                </div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-gray-600">Propinas</div>
                <div className="font-bold text-lg">
                  ${desglosePagos.propinas.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">En corte de caja</div>
              </div>
            </div>
            <div className="mb-4 text-right font-bold">
              Total sistema: ${desglosePagos.total.toFixed(2)}
            </div>
            <div className="flex flex-wrap sm:flex-nowrap border-y-2 border-dotted border-yellow-400 items-center justify-between my-2">
              <div className="mb-4 flex flex-col gap-2 w-full">
                <label className="font-semibold text-gray-700">
                  Efectivo en caja (MXN)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={efectivoEnCaja}
                  onChange={(e) => setEfectivoEnCaja(e.target.value)}
                  className="border rounded px-2 py-1 w-32"
                  placeholder="0.00"
                />
              </div>
              <div className="mb-4 flex flex-col gap-2 w-full">
                <label className="font-semibold text-gray-700">
                  Dólares en caja (USD)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dolaresEnCaja}
                    onChange={(e) => setDolaresEnCaja(e.target.value)}
                    className="border rounded px-2 py-1 w-32"
                    placeholder="0.00"
                  />
                  {tipoCambio && dolaresEnCaja && (
                    <div className="flex flex-col items-start justify-center text-green-700 font-semibold">
                      <span>
                        ${(Number(dolaresEnCaja) * tipoCambio).toFixed(2)} MXN
                      </span>
                      <span className="text-gray-500 text-xs">
                        (Tipo de cambio: {tipoCambio})
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-4 text-right font-bold w-full">
                Total en caja: $
                {(
                  (Number(efectivoEnCaja) || 0) +
                  (Number(dolaresEnCaja) || 0) * (tipoCambio || 0)
                ).toFixed(2)}{" "}
                MXN
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCorte}
                className="px-4 py-2 bg-orange-500 text-white rounded"
              >
                Confirmar corte
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
