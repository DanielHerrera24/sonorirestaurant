import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function TipoCambio() {
  const [tipoCambio, setTipoCambio] = useState("");
  const [loading, setLoading] = useState(false);

  // Leer tipo de cambio actual de Firestore
  useEffect(() => {
    const fetchTipoCambio = async () => {
      const docRef = doc(db, "configuracion", "tipoCambio");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTipoCambio(docSnap.data().valor || "");
      }
    };
    fetchTipoCambio();
  }, []);

  // Guardar tipo de cambio en Firestore
  const guardarTipoCambio = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docRef = doc(db, "configuracion", "tipoCambio");
      await setDoc(docRef, { valor: Number(tipoCambio) });
      toast.success("Tipo de cambio guardado");
    } catch (err) {
      toast.error("Error al guardar el tipo de cambio");
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={guardarTipoCambio}
      className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto flex flex-col gap-4 mt-8"
    >
      <h2 className="text-2xl font-bold text-orange-500 mb-2">
        Configurar tipo de cambio dólar
      </h2>
      <label className="font-semibold text-gray-700">
        Tipo de cambio actual (1 MXN a USD):
        <input
          type="number"
          step="0.0001"
          min="0"
          value={tipoCambio}
          onChange={(e) => setTipoCambio(e.target.value)}
          className="border rounded px-3 py-2 ml-2 w-32"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="bg-orange-500 text-white font-bold px-4 py-2 rounded-full shadow hover:bg-orange-600 transition"
      >
        {loading ? "Guardando..." : "Guardar tipo de cambio"}
      </button>
    </form>
  );
}