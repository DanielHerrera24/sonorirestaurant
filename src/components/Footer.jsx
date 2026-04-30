import { FaFacebook, FaInstagram, FaPhoneAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-[var(--color-navBar)] font-montserrat  border-t-2 border-[var(--color-principal)] text-white py-8 pt-8">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 text-center md:text-left">
          <div className="flex justify-center pb-4">
            <Logo />
          </div>
          <p className="text-sm">
            Av. Tamaulipas y Calle 9, 83440 San Luis Río Colorado, Son.
          </p>
          <p className="text-sm mt-1">
            Tel:{" "}
            <a className="underline" href="tel:6536908010">
              (653) 690-8010
            </a>
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex gap-4 mb-2">
            <a
              href="https://www.facebook.com/sonori.restaurant/?locale=es_LA"
              target="_blank"
              rel="noopener noreferrer"
              title="Facebook"
            >
              <FaFacebook className="text-white hover:text-[var(--color-principalClaro)] text-2xl" />
            </a>
            <a
              href="https://www.instagram.com/sonori.restaurant/?hl=es"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram"
            >
              <FaInstagram className="text-white hover:text-[var(--color-principalClaro)] text-2xl" />
            </a>
            <a
              href="https://wa.me/526536908010"
              target="_blank"
              rel="noopener noreferrer"
              title="Teléfono"
            >
              <FaPhoneAlt className="text-white hover:text-[var(--color-principalClaro)] text-2xl" />
            </a>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link
              to="/"
              onClick={() => window.scrollTo(0, 0)}
              className="hover:underline"
            >
              Inicio
            </Link>
            <Link
              to="/menu"
              onClick={() => window.scrollTo(0, 0)}
              className="hover:underline"
            >
              Menú
            </Link>
            {user ? (
              <Link
                to="/tarjeta"
                onClick={() => window.scrollTo(0, 0)}
                className="hover:underline"
              >
                Tarjeta VIP
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => window.scrollTo(0, 0)}
                className="hover:underline"
              >
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
        <div className="flex-1 text-center md:text-right text-xs mt-2 md:mt-0">
          {/* <Link
            to="/"
            onClick={() => window.scrollTo(0, 0)}
            className="hover:underline text-[var(--color-principalClaro)]"
          >
            Aviso de privacidad
          </Link> */}
          <p className="mt-2">
            &copy; {new Date().getFullYear()} Sonori Restaurant. Todos los
            derechos reservados.
          </p>
          <p className="mt-2">
            Powered by{" "}
            <a
              target="_blank"
              href="https://www.daniherreraweb.com"
              className="text-blue-300 underline"
            >
              Daniherreraweb
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
