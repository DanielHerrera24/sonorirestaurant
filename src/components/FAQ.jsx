import { useState } from "react";

const preguntas = [
  {
    pregunta: "💰 ¿Cómo acumulo puntos?",
    respuesta: "Por cada compra, acumulas los puntos correspondientes según el monto gastado.",
  },
  {
    pregunta: "🪙 ¿Para qué sirven los puntos?",
    respuesta: "Tus puntos funcionan como dinero electrónico y puedes usarlos para comprar beneficios en el restaurante.",
  },
  /* {
    pregunta: "🎁 ¿Qué recompensas puedo obtener?",
    respuesta: "Puedes obtener descuentos o productos gratis, según las promociones vigentes y tus puntos acumulados.",
  },
  {
    pregunta: "🌟 ¿Cuántos puntos necesito para una recompensa?",
    respuesta: "Al juntar cierta cantidad de puntos, puedes canjear recompensas. Consulta las promociones vigentes.",
  }, */
  {
    pregunta: "🔄 ¿Puedo acumular varias recompensas?",
    respuesta: "No, las recompensas 🎁 no son acumulables, puedes canjearlas según tus puntos disponibles.",
  },
  {
    pregunta: "📅 ¿Puedo registrar más de una visita al día?",
    respuesta: "Sí, puedes registrar tu visita por cada compra que realices.",
  },
  {
    pregunta: "❓ ¿Qué hago si tengo problemas con mi cuenta?",
    respuesta: "Contáctanos en el local 🏪 para ayudarte a resolver cualquier inconveniente.",
  },
];

export default function FAQ() {
  const [abierta, setAbierta] = useState(null);

  return (
    <div className="max-w-md sm:mx-auto my-8 bg-gray-800 rounded-2xl shadow-lg p-6 mx-2 border-2 border-[var(--color-principalClaro)] font-montserrat">
      <h2 className="text-4xl font-sonori uppercase text-[var(--color-principal)] mb-6 text-center ">
        Preguntas Frecuentes
      </h2>
      <ul className="space-y-2">
        {preguntas.map((item, idx) => (
          <li key={idx} className="border-b border-gray-400 border-dotted last:border-0">
            <button
              className={`w-full text-left text-[var(--color-blanco)] uppercase flex justify-between items-center py-3 px-2 rounded-xl hover:bg-[var(--color-fondo)] transition font-sonori tracking-wide text-xl`}
              onClick={() => setAbierta(abierta === idx ? null : idx)}
              aria-expanded={abierta === idx}
            >
              <span>{item.pregunta}</span>
              <span className="ml-2 text-[var(--color-principal)] text-xl font-bold">
                {abierta === idx ? "▲" : "▼"}
              </span>
            </button>
            {abierta === idx && (
              <div className="bg-[var(--color-fondo)] text-gray-100 rounded-xl px-4 py-3 mt-1 animate-fade-in font-montserrat text-base">
                {item.respuesta}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}