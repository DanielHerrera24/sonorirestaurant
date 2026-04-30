import { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function OrdenesDia() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editNotas, setEditNotas] = useState("");

  useEffect(() => {
    const fetchOrdenes = async () => {
      setLoading(true);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const mañana = new Date(hoy);
      mañana.setDate(hoy.getDate() + 1);

      const q = query(
        collection(db, "ventas"),
        where("fecha", ">=", hoy),
        where("fecha", "<", mañana),
      );
      const snapshot = await getDocs(q);
      const lista = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      lista.sort((a, b) => {
        const fechaA = a.fecha?.toDate?.() || new Date(0);
        const fechaB = b.fecha?.toDate?.() || new Date(0);
        return fechaB - fechaA;
      });
      setOrdenes(lista);
      setLoading(false);
    };
    fetchOrdenes();
  }, []);

  const handleEdit = async (id) => {
    try {
      await updateDoc(doc(db, "ventas", id), { notas: editNotas });
      toast.success("Notas actualizadas");
      setEditId(null);
      setEditNotas("");
      setOrdenes(
        ordenes.map((o) => (o.id === id ? { ...o, notas: editNotas } : o)),
      );
    } catch {
      toast.error("Error al editar");
    }
  };

  const handleCancel = async (id) => {
    try {
      await updateDoc(doc(db, "ventas", id), { estado: "cancelada" });
      toast.success("Orden cancelada");
      setOrdenes(
        ordenes.map((o) => (o.id === id ? { ...o, estado: "cancelada" } : o)),
      );
    } catch {
      toast.error("Error al cancelar");
    }
  };

  return (
    <div className="mx-auto mt-10 sm:mt-0 max-w-5xl">
      <h2 className="text-3xl font-bold mb-6 text-orange-500 text-center">
        Órdenes del Día
      </h2>
      {loading ? (
        <div className="text-center text-gray-500">Cargando órdenes...</div>
      ) : ordenes.length === 0 ? (
        <div className="text-center text-gray-500">
          No hay órdenes registradas hoy.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ordenes.map((orden) => (
            <div
              key={orden.id}
              className={`relative bg-white rounded-xl shadow-lg p-6 flex flex-col gap-3 border-l-8 transition-all duration-200
                ${
                  orden.estado === "cancelada"
                    ? "border-red-400 opacity-60"
                    : "border-green-400 hover:shadow-2xl"
                }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg text-orange-500">
                  #{orden.id.slice(-6).toUpperCase()}
                </span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                  {orden.fecha
                    ?.toDate?.()
                    .toLocaleTimeString?.([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) || ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <span className={`px-2 py-1 rounded text-xs font-bold
                  ${orden.estado === "servida" ? "bg-green-100 text-green-700" : ""}
                  ${orden.estado === "pendiente" ? "bg-orange-100 text-orange-700" : ""}
                  ${orden.estado === "en cocina" ? "bg-blue-100 text-blue-700" : ""}
                  ${orden.estado === "cocinando" ? "bg-yellow-100 text-yellow-700" : ""}
                  ${orden.estado === "cancelada" ? "bg-red-100 text-red-600" : ""}
                }`}>
                  {orden.estado?.toUpperCase() || "PENDIENTE"}
                </span>
              </div>
              <div>
                <span className="font-semibold">Productos:</span>
                <ul className="ml-4 list-disc text-md mt-1">
                  {orden.productos?.map((p, i) => (
                    <li key={i}>
                      <span className="font-medium">{p.nombre}</span>
                      <span className="ml-2 text-gray-500">x {p.cantidad}</span>
                      {p.precio > 0 && (
                        <span className="ml-2 text-orange-500 font-semibold">
                          ${p.precio}
                        </span>
                      )}
                      {p.estado === "gratis" && (
                        <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                          Gratis
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              {orden.notas && (
                <div>
                  <span className="font-semibold">Notas:</span>
                  <span className="ml-2 text-gray-700">
                    {orden.notas || (
                      <span className="italic text-gray-400">Sin notas</span>
                    )}
                  </span>
                </div>
              )}
              <div className="mt-2 font-bold text-right text-lg text-orange-600">
                Total: ${orden.total?.toFixed(2) || "0.00"}
              </div>
              <div className="flex gap-2 mt-2">
                {orden.estado !== "cancelada" && (
                  <>
                    <button
                      onClick={() => handleCancel(orden.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-red-600 transition"
                    >
                      <FaTrash /> Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
