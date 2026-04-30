import PlanesPrecios from "../components/PlanesPrecios";
import logo from "../assets/Logo/logo.svg";
import { Link } from "react-router-dom";

export default function Precios() {

  return (
    <>
      <nav
        className={`fixed flex items-center justify-between shadow-lg w-full p-3 bg-[var(--color-navBar)] z-20`}
      >
        <Link
          to="/"
          onClick={() => window.scrollTo(0, 0)}
          className="text-2xl font-bold text-[var(--color-secundario)] hover:bg-[var(--color-secundarioHover)] transition-colors"
        >
          <img
            src={logo}
            alt="Logo"
            className="max-h-10 mix-blend-mode-multiply"
          />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            onClick={() => window.scrollTo(0, 0)}
            className="bg-amber-700 hover:bg-[var(--color-secundarioHover)] transition-colors text-md px-3 py-1 font-bold text-white rounded-md"
          >
            Menu
          </Link>
        </div>
      </nav>
      <PlanesPrecios />
    </>
  );
}
