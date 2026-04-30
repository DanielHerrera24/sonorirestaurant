// Selecciona el plan principal de cada tipo
const planesPrincipales = [
  {
    nombre: "Menú Digital",
    precio: "$2,500 MXN",
    descripcion: "Muestra tu menú en línea de forma profesional.",
    incluye: [
      "Menú digital (hasta 20 platillos)",
      "Personalización del menú",
      "Panel de administración",
      "Capacitación para el personal",
      "Soporte por WhatsApp básico",
    ],
    recomendado: false,
  },
  {
    nombre: "Sistema de Lealtad",
    precio: "$2,500 MXN",
    descripcion: "Premia y fideliza a tus clientes con recompensas.",
    incluye: [
      "Registro de visitas y recompensas",
      "Panel de control para ver estrellas",
      "Personalización de sistema de lealtad",
      "Capacitación para el personal",
      "Soporte por WhatsApp básico",
    ],
    recomendado: false,
  },
  {
    nombre: "Paquete Completo",
    precio: "$4,000 MXN",
    precioAnterior: "$5,000 MXN",
    descripcion:
      "Todo lo que necesitas: menú digital y lealtad en un solo paquete.",
    incluye: [
      "Menú digital (hasta 20 platillos)",
      "Sistema de lealtad",
      "Panel de administración y control",
      "Capacitación y soporte",
    ],
    recomendado: true,
  },
];

// Agrega este array después de planesPrincipales
const planesMantenimiento = [
  {
    nombre: "Mantenimiento Básico",
    precio: {
      individual: "$300 MXN/mes",
      completo: "$500 MXN/mes",
    },
    incluye: [
      "Acceso a panel de administración",
      "Actualización y mantenimiento de menú y/o sistema de lealtad",
      "Soporte técnico básico (WhatsApp)",
      "Corrección de errores menores",
    ],
  },
  {
    nombre: "Mantenimiento Intermedio",
    precio: {
      individual: "$400 MXN/mes",
      completo: "$600 MXN/mes",
    },
    incluye: [
      "Acceso a panel de administración",
      "Actualización y mantenimiento de menú y/o sistema de lealtad + recompensas",
      "Soporte técnico estándar (WhatsApp y llamada)",
      "Corrección de errores y mejoras menores",
      "Respaldo mensual de datos",
    ],
  },
  {
    nombre: "Mantenimiento Premium",
    precio: {
      individual: "$600 MXN/mes",
      completo: "$800 MXN/mes",
    },
    incluye: [
      "Acceso a panel de administración",
      "Actualización y mantenimiento de menú y/o sistema de lealtad + recompensas y configuración",
      "Soporte prioritario (WhatsApp y llamada)",
      "Corrección de errores, mejoras y nuevas funciones menores",
      "Respaldo semanal de datos",
    ],
    recomendado: true,
  },
];

export default function PlanesPrecios() {
  return (
    <div className="max-w-6xl flex flex-col sm:items-center mx-auto bg-[var(--color-fondo)] px-2 sm:px-4 py-12 pt-28">
      {/* Explicación breve */}
      <div className="mb-10 bg-white max-w-md rounded-xl shadow p-4 sm:p-6">
        <h1 className="text-4xl font-bold text-center text-[var(--color-principal)] mb-4">
          ¿Quieres algo así para tu negocio?
        </h1>
        <h2 className="text-3xl font-bold text-center text-[var(--color-secundario)] mb-8">
          Elige tu plan ideal en 3 pasos
        </h2>
        <ol className="space-y-4 mb-6 sm:flex flex-col sm:items-center">
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-principal)] text-white flex items-center justify-center font-bold mr-3">
              1
            </span>
            <span className="text-base text-gray-700">
              Selecciona el plan de desarrollo e implementación que mejor se adapte a tu negocio.
              <br />
              <b>Menú Digital</b> si solo quieres mostrar tu menú.
              <br />
              <b>Sistema de Lealtad</b> si quieres fidelizar clientes.
              <br />
              <b>Paquete Completo</b> si deseas ambas cosas.
            </span>
          </li>
          <li className="flex items-start max-w-md">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-principal)] text-white flex items-center justify-center font-bold mr-3">
              2
            </span>
            <span className="text-base text-gray-700">
              Elige el plan de <b>mantenimiento mensual</b> que prefieras, sin
              importar si contrataste Menú Digital, Sistema de Lealtad o el
              Paquete Completo. Así puedes recibir el nivel de{" "}
              <b>soporte y actualizaciones</b> que mejor <b>se adapte a tu negocio</b>,
              en cualquier momento.
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-principal)] text-white flex items-center justify-center font-bold mr-3">
              3
            </span>
            <span className="text-base text-gray-700">
              ¿Listo para cotizar o tiene dudas?{" "}
              <a
                href="https://wa.me/526531641389?text=Hola,%20me%20interesa%20el%20plan%20de..."
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-secundario)]  underline"
              >
                ¡Contáctanos por WhatsApp!
              </a>
            </span>
          </li>
        </ol>
        <div className="flex justify-center">
          <a
            href="https://wa.me/526531641389?text=Hola,%20me%20interesa%20el%20plan%20de..."
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[var(--color-principal)] text-white px-6 py-3 rounded-full font-bold shadow hover:bg-[var(--color-principalHover)] transition animate-bounce"
          >
            ¡Contáctanos!
          </a>
        </div>
      </div>

      {/* Tabla comparativa */}
      {/* Tabla de planes de desarrollo e implementación */}
      <h2 className="text-2xl font-bold text-center text-[var(--color-principal)] mb-4 mt-12">
        Planes de Desarrollo e Implementación{" "}
        <span className="text-lg text-gray-500">(pago único)</span>
      </h2>
      <div className="overflow-x-auto relative">
        {/* Indicador de scroll para móviles */}
        <div className="block sm:hidden absolute top-2 right-4 z-10 pointer-events-none">
          <div className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-full shadow text-xs text-orange-500 animate-bounce">
            <span>Desliza</span>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path
                d="M8 5l8 7-8 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <table className="min-w-full bg-white rounded-xl shadow mb-10 border border-gray-200">
          <thead>
            <tr>
              <th className="py-4 px-2 border-b border-gray-400"></th>
              {planesPrincipales.map((plan) => (
                <th
                  key={plan.nombre}
                  className="py-4 px-2 min-w-40 text-xl font-bold text-[var(--color-secundario)] text-center border-b border-gray-400"
                >
                  {plan.nombre}
                  {plan.recomendado && (
                    <div className="mt-1 text-xs bg-[var(--color-principal)] text-white rounded-full px-2 py-1 inline-block">
                      Recomendado
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className=" py-2 px-2 text-right border-b border-r border-gray-400">
                Precio
              </td>
              {planesPrincipales.map((plan) => (
                <td
                  key={plan.nombre}
                  className="py-2 px-2 text-center font-bold border-b border-gray-400"
                >
                  {plan.precio}
                </td>
              ))}
            </tr>
            <tr>
              <td className=" py-2 px-2 text-right border-b border-r border-gray-400">
                Descripción
              </td>
              {planesPrincipales.map((plan) => (
                <td
                  key={plan.nombre}
                  className="py-2 px-2 text-center border-b border-gray-400"
                >
                  {plan.descripcion}
                </td>
              ))}
            </tr>
            <tr>
              <td className=" py-2 px-2 text-right align-center border-b border-r border-gray-400">
                Incluye
              </td>
              {planesPrincipales.map((plan) => (
                <td
                  key={plan.nombre}
                  className="py-2 px-2 border-b border-gray-400"
                >
                  <ul className="list-disc list-inside text-left">
                    {plan.incluye.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabla de planes de mantenimiento mensual */}
      <h2 className="text-2xl font-bold text-center text-[var(--color-principal)] mb-2 mt-12">
        Planes de Mantenimiento Mensual
      </h2>
      <div className="overflow-x-auto relative">
        <div className="block sm:hidden absolute top-2 right-4 z-10 pointer-events-none animate-bounce">
          <div className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-full shadow text-xs text-orange-500">
            <span>Desliza</span>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path
                d="M8 5l8 7-8 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <table className="min-w-full bg-white rounded-xl shadow mb-10 border border-gray-200">
          <thead>
            <tr>
              <th className="py-4 px-2 border-b border-gray-400"></th>
              {planesMantenimiento.map((plan) => (
                <th
                  key={plan.nombre}
                  className="py-4 px-2 text-xl font-bold text-[var(--color-secundario)] text-center border-b border-gray-400"
                >
                  {plan.nombre}
                  {plan.recomendado && (
                    <div className="mt-1 text-xs bg-[var(--color-principal)] text-white rounded-full px-2 py-1 inline-block">
                      Recomendado
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className=" py-2 px-2 min-w-32 sm:w-32 text-right border-b border-r border-gray-400">
                Precio
                <div className="text-xs font-normal text-gray-500 mt-1">
                  <div className="text-orange-500">
                    Menú Digital o Sistema de Lealtad
                  </div>
                  <div className="text-blue-500">Paquete Completo</div>
                </div>
              </td>
              {planesMantenimiento.map((plan) => (
                <td
                  key={plan.nombre}
                  className="py-2 px-2 text-center font-bold border-b border-gray-400"
                >
                  <div>
                    {plan.precio.individual}{" "}
                    <span className="block text-xs text-orange-500">
                      Menú o Lealtad
                    </span>
                  </div>
                  <div>
                    {plan.precio.completo}{" "}
                    <span className="block text-xs text-blue-500">
                      Completo
                    </span>
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td className=" py-2 px-2 text-right align-center border-b border-r border-gray-400">
                Incluye
              </td>
              {planesMantenimiento.map((plan) => (
                <td
                  key={plan.nombre}
                  className="py-2 px-2 border-b border-gray-400"
                >
                  <ul className="list-disc list-inside text-left">
                    {plan.incluye.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Botón de contacto */}
      <div className="flex flex-col items-center justify-center">
        <p className="text-lg text-gray-700 mb-4 text-center">
          Si ya sabes qué plan elegir, tienes dudas o necesitas más información,
          no dudes en{" "}
          <span className="text-[var(--color-secundario)] ">
            ¡contactarnos por WhatsApp!
          </span>
        </p>
        <a
          href="https://wa.me/526531641389?text=Hola,%20me%20interesa%20el%20plan%20de..."
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[var(--color-principal)] text-white px-6 py-3 rounded-full font-bold shadow hover:bg-[var(--color-principalHover)] transition animate-bounce"
        >
          ¡Contáctanos!
        </a>
      </div>
    </div>
  );
}
