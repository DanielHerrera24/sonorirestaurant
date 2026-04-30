import { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export default function EnlazarTarjetaFisica({ user, clienteUid, onEnlazado }) {
  const [numeroTarjeta, setNumeroTarjeta] = useState("");
  const [enlazando, setEnlazando] = useState(false);

  const handleEnlazar = async (e) => {
    e.preventDefault();
    if (!numeroTarjeta || numeroTarjeta.length !== 8) {
      toast.error("Ingresa un número de tarjeta válido de 8 dígitos");
      return;
    }
    setEnlazando(true);
    try {
      const ref = doc(db, "tarjetasFisicas", numeroTarjeta);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        toast.error("La tarjeta no existe");
        setEnlazando(false);
        return;
      }
      const data = snap.data();
      if (!data.disponible) {
        toast.error("La tarjeta ya está en uso");
        setEnlazando(false);
        return;
      }
      if (data.enlazadaA) {
        toast.error("La tarjeta ya está enlazada a otra cuenta");
        setEnlazando(false);
        return;
      }

      // 1. Enlazar tarjeta
      await updateDoc(ref, {
        enlazadaA: clienteUid,
        disponible: false,
      });

      // 2. Transferir puntos de la tarjeta física al usuario
      const puntosTarjeta = data.puntos || 0;
      if (puntosTarjeta > 0) {
        const refCliente = doc(db, "clientes", clienteUid);
        const snapCliente = await getDoc(refCliente);
        const puntosUsuario = snapCliente.exists() ? (snapCliente.data().puntos || 0) : 0;
        await updateDoc(refCliente, {
          puntos: puntosUsuario + puntosTarjeta,
          puntosAcumulados: (snapCliente.data().puntosAcumulados || 0) + puntosTarjeta,
        });
        // Dejar los puntos de la tarjeta física en 0
        await updateDoc(ref, { puntos: 0 });
      }

      toast.success("¡Tarjeta enlazada exitosamente!");
      if (onEnlazado) onEnlazado(numeroTarjeta);
      setNumeroTarjeta("");
    } catch (err) {
      toast.error("Error al enlazar la tarjeta");
      console.error(err);
    }
    setEnlazando(false);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 mt-4 w-full max-w-md mx-auto">
      <h3 className="text-2xl font-bold text-orange-500 mb-2 text-center">Enlazar tarjeta física</h3>
      <form onSubmit={handleEnlazar} className="flex flex-col gap-2 items-center">
        <input
          type="text"
          value={numeroTarjeta}
          onChange={e => setNumeroTarjeta(e.target.value.replace(/\D/g, "").slice(0,8))}
          placeholder="Número de tarjeta (8 dígitos)"
          className="border border-orange-500 rounded px-3 py-2 text-black text-xl text-center w-full max-w-xs"
          disabled={enlazando}
        />
        <button
          type="submit"
          className="bg-orange-600 text-white px-6 py-2 rounded font-bold text-lg mt-2 hover:bg-orange-700 transition"
          disabled={enlazando}
        >
          {enlazando ? "Enlazando..." : "Enlazar tarjeta"}
        </button>
      </form>
      <p className="text-gray-300 text-sm mt-2 text-center">
        Ingresa el número de tu tarjeta física o escanéalo con tu cámara y pégalo aquí.
      </p>
    </div>
  );
}
