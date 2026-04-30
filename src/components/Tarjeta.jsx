import { useEffect, useRef, useState } from "react";
import "./TarjetaAnimacion.css";

const Tarjeta = ({ puntos, onAnimacionEspecial, onAnimacionSumaPunto }) => {
  const [visualPuntos, setVisualPuntos] = useState(puntos);

  useEffect(() => {
    setVisualPuntos(puntos);
    // Aquí puedes disparar animaciones si lo deseas
    if (onAnimacionSumaPunto) {
      onAnimacionSumaPunto(puntos > 0);
    }
  }, [puntos, onAnimacionSumaPunto]);

  return (
    <div className="text-center flex flex-col gap-2 relative min-h-[70px]">
      <h2 className="text-4xl font-sonori uppercase text-black">Tus Sonori-puntos</h2>
      <div className="text-5xl flex items-center justify-center gap-2 relative min-h-[48px] bg-[var(--color-fondo)] p-2 rounded-lg shadow-lg">
        <span className="font-bold tracking-wide text-[var(--color-principal)]">
          {visualPuntos?.toFixed(2) ?? "0.00"}
        </span>
        <span className="text-xl text-gray-200">PTS</span>
      </div>
    </div>
  );
};

export default Tarjeta;
