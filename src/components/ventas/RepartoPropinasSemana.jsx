import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { FiUsers, FiDollarSign, FiCalendar, FiSend } from "react-icons/fi";
import toast from "react-hot-toast";

dayjs.extend(isoWeek);

export default function RepartoPropinasSemana() {
  const [numEmpleados, setNumEmpleados] = useState(1);
  const [semana, setSemana] = useState(dayjs().startOf("isoWeek").format("YYYY-MM-DD"));
  const [totalPropinasSemana, setTotalPropinasSemana] = useState(0);
  const [loading, setLoading] = useState(false);
  const [repartoRealizado, setRepartoRealizado] = useState(false);

  // Cargar propinas de la semana (lunes a domingo)
  useEffect(() => {
    const cargarPropinasSemana = async () => {
      setLoading(true);
      try {
        const inicio = dayjs(semana).startOf("isoWeek").toDate(); // lunes
        const fin = dayjs(semana).endOf("isoWeek").toDate();     // domingo
        const q = query(
          collection(db, "cortesCaja"),
          where("fechaCorte", ">=", inicio),
          where("fechaCorte", "<=", fin)
        );
        const snap = await getDocs(q);
        const total = snap.docs.reduce((acc, doc) => {
          const data = doc.data();
          return acc + (Number(data.totalPropinas) || 0);
        }, 0);
        setTotalPropinasSemana(total);
      } catch (err) {
        toast.error("Error al cargar propinas de la semana");
      }
      setLoading(false);
    };
    cargarPropinasSemana();
  }, [semana, repartoRealizado]);

  // Calcular propina por empleado
  const propinaPorEmpleado =
    numEmpleados > 0
      ? (totalPropinasSemana / numEmpleados).toFixed(2)
      : 0;

  // Registrar reparto en Firestore
  const registrarReparto = async () => {
    if (!numEmpleados || numEmpleados < 1) {
      toast.error("Ingresa el número de empleados.");
      return;
    }
    if (totalPropinasSemana === 0) {
      toast.error("No hay propinas para repartir esta semana.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "repartosPropina"), {
        semana: dayjs(semana).startOf("isoWeek").format("YYYY-MM-DD"),
        fechaRegistro: serverTimestamp(),
        numEmpleados: Number(numEmpleados),
        totalPropinas: totalPropinasSemana,
        propinaPorEmpleado: Number(propinaPorEmpleado),
      });
      toast.success("¡Reparto de propinas registrado!");
      setRepartoRealizado((v) => !v);
    } catch (err) {
      toast.error("Error al registrar el reparto.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="text-xl font-semibold text-[var(--color-principal)] flex items-center gap-2 mb-4">
        <FiUsers /> Reparto de propinas semanal
      </h3>
      <div className="flex flex-wrap gap-4 items-center mb-4">
        <div className="flex flex-wrap items-center gap-2 bg-yellow-50 rounded p-2">
          <FiCalendar className="text-[var(--color-principal)]" />
          <span className="font-semibold">Semana:</span>
          <input
            type="date"
            value={semana}
            onChange={(e) => setSemana(e.target.value)}
            className="border rounded px-2 py-1 text-base"
          />
          <span className="text-sm text-gray-600">
            (Selecciona cualquier día de la semana. El cálculo será de lunes a domingo.)
          </span>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 rounded p-2">
          <FiDollarSign className="text-blue-600" />
          <span className="font-semibold">Propinas acumuladas:</span>
          <span className="text-blue-700 font-bold text-lg">${totalPropinasSemana}</span>
        </div>
      </div>
      <div className="mb-4">
        <span className="font-semibold text-gray-700 mb-2 block">Número de empleados:</span>
        <input
          type="number"
          min={1}
          value={numEmpleados}
          onChange={(e) => setNumEmpleados(e.target.value)}
          className="border rounded px-2 py-1 text-base w-32"
          placeholder="Ej: 5"
        />
      </div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-bold text-lg text-[var(--color-principal)] flex items-center gap-2">
          <FiDollarSign /> Propina por empleado:
        </span>
        <span className="text-xl font-bold text-green-700">${propinaPorEmpleado}</span>
      </div>
      <div className="flex justify-center">
        <button
          onClick={registrarReparto}
          disabled={loading || totalPropinasSemana === 0}
          className="bg-gradient-to-r from-[var(--color-principal)] to-[var(--color-principalClaro)] text-white font-bold px-6 py-2 rounded-full shadow hover:scale-105 transition flex items-center gap-2 disabled:opacity-50"
        >
          <FiSend />
          {loading ? "Registrando..." : "Registrar reparto"}
        </button>
      </div>
    </div>
  );
}