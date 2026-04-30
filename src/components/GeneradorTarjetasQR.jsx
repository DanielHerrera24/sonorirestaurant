import { useState } from "react";
import { db } from "../firebase";
import { setDoc, doc, getDocs, collection } from "firebase/firestore";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import QRCodeReact from "react-qr-code";
import logoRoute66 from "../assets/Logo/Icon Sonori fondo negro.png";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function GeneradortarjetasFisicas() {
  const [cantidad, setCantidad] = useState(10);
  const [generando, setGenerando] = useState(false);
  const [tarjetas, setTarjetas] = useState([]);
  const [tarjetasExistentes, setTarjetasExistentes] = useState([]);
  const [rangoInicio, setRangoInicio] = useState("");
  const [rangoFin, setRangoFin] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [abierto, setAbierto] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  // Traer los códigos QR ya generados desde la colección tarjetasFisicas
  const cargarTarjetas = async () => {
    const snap = await getDocs(collection(db, "tarjetasFisicas"));
    const todas = snap.docs
      .map((doc) => ({ ...doc.data(), idTarjeta: doc.id }))
      .filter((doc) => typeof doc.disponible === "boolean");
    setTarjetasExistentes(
      todas.sort((a, b) => a.idTarjeta.localeCompare(b.idTarjeta))
    );
    setBusquedaRealizada(true);
  };

  // Filtrar por rango y estado
  const tarjetasFiltradas = tarjetasExistentes.filter((tarjeta) => {
    const id = tarjeta.idTarjeta;
    const num = parseInt(id, 10);
    const ini = rangoInicio ? parseInt(rangoInicio, 10) : num;
    const fin = rangoFin ? parseInt(rangoFin, 10) : num;
    const enRango = num >= ini && num <= fin;

    if (filtroEstado === "disponibles") return tarjeta.disponible && enRango;
    if (filtroEstado === "usadas") return !tarjeta.disponible && enRango;
    return enRango;
  });

  // Genera tarjetas QR en lote y las guarda en la colección tarjetasFisicas
  const generarTarjetas = async () => {
    setGenerando(true);

    // UIDs existentes en tarjetasFisicas (formato 8 dígitos)
    const snapTarjetas = await getDocs(collection(db, "tarjetasFisicas"));
    const idsTarjetas = snapTarjetas.docs.map((doc) => doc.id);
    const existentesTarjetas = new Set(idsTarjetas);

    const nuevasTarjetas = [];
    let intentos = 0;

    while (nuevasTarjetas.length < cantidad && intentos < cantidad * 20) {
      // Genera un número random de 8 dígitos
      const num = Math.floor(10000000 + Math.random() * 90000000).toString();
      if (!existentesTarjetas.has(num) && !nuevasTarjetas.includes(num)) {
        await setDoc(doc(db, "tarjetasFisicas", num), {
          uid: num,
          disponible: true,
          enlazadaA: null,
          nombre: "",
          telefono: "",
          puntos: 0,
          puntosAcumulados: 0,
          ultimaVisita: null,
          creado: new Date().toISOString(),
          // otros campos necesarios...
        });
        nuevasTarjetas.push(num);
      }
      intentos++;
    }

    setTarjetas(nuevasTarjetas);
    setGenerando(false);

    if (nuevasTarjetas.length < cantidad) {
      alert(
        `Solo se pudieron generar ${nuevasTarjetas.length} tarjetas únicas. Intenta nuevamente si necesitas más.`
      );
    }
  };

  // Descarga los QR en PDF (hoja tamaño carta)
  const descargarPDF = async () => {
    const doc = new jsPDF();
    const qrSize = 30;
    const logoSize = 30;
    const margin = 4;
    const porFila = 6;
    const porPagina = 42;

    let x = margin,
      y = margin,
      count = 0;

    for (let idx = 0; idx < tarjetasFiltradas.length; idx++) {
      const id = tarjetasFiltradas[idx].idTarjeta;
      const imgData = await QRCode.toDataURL(id, {
        width: qrSize * 2,
        margin: 1,
      });

      // Logo arriba del QR
      doc.addImage(
        logoRoute66,
        "PNG",
        x + (qrSize - logoSize) / 2,
        y,
        logoSize,
        logoSize
      );
      // QR debajo del logo
      doc.addImage(imgData, "PNG", x, y + logoSize + 2, qrSize, qrSize);

      // Texto debajo del QR
      doc.setFontSize(10);
      const espacioDebajoQR = 10;
      const yTexto = y + logoSize + qrSize + espacioDebajoQR / 2;
      doc.text(id, x + qrSize / 2, yTexto, { align: "center" });

      x += qrSize + margin;
      count++;

      if (count % porFila === 0) {
        x = margin;
        y += logoSize + qrSize + 8;
      }
      if (count % porPagina === 0 && idx !== tarjetasFiltradas.length - 1) {
        doc.addPage();
        x = margin;
        y = margin;
      }
    }
    doc.save("tarjetasFisicas.pdf");
  };

  return (
    <div className="max-w-lg mx-auto w-full bg-slate-800 rounded shadow">
      <div
        className="cursor-pointer bg-[var(--color-negro)] border border-white text-[var(--color-principal)] rounded px-4 py-3 text-xl flex items-center justify-between"
        onClick={() => setAbierto((v) => !v)}
      >
        Tarjetas Físicas QR
        <span className="ml-2">
          {abierto ? <FaChevronUp /> : <FaChevronDown />}
        </span>
      </div>
      {abierto && (
        <div className="mt-2 px-4">
          {/* Instrucciones generales */}
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-blue-900 text-sm">
            <p>
              <b>¿Para qué sirve esta sección?</b>
              <br />
              Aquí puedes <b>generar nuevas tarjetas QR</b> para tus clientes y{" "}
              <b>consultar el estado</b> de las tarjetas ya existentes.
            </p>
          </div>

          {/* Generar nuevas tarjetas */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-2 text-[var(--color-principal)]">
              Generar nuevas tarjetas QR
            </h3>
            <p className="mb-2 text-gray-200 text-sm">
              Ingresa la cantidad de tarjetas NUEVAS que deseas crear. Cada
              tarjeta tendrá un código único y estará disponible para asignar a
              un cliente.
            </p>
            <div className="flex gap-2 items-center mb-2">
              <label className="">Cantidad:</label>
              <input
                type="number"
                min={1}
                max={200}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="border px-2 py-1 rounded w-20 text-black"
              />
              <button
                onClick={generarTarjetas}
                className="bg-[var(--color-principal)] text-black px-4 py-2 rounded"
                disabled={generando}
              >
                Generar tarjetas
              </button>
            </div>
            {tarjetas.length > 0 && (
              <div className="mb-4">
                <p className="text-green-500 tracking-wider mb-2">
                  ¡Listo! Se generaron las siguientes tarjetas QR. Descárgalas abajo 
                  para imprimirlas:
                </p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-2 bg-white p-2">
                  {tarjetas.map((id) => (
                    <div key={id} className="flex flex-col items-center">
                      <QRCodeReact value={id} size={80} />
                      <span className="text-sm mt-1 font-montserrat  text-black">{id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Consultar tarjetas existentes */}
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-2 text-[var(--color-principal)]">
              Consultar tarjetas QR existentes
            </h3>
            <p className="text-gray-200 text-sm">
              Busca tarjetas ya generadas por rango de número y estado. Puedes
              descargar el listado filtrado en PDF.
            </p>
            <button
              className="bg-green-600 text-white px-4 py-2 my-4 rounded"
              onClick={() => {
                cargarTarjetas();
              }}
            >
              Buscar tarjetas
            </button>
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                type="number"
                placeholder="Inicio (ej: 1)"
                value={rangoInicio}
                onChange={(e) => setRangoInicio(e.target.value)}
                className="border px-2 py-1 rounded w-24 text-black"
              />
              <input
                type="number"
                placeholder="Fin (ej: 100)"
                value={rangoFin}
                onChange={(e) => setRangoFin(e.target.value)}
                className="border px-2 py-1 rounded w-24 text-black"
              />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border px-2 py-1 rounded text-black"
              >
                <option value="todos">Todos</option>
                <option value="disponibles">Solo disponibles</option>
                <option value="usadas">Solo en uso</option>
              </select>
              {busquedaRealizada && (
                <button
                  onClick={descargarPDF}
                  className="bg-[var(--color-principal)] text-black px-4 py-2 mt-2 rounded"
                >
                  Descargar PDF (
                  {filtroEstado === "todos"
                    ? "Todos"
                    : filtroEstado === "disponibles"
                    ? "Solo disponibles"
                    : "Solo en uso"}
                  )
                </button>
              )}
              {busquedaRealizada && (
                <div className="mt-2 mb-2 tracking-wide text-lg text-[var(--color-principal)]">
                  {`Total: ${tarjetasFiltradas.length} código${
                    tarjetasFiltradas.length === 1 ? "" : "s"
                  } QR encontrado${tarjetasFiltradas.length === 1 ? "" : "s"}`}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-4 max-h-[50vh] text-black bg-white p-2 overflow-y-auto overflow-x-hidden">
              {tarjetasFiltradas.map((tarjeta) => (
                <div
                  key={tarjeta.idTarjeta}
                  className="flex flex-col items-center"
                >
                  <QRCodeReact value={tarjeta.idTarjeta} size={80} />
                  <span className="text-sm mt-1 font-montserrat font-bold">
                    {tarjeta.idTarjeta}
                  </span>
                  <span
                    className={`text-sm mt-1 ${
                      tarjeta.disponible ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tarjeta.disponible ? "Disponible" : "En uso"}
                  </span>
                </div>
              ))}
              {tarjetasFiltradas.length === 0 && (
                <div className="col-span-5 text-gray-500 text-center">
                  No hay tarjetas en ese rango o con ese estado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
