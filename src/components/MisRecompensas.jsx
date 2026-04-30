import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function MisRecompensas({ uid }) {
  const [recompensas, setRecompensas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "clientes", uid);

    const unsub = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRecompensas(data.recompensas || []);
      }
    });
    setLoading(false);

    return () => unsub();
  }, [uid]);

  if (loading)
    return <p className="text-center mt-4">Cargando recompensas...</p>;

  const recompensasDisponibles = recompensas.filter((r) => !r.canjeado);
  const recompensasCanjeadas = recompensas.filter((r) => r.canjeado);

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <h2 className="text-xl font-bold text-center mb-4 text-[var(--color-principal)]">
        🎁 Mis Recompensas
      </h2>

      {/* Recompensas disponibles */}
      <h3 className="text-lg  text-[var(--color-principal)] mb-2">
        Disponibles
      </h3>
      {recompensasDisponibles.length === 0 ? (
        <p className="text-center text-gray-200 mb-4">
          No tienes recompensas disponibles.
        </p>
      ) : (
        <ul className="space-y-3 mb-6">
          {recompensasDisponibles.map((r, i) => (
            <li
              key={r.codigo + i}
              className="border p-3 rounded shadow-lg border-[var(--color-principal)] flex flex-col sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className=" text-white">
                  🎁 Recompensa:{" "}
                  <span className="font-mono">{r.mensaje}</span>
                </p>
                <p className="text-sm text-gray-200">
                  Descripción: {r.descripcion || "Sin descripción"}
                </p>
                <p className=" text-[var(--color-loNuevo)]">
                  Código: <span className="font-mono">{r.codigo}</span>
                </p>
                <p className="text-sm text-gray-200">
                  Fecha: {new Date(r.fecha).toLocaleString()}
                </p>
              </div>
              <span className="text-sm font-bold mt-2 sm:mt-0 sm:ml-4 text-[var(--color-principal)]">
                🎟️ Disponible
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Recompensas canjeadas */}
      <h3 className="text-lg  text-[var(--color-secundario)] mb-2">Canjeadas</h3>
      {recompensasCanjeadas.length === 0 ? (
        <p className="text-center text-gray-200">
          No has canjeado recompensas.
        </p>
      ) : (
        <ul className="space-y-3">
          {recompensasCanjeadas.map((r, i) => (
            <li
              key={r.codigo + i}
              className="border p-3 rounded bg-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="">
                  🎁 Recompensa:{" "}
                  <span className="font-mono">{r.mensaje}</span>
                </p>
                {r.descripcion && (
                  <p className="text-sm text-gray-600">
                  Descripción: {r.descripcion || "Sin descripción"}
                </p>
                )}
                <p className="">
                  Código: <span className="font-mono">{r.codigo}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Fecha: {new Date(r.fecha).toLocaleString()}
                </p>
                {r.fechaCanje && (
                  <p className="text-sm text-[var(--color-loNuevo)]">
                    Fecha de canjeo: {new Date(r.fechaCanje).toLocaleString()}
                  </p>
                )}
              </div>
              <span className="text-sm font-bold mt-2 sm:mt-0 sm:ml-4 text-[var(--color-loNuevo)]">
                ✅ Canjeado
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
