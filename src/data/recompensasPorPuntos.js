export const RECOMPENSAS_POR_PUNTOS = [
  {
    id: "aderezo-gratis",
    puntos: 200,
    nombre: "Aderezo gratis",
    descripcion: "Canjea un aderezo sin costo.",
  },
  {
    id: "te-o-limonada",
    puntos: 600,
    nombre: "Té o limonada natural gratis",
    descripcion: "Incluye una bebida natural sin costo.",
  },
  {
    id: "entrada-gratis",
    puntos: 1200,
    nombre: "Entrada gratis",
    descripcion: "Canjeable por cualquier platillo de la categoría Entradas.",
  },
  {
    id: "teriyaki-o-rollo",
    puntos: 2000,
    nombre: "Teriyaki de pollo o rollo clásico gratis",
    descripcion: "Elige uno de esos dos platillos sin costo.",
  },
];

export function getMissingPoints(puntosActuales, recompensa) {
  return Math.max(recompensa.puntos - (Number(puntosActuales) || 0), 0);
}

export function getNextReward(puntosActuales) {
  return (
    RECOMPENSAS_POR_PUNTOS.find(
      (recompensa) => (Number(puntosActuales) || 0) < recompensa.puntos
    ) || null
  );
}

export function obtenerEstadoRecompensas(puntos = 0) {
  const puntosActuales = Number(puntos) || 0;
  const recompensas = RECOMPENSAS_POR_PUNTOS.map((recompensa) => ({
    ...recompensa,
    disponible: puntosActuales >= recompensa.puntos,
    faltan: getMissingPoints(puntosActuales, recompensa),
  }));

  const siguientes = recompensas.filter((recompensa) => !recompensa.disponible);

  return {
    puntosActuales,
    recompensas,
    disponibles: recompensas.filter((recompensa) => recompensa.disponible),
    proximas: siguientes,
    siguiente: siguientes[0] || null,
  };
}