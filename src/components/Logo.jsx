import logo from "../assets/Logo/Logo Sonori horizontal fondo negro.png";

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logo}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        alt="Logo"
        className="h-16"
      />
    </div>
  );
}
