import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./components/Login";
import Register from "./components/Register";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import PrivateRoute from "./components/PrivateRoute";
import MenuDemo from "./pages/MenuDemo";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Inicio from "./pages/Inicio";
import Perfil from "./pages/Perfil";
import { useEffect, useState } from "react";
import icon from "./assets/Logo/Icon Sonori fondo negro.png";
import NotFound from "./pages/NotFound";
import VentasCaja from "./components/ventas/VentasCaja";

function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontTimeout, setFontTimeout] = useState(false);

  useEffect(() => {
    let timeoutId;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setFontsLoaded(true));
      // Si en 3 segundos no cargan, seguimos igual
      timeoutId = setTimeout(() => setFontTimeout(true), 3000);
    } else {
      // Si la API no existe, seguimos igual
      setFontTimeout(true);
    }
    return () => clearTimeout(timeoutId);
  }, []);

  if (!fontsLoaded && !fontTimeout) {
    // Loader mientras esperamos las fuentes
    return <div className="bg-black/20 min-h-screen flex items-center justify-center">
      <img src={icon} alt="Icon Sonori" className="animate-bounce h-40 mb-20" />
    </div>;
  }

  return (
    <AuthProvider>
      <ToastContainer
        position="bottom-center"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
        theme="light"
      />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/menu" element={<MenuDemo />} />
          <Route path="/" element={<Inicio />} />
          <Route
            path="/tarjeta"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <PrivateRoute>
                <Perfil />
              </PrivateRoute>
            }
          />
          <Route
            path="/caja"
            element={
              <PrivateRoute>
                <VentasCaja />
              </PrivateRoute>
            }
          />
          {/* Ruta 404 al final */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
