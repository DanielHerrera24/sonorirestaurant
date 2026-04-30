import { useEffect, useRef, useState } from "react";
import "./TarjetaAnimacion.css";

const nivelesRecompensa = [
  { puntos: 50, nombre: "Bronce", descripcion: "Descuento pequeño" },
  { puntos: 100, nombre: "Plata", descripcion: "Descuento medio" },
  { puntos: 250, nombre: "Oro", descripcion: "Producto gratis" },
  { puntos: 500, nombre: "Diamante", descripcion: "Combo especial" },
];

const BarraProgresoRecompensas = ({ puntosAcumulados }) => {
  const totalNiveles = nivelesRecompensa.length;
  const [nivelGrande, setNivelGrande] = useState(null);
  const [nivelCae, setNivelCae] = useState(null);
  const prevNivel = useRef(-1);

  // Detecta si se alcanzó un nuevo nivel
  let nivelActual = -1;
  for (let i = 0; i < totalNiveles; i++) {
    if (puntosAcumulados >= nivelesRecompensa[i].puntos) {
      nivelActual = i;
    }
  }

  useEffect(() => {
    if (nivelActual > prevNivel.current) {
      setNivelGrande(nivelActual);
      setNivelCae(null);

      // Animación de agrandar (3s)
      setTimeout(() => {
        setNivelGrande(null);
        setNivelCae(nivelActual);
        // Animación de caída (2s)
        setTimeout(() => setNivelCae(null), 2000);
      }, 3000);
    }
    prevNivel.current = nivelActual;
  }, [nivelActual, puntosAcumulados]);

  const siguienteNivel =
    nivelesRecompensa[nivelActual + 1] || nivelesRecompensa[totalNiveles - 1];
  const puntosParaSiguiente = Math.max(
    siguienteNivel.puntos - puntosAcumulados,
    0
  );

  let progresoVisual = 0;
  if (nivelActual === -1) {
    progresoVisual =
      (puntosAcumulados / nivelesRecompensa[0].puntos) * (100 / totalNiveles);
  } else if (nivelActual < totalNiveles - 1) {
    const prev = nivelesRecompensa[nivelActual];
    const next = nivelesRecompensa[nivelActual + 1];
    const base = ((nivelActual + 1) * 100) / totalNiveles;
    const segmento =
      ((puntosAcumulados - prev.puntos) / (next.puntos - prev.puntos)) *
      (100 / totalNiveles);
    progresoVisual = base + segmento;
  } else {
    progresoVisual = 100;
  }

  for (let i = 0; i < totalNiveles; i++) {
    if (puntosAcumulados === nivelesRecompensa[i].puntos) {
      progresoVisual = ((i + 1) * 100) / totalNiveles;
    }
  }

  return (
    <div className="w-full my-4">
      <div className="flex justify-between mb-1">
        {nivelesRecompensa.map((nivel) => (
          <div key={nivel.puntos} className="text-md text-center w-1/4">
            <span
              className={`font-bold ${
                puntosAcumulados >= nivel.puntos
                  ? "text-orange-600 bg-black px-2 py-1 rounded"
                  : "text-black"
              }`}
            >
              {nivel.nombre}
            </span>
            <br />
            <span className={`font-bold ${
                puntosAcumulados >= nivel.puntos
                  ? "text-orange-600"
                  : "text-black"
              }`}>
              {nivel.puntos} pts
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-4 bg-gray-300 rounded-full">
        {/* Barra de progreso */}
        <div
          className="absolute left-0 top-0 h-4 bg-orange-600 rounded-full transition-all"
          style={{ width: `${Math.min(progresoVisual, 100)}%` }}
        />
        {/* Marcas de niveles con animación */}
        {nivelesRecompensa.map((nivel, idx) => {
          const left = ((idx + 1) * 100) / totalNiveles;
          const alcanzado = puntosAcumulados >= nivel.puntos;
          const grande = nivelGrande === idx;
          const caer = nivelCae === idx;
          return (
            <div
              key={nivel.puntos}
              style={{
                position: "absolute",
                top: "50%",
                left: `calc(${left}% - 10px)`,
                transform: "translateY(-50%)",
                zIndex: 2,
              }}
            >
              <div
                className={`rounded-full border-2 flex items-center justify-center
                  ${
                    alcanzado
                      ? `w-6 h-6 bg-[var(--color-principal)] border-orange-600 text-black 
              ${grande ? "nivel-grande-anim" : ""} ${caer ? "cafes-pop-grande" : ""}`
                      : "bg-white border-gray-400 text-gray-400 w-3 h-3"
                  }`}
                title={nivel.nombre}
              >
                {alcanzado ? "✓" : ""}
                {grande && <span className="plus-one">¡Nivel!</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1 mt-2 text-sm text-center">
        {nivelActual >= 0 ? (
          <span>
            ¡Has alcanzado el nivel{" "}
            <b>{nivelesRecompensa[nivelActual].nombre}</b>!
          </span>
        ) : (
          <span>¡Acumula puntos para tu primera recompensa!</span>
        )}
        {nivelActual + 1 < nivelesRecompensa.length ? (
          <>
            <span>
              Te faltan <b className="tracking-wider  text-orange-600 text-lg">{puntosParaSiguiente.toFixed(2)}</b> puntos para el
              nivel <b className="tracking-wider  text-orange-600 text-lg">{siguienteNivel.nombre}</b>.
            </span>
            <span>
              Actualmente tienes <b className="tracking-wider  text-orange-600 text-lg">{puntosAcumulados.toFixed(2)}</b> puntos
              acumulados.
            </span>
          </>
        ) : (
          <>
            <span className="font-bold text-orange-600">
              ¡Felicidades! Has alcanzado el máximo nivel de recompensas. Eres
              cliente VIP 🎉
            </span>
            <span>
              Ahora puedes disfrutar de todos los beneficios exclusivos.
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default BarraProgresoRecompensas;
