import { Link } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaInstagram,
  FaFacebook,
  FaPhoneAlt,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import "./nav-scrollbar.css";
import { BiFoodMenu } from "react-icons/bi";

export default function NavBar({
  categorias,
  categoriaActual,
  setCategoriaActual,
  menuAbierto,
  setMenuAbierto,
  subcategoriasDb = [],
  handleSeleccionarCategoria,
}) {
  const { user } = useAuth();

  // Agrupa subcategorías por categoría
  const subcatsPorCat = {};
  subcategoriasDb.forEach((sub) => {
    if (!subcatsPorCat[sub.categoria]) subcatsPorCat[sub.categoria] = [];
    if (sub.nombre !== "Sin subcategoría")
      subcatsPorCat[sub.categoria].push(sub.nombre);
  });

  // Sidebar lateral móvil
  const handleCerrarMenu = () => {
    setMenuAbierto(false);
  };

  return (
    <nav className="bg-[var(--color-navBar)] font-sonori uppercase shadow-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto pr-4 py-2 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-bold text-[var(--color-secundario)]"
          onClick={handleCerrarMenu}
        >
          <Logo />
        </Link>
        {/* Navegación grande */}
        <div className="flex gap-4 overflow-x-auto uppercase items-center justify-start">
          <div className="hidden md:block">
            {user ? (
              <Link
                to="/tarjeta"
                onClick={() => window.scrollTo(0, 0)}
                className="bg-orange-600 text-white text-center px-3 py-1 rounded hover:bg-orange-800 transition text-2xl tracking-wide"
              >
                Tarjeta VIP
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => window.scrollTo(0, 0)}
                className="bg-orange-600 text-white text-center px-3 py-1 rounded hover:bg-orange-800 transition text-2xl tracking-wide"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
          {/* Icono hamburguesa */}
          <div>
            <button
              id="btn-hamburguesa"
              onClick={() => setMenuAbierto(true)}
              className="flex items-center gap-1 bg-orange-500 px-3 py-2 rounded-full text-[var(--color-secundario)] text-2xl mt-1"
            >
              MENÚ <BiFoodMenu />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar lateral móvil */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          menuAbierto ? "visible" : "invisible pointer-events-none"
        }`}
      >
        {/* Fondo oscuro */}
        <div
          className={`absolute inset-0 bg-black bg-opacity-60 transition-opacity duration-300 ${
            menuAbierto ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleCerrarMenu}
        />
        {/* Sidebar */}
        <aside
          id="sidebar-menu"
          className={`fixed top-0 left-0 h-full w-80 max-w-[95vw] bg-black shadow-lg flex flex-col transition-transform duration-300 ${
            menuAbierto ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <Link
              to="/"
              className="text-2xl font-bold text-[var(--color-secundario)]"
              onClick={handleCerrarMenu}
            >
              <Logo />
            </Link>
            <button
              onClick={handleCerrarMenu}
              className="text-[var(--color-principal)] text-2xl"
            >
              <FaTimes />
            </button>
          </div>
          <nav className="flex-1 font-sonori overflow-y-auto px-4 py-4 custom-scrollbar">
            <Link
              to="/"
              className="block text-orange-500 uppercase tracking-wide text-4xl mb-2"
              onClick={() => {
                setMenuAbierto(false);
                window.scrollTo(0, 0);
              }}
            >
              Inicio
            </Link>
            {categorias.map((cat) => {
              return (
                <div key={cat} className="mb-1">
                  <button
                    onClick={() => {
                      setMenuAbierto(false);
                      setCategoriaActual(cat);
                      if (typeof handleSeleccionarCategoria === "function") {
                        handleSeleccionarCategoria(cat);
                      }
                    }}
                    className={`w-full text-left uppercase text-4xl px-2 py-1 border-b-2 border-dotted border-[var(--color-principal)] transition-all
                      ${
                        categoriaActual === cat
                          ? "bg-[var(--color-principal)] text-black rounded"
                          : "text-[var(--color-principal)] hover:bg-[var(--color-principal)] hover:text-black"
                      }
                      flex items-center justify-between`}
                  >
                    {cat}
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="block text-orange-500 uppercase text-4xl mb-2 mt-4"
              onClick={() => {
                setMenuAbierto(false);
                setTimeout(() => {
                  const el = document.getElementById("ubicacion-contacto");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }, 200); // Espera a que cierre el menú
              }}
            >
              Ubicación y Contacto
            </button>
          </nav>
          {/* Redes sociales al fondo */}
          <div className="px-2 py-4 border-t border-gray-700 flex justify-evenly items-center">
            <div>
              {user ? (
                <Link
                  to="/tarjeta"
                  onClick={() => window.scrollTo(0, 0)}
                  className="bg-orange-600 text-white text-center px-2 py-1 rounded hover:bg-orange-700 transition text-3xl tracking-wide"
                >
                  Tarjeta VIP
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => window.scrollTo(0, 0)}
                  className="bg-orange-600 text-white text-center px-2 py-1 rounded hover:bg-orange-700 transition text-3xl tracking-wide"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
            <div className="flex items-center justify-evenly gap-4">
              <a
                href="https://instagram.com/sonorirestaurant"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-principal)] text-2xl hover:text-[var(--color-secundario)]"
              >
                <FaInstagram />
              </a>
              <a
                href="https://facebook.com/sonorirestaurant"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-principal)] text-2xl hover:text-[var(--color-secundario)]"
              >
                <FaFacebook />
              </a>
              <a
                href="tel:+526536908010"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-principal)] text-2xl hover:text-[var(--color-secundario)]"
              >
                <FaPhoneAlt />
              </a>
            </div>
          </div>
        </aside>
      </div>
    </nav>
  );
}
