import { useEffect, useState } from "react";
import { doc, setDoc, getDoc, collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

export default function PanelMembresia({ user }) {
  const [fechaExpiracion, setFechaExpiracion] = useState(null);
  const [diaRenovacion, setDiaRenovacion] = useState(1);
  const [mesesPagados, setMesesPagados] = useState(1);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [loading, setLoading] = useState(true);
  const [historial, setHistorial] = useState([]);
  const [acordeonOpen, setAcordeonOpen] = useState(false);

  useEffect(() => {
    const cargarConfig = async () => {
      setLoading(true);
      const docRef = doc(db, "configuracion", "membresia");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setFechaExpiracion(data.ultimoPago);
        setNuevaFecha(data.ultimoPago?.slice(0, 10) || "");
        setDiaRenovacion(data.diaRenovacion || 1);
        setMesesPagados(data.mesesPagados || 1);
      }
      setLoading(false);
    };
    cargarConfig();
  }, []);

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

  // Renovar con fecha de hoy y meses pagados
  const renovarHoy = async () => {
    setLoading(true);
    const hoy = new Date();
    let nuevaExpiracion = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      diaRenovacion,
    );
    if (hoy.getDate() > diaRenovacion) {
      nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + 1);
    }
    nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + mesesPagados - 1);
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
    await setDoc(doc(db, "configuracion", "membresia"), {
      ultimoPago: new Date(nuevaFecha).toISOString(),
      diaRenovacion,
      mesesPagados,
    });
    setFechaExpiracion(new Date(nuevaFecha).toISOString());
    await guardarRenovacion(new Date(nuevaFecha).toISOString(), "manual");
    toast.success("Fecha de expiración modificada");
    setLoading(false);
  };

  // Nueva función para renovar sumando meses a la fecha de expiración actual
  const renovarMeses = async () => {
    setLoading(true);
    let baseDate = fechaExpiracion ? new Date(fechaExpiracion) : new Date();
    const hoy = new Date();
    if (baseDate < hoy) baseDate = hoy;
    let nuevaExpiracion = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      diaRenovacion,
    );
    if (baseDate.getDate() > diaRenovacion) {
      nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + 1);
    }
    nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + mesesPagados);
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

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 my-4 text-center max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-yellow-800 mb-2">
        Panel de Membresía
      </h2>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
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
                La membresía se renovará el día <b>{diaRenovacion}</b> de cada mes.
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
                Configura el día de renovación y realiza la primera renovación para activar la membresía.
              </div>
            </div>
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
                    <span className="text-[var(--color-principal)]">
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
                    Día de renovación: <b>{item.diaRenovacion}</b>, meses pagados: <b>{item.mesesPagados}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}