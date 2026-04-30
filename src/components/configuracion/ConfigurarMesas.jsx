import { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import toast from "react-hot-toast";

export default function ConfigurarMesas() {
  const [mesas, setMesas] = useState([]);
  const [nuevaMesa, setNuevaMesa] = useState("");

  useEffect(() => {
    const cargarMesas = async () => {
      const q = query(collection(db, "mesas"), orderBy("numero", "asc"));
      const snap = await getDocs(q);
      setMesas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    cargarMesas();
  }, []);

  const agregarMesa = async () => {
    const idMesa = nuevaMesa.trim();
    if (!idMesa) return;
    try {
      await setDoc(doc(db, "mesas", idMesa), { numero: idMesa });
      setNuevaMesa("");
      toast.success("Mesa agregada");
      // Recarga mesas
      const q = query(collection(db, "mesas"), orderBy("numero", "asc"));
      const snap = await getDocs(q);
      setMesas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error("Error al agregar mesa");
    }
  };

  const eliminarMesa = async (id) => {
    try {
      await deleteDoc(doc(db, "mesas", id));
      setMesas((prev) => prev.filter((m) => m.id !== id));
      toast.success("Mesa eliminada");
    } catch {
      toast.error("Error al eliminar mesa");
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-orange-600">Configurar mesas</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          value={nuevaMesa}
          onChange={(e) => setNuevaMesa(e.target.value)}
          placeholder="Número o nombre de mesa"
          className="border rounded px-2 py-1 flex-1"
        />
        <button
          onClick={agregarMesa}
          className="bg-orange-500 text-white px-4 py-1 rounded font-bold"
        >
          Agregar
        </button>
      </div>
      <ul className="divide-y">
        {mesas.map((mesa) => (
          <li key={mesa.id} className="flex justify-between items-center py-2">
            <span className="font-semibold">{mesa.numero}</span>
            <button
              onClick={() => eliminarMesa(mesa.id)}
              className="text-red-500 hover:underline"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}