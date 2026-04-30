import React, { useState } from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
  FaStar,
  FaArrowDown,
  FaTimes,
  FaBars,
} from "react-icons/fa";
import "./inicio.css"; // Crea este archivo para estilos personalizados

import logo from "../assets/Logo/Icon Sonori fondo negro.png";
import portada from "../assets/Fondos/portada fb sonori.png";
import img1 from "../assets/Inicio/Local fuera.jpeg";
import img2 from "../assets/Inicio/Local dentro hacia ventanas.jpeg";
import img3 from "../assets/Inicio/Local dentro hacia baño.jpeg";
import platillo1 from "../assets/Inicio/Platillos destacados/platillo1.jpeg";
import platillo2 from "../assets/Inicio/Platillos destacados/platillo2.jpeg";
import platillo3 from "../assets/Inicio/Platillos destacados/platillo3.jpeg";
import { Link } from "react-router-dom";
import { MdMenuBook } from "react-icons/md";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import promoLunes from "../assets/imgs/Lunes promocion teriyaki.jpg";
import promoMartes from "../assets/imgs/Martes promocion bonelles.jpg";
import promoMiercoles from "../assets/imgs/Miercoles promocion sushi.jpg";
import promoJueves from "../assets/imgs/Jueves promocion hamburguesas.jpg";
import { IoCardOutline } from "react-icons/io5";

const platillos = [
  { src: platillo1, nombre: "CRACKEN ROLL" },
  { src: platillo2, nombre: "CALIFORNIA BURGUER" },
  { src: platillo3, nombre: "YAKIMESHI ESPECIAL" },
];

const promos = [
  {
    dia: 1, // Lunes
    img: promoLunes,
    alt: "Lunes Teriyaki",
  },
  {
    dia: 2, // Martes
    img: promoMartes,
    alt: "Martes Boneless",
  },
  {
    dia: 3, // Miércoles
    img: promoMiercoles,
    alt: "Miércoles de Sushi",
  },
  {
    dia: 4, // Jueves
    img: promoJueves,
    alt: "Jueves Hamburguesas",
  },
];

function Inicio() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const hoy = new Date().getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  const promoHoy = promos.find((p) => p.dia === hoy);

  return (
    <div className="min-h-screen flex flex-col">
      {/* NAVBAR */}
      <nav className="w-full font-sonori tracking-wide flex items-center justify-center gap-4 px-4 py-2 fixed top-0 left-0 z-50 bg-gradient-to-r from-[var(--color-negro)] via-black to-[var(--color-principal)] shadow-lg">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        {/* Desktop menu */}
        <div className="hidden md:flex gap-6 items-center">
          <Link
            to="/"
            className="text-white text-3xl bg-white/20 rounded-2xl p-2 transition-all duration-300"
          >
            INICIO
          </Link>
          <Link
            to="/menu"
            className="text-white text-2xl hover:text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
          >
            MENÚ
          </Link>
          {user ? (
            <Link
              to="/tarjeta"
              onClick={() => window.scrollTo(0, 0)}
              className="bg-[var(--color-secundario)] uppercase text-black px-2 py-1 rounded hover:bg-[var(--color-secundarioHover)] transition text-2xl"
            >
              Tarjeta VIP
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => window.scrollTo(0, 0)}
              className="bg-[var(--color-secundario)] uppercase text-black px-2 py-1 rounded hover:bg-[var(--color-secundarioHover)] transition text-2xl"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
        {/* Hamburger icon */}
        <button
          className="md:hidden text-white text-3xl focus:outline-none"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {menuOpen ? (
            <FaTimes className="text-red-500" />
          ) : (
            <FaBars className="text-white" />
          )}
        </button>
      </nav>
      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed font-sonori top-[64px] left-0 w-full bg-[var(--color-negro)] bg-opacity-95 flex flex-col items-center gap-2 pt-8 pb-4 z-40 md:hidden">
          <Link
            to="/"
            className="text-white text-3xl bg-white/20 rounded-2xl p-2 transition-all duration-300"
            onClick={() => setMenuOpen(false)}
          >
            INICIO
          </Link>
          <Link
            to="/menu"
            className="text-white text-3xl hover:bg-white/20 rounded-2xl p-2 transition-all duration-300"
            onClick={() => setMenuOpen(false)}
          >
            MENÚ
          </Link>
          {user ? (
            <Link
              to="/tarjeta"
              onClick={() => {
                setMenuOpen(false);
                window.scrollTo(0, 0);
              }}
              className="bg-[var(--color-secundario)] uppercase text-black px-3 py-1 rounded hover:bg-[var(--color-secundarioHover)] transition text-3xl"
            >
              Tarjeta VIP
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => {
                setMenuOpen(false);
                window.scrollTo(0, 0);
              }}
              className="bg-[var(--color-secundario)] uppercase text-black px-3 py-1 rounded hover:bg-[var(--color-secundarioHover)] transition text-3xl"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      )}
      <header
        style={{
          backgroundImage: `linear-gradient(rgba(24,24,24,0.6), rgba(24,24,24,0.6)), url(${portada})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="relative min-h-[60vh] flex flex-col items-center justify-center text-center mt-12 py-16 bg-gradient-to-br from-[var(--color-principal)] via-[var(--color-negro)] to-[var(--color-principal)] shadow-lg"
      >
        {promoHoy ? (
          <>
            <img
              src={logo}
              alt="Sonori Restaurant"
              className="w-32 h-32 mb-4 animate-fade-in"
              style={{ filter: "drop-shadow(0 4px 24px #F6E71D88)" }}
            />
            <h1 className="text-5xl md:text-6xl font-sonori uppercase text-white drop-shadow animate-slide-down">
              Bienvenido a Sonori Restaurant
            </h1>
            <p className="mt-1 text-4xl text-[var(--color-principal)] uppercase font-sonori animate-fade-in">
              EXPERIENCIA EN SABOR
            </p>
            {/* ...Botones y CTA debajo del carrusel... */}
            <a
              href="tel:6536908010"
              target="_blank"
              rel="noopener noreferrer"
              title="Ordenar por teléfono"
              className="mt-4 text-2xl font-sonori tracking-wide inline-flex items-center uppercase gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-lg hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#25D366]/40 active:translate-y-0.5"
            >
              <FaPhoneAlt className="text-xl" />
              Ordena por teléfono
            </a>
            <Link
              to="/menu"
              className="my-2 text-2xl font-sonori tracking-wide flex items-center uppercase gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[var(--color-negro)] to-[var(--color-principal)] text-white shadow-lg hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--color-secundario)]/40 active:translate-y-0.5"
            >
              Ver Menú <MdMenuBook size={24} />
            </Link>
            {user ? (
              <Link
                to="/tarjeta"
                onClick={() => {
                  setMenuOpen(false);
                  window.scrollTo(0, 0);
                }}
                className="bg-orange-600 font-sonori tracking-wide flex items-center gap-2 uppercase text-white px-6 py-3 rounded-full text-2xl hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--color-secundario)]/40 active:translate-y-0.5"
              >
                Tarjeta VIP <IoCardOutline size={24} />
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => {
                  setMenuOpen(false);
                  window.scrollTo(0, 0);
                }}
                className="bg-orange-600 font-sonori tracking-wide flex items-center gap-2 uppercase text-white px-6 py-3 rounded-full text-2xl hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--color-secundario)]/40 active:translate-y-0.5"
              >
                Iniciar sesión <IoCardOutline size={24} />
              </Link>
            )}
            <Carousel
              showThumbs={false}
              showStatus={false}
              showIndicators={false}
              showArrows={true}
              autoPlay={false}
              infiniteLoop={false}
              swipeable={false}
              emulateTouch={false}
              selectedItem={0}
              className="w-full max-w-lg mx-auto mt-6"
            >
              <div className="flex flex-col items-center">
                <img
                  src={promoHoy.img}
                  alt={promoHoy.alt}
                  className="w-full max-w-md rounded-xl shadow-lg object-cover"
                  style={{ maxHeight: 450 }}
                  draggable={false}
                />
              </div>
            </Carousel>
          </>
        ) : (
          // Día normal: info general + carrusel de promos (auto)
          <div className="w-full flex flex-col items-center">
            <img
              src={logo}
              alt="Sonori Restaurant"
              className="w-32 h-32 mb-4 animate-fade-in"
              style={{ filter: "drop-shadow(0 4px 24px #F6E71D88)" }}
            />
            <h1 className="text-5xl md:text-6xl font-sonori uppercase text-white drop-shadow animate-slide-down">
              Bienvenido a Sonori Restaurant
            </h1>
            <p className="mt-1 text-4xl text-[var(--color-principal)]  font-sonori animate-fade-in">
              EXPERIENCIA EN SABOR
            </p>
            {/* ...Botones y CTA debajo del carrusel... */}
            <a
              href="tel:6536908010"
              target="_blank"
              rel="noopener noreferrer"
              title="Ordenar por teléfono"
              className="mt-4 text-2xl font-sonori tracking-wide inline-flex items-center uppercase gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-lg hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#25D366]/40 active:translate-y-0.5"
            >
              Ordena por teléfono
              <FaPhoneAlt className="text-xl" />
            </a>
            <Link
              to="/menu"
              className="my-2 text-2xl font-sonori tracking-wide flex items-center uppercase gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[var(--color-negro)] to-[var(--color-principal)] text-white shadow-lg hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--color-secundario)]/40 active:translate-y-0.5"
            >
              Ver Menú <MdMenuBook size={24} />
            </Link>
            {user ? (
              <Link
                to="/tarjeta"
                onClick={() => {
                  setMenuOpen(false);
                  window.scrollTo(0, 0);
                }}
                className="bg-orange-600 font-sonori tracking-wide flex items-center gap-2 uppercase text-white px-6 py-3 rounded-full text-2xl hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--color-secundario)]/40 active:translate-y-0.5"
              >
                Tarjeta VIP <IoCardOutline size={24} />
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => {
                  setMenuOpen(false);
                  window.scrollTo(0, 0);
                }}
                className="bg-orange-600 font-sonori tracking-wide flex items-center gap-2 uppercase text-white px-6 py-3 rounded-full text-2xl hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--color-secundario)]/40 active:translate-y-0.5"
              >
                Iniciar sesión <IoCardOutline size={24} />
              </Link>
            )}
            <Carousel
              showThumbs={false}
              showStatus={false}
              showIndicators={true}
              showArrows={true}
              autoPlay={true}
              infiniteLoop={true}
              interval={4500}
              transitionTime={800}
              swipeable={false}
              emulateTouch={false}
              className="w-full max-w-lg mx-auto mt-6"
            >
              {promos.map((promo, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <img
                    src={promo.img}
                    alt={promo.alt}
                    className="w-full max-w-md rounded-xl shadow-lg object-cover"
                    style={{ maxHeight: 550 }}
                    draggable={false}
                  />
                </div>
              ))}
            </Carousel>
          </div>
        )}
      </header>

      {/* Platillos destacados */}
      <div className="w-full pb-12 bg-gradient-to-b from-[var(--color-principal)] to-[var(--color-negro)]">
        <section className="max-w-5xl mx-auto w-full mt-16 px-4">
          <h2 className="text-6xl font-sonori uppercase tracking-wide text-center text-[var(--color-negro)] mb-8 animate-slide-up">
            Platillos Destacados
          </h2>
          <div className="flex flex-wrap justify-center gap-8">
            {platillos.map((p, idx) => (
              <div
                key={idx}
                className="group bg-white/90 rounded-3xl shadow-2xl p-4 flex flex-col items-center w-full md:w-72 hover:scale-[1.04] hover:-translate-y-2 transition-all duration-400 animate-fade-in"
                style={{ perspective: "800px" }}
              >
                <div className="overflow-hidden rounded-xl w-full h-auto flex items-center justify-center bg-gradient-to-br from-[var(--color-principal)] to-[var(--color-secundario)] shadow-lg">
                  <img
                    src={p.src}
                    alt={p.nombre}
                    className="object-cover rounded-xl shadow group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="mt-4 text-4xl font-sonori text-center text-orange-600 px-4 py-2">
                  {p.nombre}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Carrusel de imágenes del restaurante */}
      <div className="w-full bg-[var(--color-principal)] pb-10">
        <section className="max-w-3xl mx-auto w-full mt-10 animate-fade-in">
          <h2 className="text-6xl font-sonori uppercase text-center text-[var(--color-negro)] mb-6 animate-slide-up">
            DESCUBRE TU LUGAR FAVORITO
          </h2>
          <Carousel
            autoPlay
            infiniteLoop
            showThumbs={false}
            showStatus={false}
            interval={3500}
            transitionTime={800}
            className="rounded-xl shadow-lg"
            swipeable={false}
            emulateTouch={false}
            showArrows={true}
            showIndicators={true}
            stopOnHover={false}
            dynamicHeight={false}
          >
            {[img1, img2, img3].map((img, idx) => (
              <div
                key={idx}
                className="w-full h-[300px] md:h-[500px] flex items-center justify-center bg-black rounded-xl overflow-hidden"
              >
                <img
                  src={img}
                  alt={`Restaurante Sonori ${idx + 1}`}
                  className="w-full h-full object-cover rounded-xl"
                  draggable={false}
                />
              </div>
            ))}
          </Carousel>
        </section>
      </div>

      {/* Información de contacto */}
      <div className="w-full bg-gradient-to-b from-[var(--color-principal)] via-black to-[var(--color-navBar)]">
        <section className="max-w-3xl mx-auto w-full mt-16 mb-12 px-4">
          <h2 className="text-6xl uppercase tracking-wide font-sonori text-center text-[var(--color-negro)] mb-6 animate-slide-up">
            Contáctanos
          </h2>
          <div className="bg-gradient-to-br from-[var(--color-negro)] via-black to-[var(--color-principal)] rounded-3xl shadow-2xl p-4 flex flex-col md:flex-row gap-8 items-center text-white animate-fade-in">
            <div className="flex-1 flex flex-col gap-6 font-sonori">
              {/* <a
                href="mailto:contacto@sonorirestaurant.com"
                className="flex items-center gap-4 underline text-lg"
              >
                <FaEnvelope className="text-[var(--color-principal)] text-3xl" />
                <span>contacto@sonorirestaurant.com</span>
              </a> */}
              <div className="flex flex-col items-center gap-2 font-sonori">
                <span className="uppercase text-4xl tracking-wide text-[var(--color-principal)]">Horario:</span>
                <div className="flex flex-col justify-center items-center gap-0 text-2xl">
                  <span className="text-3xl">TODOS LOS DÍAS</span>
                  <span>LUN-JUE: 12:00PM - 10:00PM</span>
                  <span>VIE-SÁB: 12:00PM - 11:00PM</span>
                  <span>DOM: 1:00PM - 9:00PM</span>
                </div>
              </div>
              <a
                href="tel:6536908010"
                className="flex items-center gap-4 underline text-2xl"
              >
                <FaPhoneAlt className="text-[var(--color-principal)] text-3xl" />
                <span>653-690-8010</span>
              </a>
              <div className="flex items-center gap-4 text-2xl">
                <FaMapMarkerAlt className="text-[var(--color-principal)] text-4xl" />
                <span>
                  Av. Tamaulipas y Calle 9, 83440 San Luis Río Colorado, Son.
                </span>
              </div>
            </div>
            <div className="flex-1 w-full h-64 rounded-2xl overflow-hidden shadow-xl border-4 border-[var(--color-principal)]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.3668066982063!2d-114.77907300000001!3d32.4628794!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d64ffcac15d76f%3A0x88a9f81f8f4cb511!2sSonori%20Restaurant!5e0!3m2!1ses-419!2smx!4v1762371873627!5m2!1ses-419!2smx"
                width="100%"
                height="300px"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación Sonori Restaurant"
              ></iframe>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

export default Inicio;
