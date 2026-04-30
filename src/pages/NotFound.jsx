import { Link } from "react-router-dom";
import icon from "../assets/Logo/Icon Sonori fondo negro.png";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <img src={icon} alt="Sonori" className="h-32 mb-8" />
      <h1 className="text-5xl font-bold text-orange-600 mb-4">404</h1>
      <p className="text-2xl mb-8 text-gray-700">Página no encontrada</p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 transition text-xl"
        >
          Ir al inicio
        </Link>
        <Link
          to="/menu"
          className="bg-gray-200 text-orange-600 px-6 py-2 rounded hover:bg-orange-100 transition text-xl"
        >
          Ver menú
        </Link>
      </div>
    </div>
  );
}