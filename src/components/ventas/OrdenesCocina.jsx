import { useEffect, useState, useRef } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { CiStickyNote } from "react-icons/ci";
import { FaCheckCircle, FaClock } from "react-icons/fa";
import campana from "../../assets/sonidos/campana 1.mp3";
import { TfiControlShuffle } from "react-icons/tfi";
import { TbChefHat } from "react-icons/tb";

export default function OrdenesCocina() {
  const [ordenes, setOrdenes] = useState([]);
  const prevOrdenesRef = useRef([]);
  const audioRef = useRef(null);
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  function formateaCronometro(fechaFirestore) {
    if (!fechaFirestore?.toDate) return "00:00";
    const inicio = fechaFirestore.toDate().getTime();
    const diff = Math.max(0, Math.floor((ahora - inicio) / 1000));
    const min = String(Math.floor(diff / 60)).padStart(2, "0");
    const seg = String(diff % 60).padStart(2, "0");
    return `${min}:${seg}`;
  }

  function colorCronometro(fechaFirestore) {
    if (!fechaFirestore?.toDate) return "text-white";
    const inicio = fechaFirestore.toDate().getTime();
    const diff = Math.max(0, Math.floor((ahora - inicio) / 1000));
    const min = Math.floor(diff / 60);
    if (min >= 20)
      return "text-red-500 font-extrabold bg-white rounded px-1 animate-pulse";
    if (min >= 15) return "text-white font-bold";
    if (min >= 10) return "text-black font-bold";
    return "text-white";
  }

  function bgHeaderPorTiempo(fechaFirestore) {
    if (!fechaFirestore?.toDate) return "bg-orange-500";
    const inicio = fechaFirestore.toDate().getTime();
    const diff = Math.max(0, Math.floor((ahora - inicio) / 1000));
    const min = Math.floor(diff / 60);
    if (min >= 20) return "bg-red-600 text-white animate-pulse";
    if (min >= 15) return "bg-orange-800 text-white";
    if (min >= 10) return "bg-yellow-300 text-black";
    return "bg-orange-500 text-white";
  }

  useEffect(() => {
    audioRef.current = new Audio(campana);
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    const hoy = dayjs().format("YYYY-MM-DD");
    const q = query(
      collection(db, "ventas"),
      where("fechaTexto", "==", hoy),
      where("estado", "in", ["pendiente", "en cocina", "cocinando"]),
      orderBy("fecha", "asc"),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Detecta nuevas órdenes
      const prevIds = prevOrdenesRef.current.map((o) => o.id);
      const nuevas = datos.filter((o) => !prevIds.includes(o.id));

      // Sonar si:
      // 1. Antes no había órdenes y ahora sí (de 0 a 1+)
      // 2. O si hay nuevas órdenes (nuevas.length > 0)
      if (
        (prevOrdenesRef.current.length === 0 && datos.length > 0) ||
        nuevas.length > 0
      ) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      prevOrdenesRef.current = datos;
      setOrdenes(datos);
    });
    return () => unsub();
  }, []);

  const toggleCocinando = async (orden) => {
    try {
      // Si ya está en "cocinando", vuelve a "en cocina" (o "pendiente" si prefieres)
      const nuevoEstado =
        orden.estado === "cocinando" ? "en cocina" : "cocinando";
      await updateDoc(doc(db, "ventas", orden.id), { estado: nuevoEstado });
    } catch (err) {
      toast.error("Error al actualizar estado de la orden");
      console.error(err);
    }
  };

  const marcarComoServida = async (ordenId) => {
    try {
      await updateDoc(doc(db, "ventas", ordenId), { estado: "servida" });
      toast.success("Orden marcada como servida");
      console.log(`Orden ${ordenId} marcada como servida`);
    } catch (err) {
      toast.error("Error al marcar como servida");
      console.error("Error al marcar como servida:", err);
    }
  };

  return (
    <section className="max-w-full mx-auto p-4">
      <h2 className="text-3xl font-extrabold text-orange-600 mb-6 text-center tracking-tight">
        Órdenes en cocina
      </h2>
      {ordenes.length === 0 ? (
        <div className="text-center text-gray-500 text-lg mt-12">
          No hay órdenes pendientes.
        </div>
      ) : (
        <div
          className="flex flex-wrap gap-4 justify-start items-start"
          style={{ alignItems: "flex-start" }}
        >
          {ordenes.map((orden) => (
            <div
              key={orden.id}
              className={`ticket-card bg-white rounded-xl shadow-lg border-2 flex flex-col min-w-[180px] max-w-[340px] relative animate-fadeIn
                ${orden.estado === "cocinando" ? "border-orange-500 border-solid" : "border-dashed border-orange-400"}
                cursor-pointer
              `}
              style={{
                padding: "0",
                position: "relative",
                fontFamily: "monospace",
              }}
              onClick={() => toggleCocinando(orden)}
            >
              {/* Ticket Header */}
              <div
                className={`${bgHeaderPorTiempo(orden.fecha)} rounded-t-xl px-4 py-2 flex items-center justify-between`}
              >
                <span className="font-bold text-lg tracking-tight uppercase truncate max-w-[70%]">
                  {orden.nombre || "Sin nombre"}
                </span>
                {/* <span
                  className={`absolute top-[10px] right-24 text-xs font-bold px-2 py-1 rounded-full
                  ${
                    orden.estado === "pendiente"
                      ? "bg-orange-200 text-orange-700"
                      : "bg-blue-200 text-blue-700"
                  }
                `}
                >
                  {orden.estado === "pendiente" ? "Pendiente" : "En cocina"}
                </span> */}
                <span
                  className={`flex items-center gap-1 text-sm ${colorCronometro(orden.fecha)}`}
                >
                  <FaClock className="inline-block" />
                  {formateaCronometro(orden.fecha)}
                </span>
              </div>
              {/* Ticket Body */}
              <div
                className={`flex-1 flex flex-col justify-between px-2 py-1 transition-all duration-200
                  ${orden.estado === "cocinando" ? "bg-orange-100" : ""}
                `}
              >
                {orden.estado === "cocinando" && (
                  <div className="mb-2 flex items-center justify-center gap-2 text-orange-700 font-bold text-base tracking-tight uppercase">
                    <TbChefHat className="text-orange-700" size={24} />
                    Cocinando...
                  </div>
                )}
                <div>
                  <ul className="flex flex-col gap-1">
                    {(orden.productos || []).map((p, idx) => (
                      <li
                        key={idx}
                        className={`flex items-center gap-2 text-base font-medium
                        ${p.servido ? "opacity-50 line-through" : ""}
                        ${p.nuevo && !p.servido ? "bg-green-100" : ""}
                      `}
                      >
                        <span className="bg-orange-200 text-orange-700 rounded-full px-2 py-0.5 font-bold text-base text-center">
                          {p.cantidad}
                        </span>
                        <span className="flex flex-col uppercase items-start font-semibold tracking-tight text-orange-500">
                          {p.nombre}
                          <span className="text-sm text-gray-600 font-normal">
                            {p.categoria ? `${p.categoria}` : ""}
                            {p.subcategoria ? ` - ${p.subcategoria}` : ""}
                          </span>
                          {p.nuevo && !p.servido && (
                            <span className="text-xs text-green-700 font-bold">
                              +{p.cantidadNueva || p.cantidad} nuevo
                            </span>
                          )}
                          {p.servido && (
                            <span className="text-xs text-gray-500 font-bold">
                              Servido
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {orden.notas && (
                  <div className="mt-3 flex items-center gap-2 bg-yellow-100 rounded px-3 py-2">
                    <CiStickyNote className="text-yellow-600" />
                    <span className="font-semibold text-yellow-700">
                      Notas:
                    </span>
                    <span className="text-yellow-800">{orden.notas}</span>
                  </div>
                )}
              </div>
              {/* Ticket Footer */}
              <div
                className={`px-2 pb-2 flex flex-col gap-2 ${orden.estado === "cocinando" ? "bg-orange-100 rounded-xl transition-all duration-200" : "border-dashed border-orange-400"}`}
              >
                <button
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-full text-lg shadow-lg transition w-full justify-center"
                  onClick={(e) => {
                    e.stopPropagation(); // <-- Esto evita que el click llegue al body
                    marcarComoServida(orden.id);
                  }}
                >
                  <FaCheckCircle size={22} />
                  Servida
                </button>
              </div>
              {/* Ticket Perforation */}
              <div className="absolute left-0 top-10 h-4 w-4 bg-white rounded-full border-2 border-orange-400 -translate-x-1/2"></div>
              <div className="absolute right-0 top-10 h-4 w-4 bg-white rounded-full border-2 border-orange-400 translate-x-1/2"></div>
              <div className="absolute left-0 bottom-10 h-4 w-4 bg-white rounded-full border-2 border-orange-400 -translate-x-1/2"></div>
              <div className="absolute right-0 bottom-10 h-4 w-4 bg-white rounded-full border-2 border-orange-400 translate-x-1/2"></div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px);}
          to { opacity: 1; transform: translateY(0);}
        }
        .ticket-card {
          box-shadow: 0 8px 32px #0001, 0 1.5px 0 #ffb84d inset;
        }
      `}</style>
    </section>
  );
}
