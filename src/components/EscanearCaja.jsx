import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const EscanerCaja = () => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      qrbox: 250,
      fps: 10,
    });

    scanner.render(onScanSuccess);

    async function onScanSuccess(decodedText) {
      const clienteId = decodedText.trim();
      const ref = doc(db, "clientes", clienteId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Cliente no encontrado.");
        return;
      }

      const data = snap.data();
      let estrellas = data.estrellas + 1;
      let recompensas = data.recompensasCanjeadas || 0;

      if (estrellas >= 5) {
        estrellas = 0;
        recompensas += 1;
        alert("🎁 Recompensa canjeada");
      } else {
        alert("✅ Visita registrada");
      }

      await updateDoc(ref, {
        estrellas,
        ultimaVisita: new Date().toISOString(),
        recompensasCanjeadas: recompensas,
      });

      scanner.clear();
      document.getElementById("reader").innerHTML = "";
    }

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  return (
    <div className="text-center mt-10">
      <h2 className="text-xl mb-4">Escanea el QR del cliente</h2>
      <div id="reader" style={{ width: "300px", margin: "0 auto" }}></div>
    </div>
  );
};

export default EscanerCaja;
