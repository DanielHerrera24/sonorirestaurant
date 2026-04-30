import { useRef, useEffect, useState } from "react";
import { db, auth, storage } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { MdCancel } from "react-icons/md";
import NavBar from "../components/NavBar";
import { Link } from "react-router-dom";
import { FaPlus, FaArrowDown, FaStar, FaSpinner } from "react-icons/fa";
import icon from "../assets/Logo/Icon Sonori fondo negro.png";
import Footer from "../components/Footer";
import { GiClick } from "react-icons/gi";
import Joyride, { STATUS } from "react-joyride";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css"; // O la ruta que funcione en tu proyecto

function MenuDemo() {
  const [menu, setMenu] = useState({});
  const [categoriaActual, setCategoriaActual] = useState("");
  const [categorias, setCategorias] = useState([""]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rol, setRol] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    categoria: "",
    subcategoria: "",
    alt: "",
    imagen: null,
    estado: "regular",
  });
  const [categoriasDb, setCategoriasDb] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [showSticky, setShowSticky] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const destacadoRef = useRef(null);
  const categoriaRefs = useRef({});
  const [menuAbierto, setMenuAbierto] = useState(true);
  const [modalOrden, setModalOrden] = useState({
    abierto: false,
    tipo: null,
    categoria: null,
  });
  const [ordenTemporal, setOrdenTemporal] = useState([]);
  const [loading, setLoading] = useState(true);
  // Estado para usuario (puedes usar el mismo que ya tienes o agregarlo)
  const [usuario, setUsuario] = useState(null);
  const [clienteId, setClienteId] = useState(null);
  const [subcategoriasDb, setSubcategoriasDb] = useState([]); // [{nombre, descripcion, categoria}]
  const [modalSubcategoria, setModalSubcategoria] = useState(false);
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState("");
  const [descripcionCategoria, setDescripcionCategoria] = useState("");
  const [descripcionSubcategoria, setDescripcionSubcategoria] = useState("");
  // Nuevo estado para info de categoría
  const [categoriasInfo, setCategoriasInfo] = useState([]); // [{nombre, descripcion, orden}]
  const [runTour, setRunTour] = useState(false);
  const [joyrideStepIndex, setJoyrideStepIndex] = useState(0);
  const joyrideTimeoutRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState("");

  // Solo un paso
  const steps = [
    {
      target: "#btn-hamburguesa",
      content: (
        <div className="text-3xl font-sonori uppercase">
          <p>
            Pulsa aquí para ver las{" "}
            <span className="text-orange-600">categorías del menú</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="noMostrarTipMenu"
              onChange={(e) => {
                if (e.target.checked) {
                  localStorage.setItem("noMostrarTipMenu", "1");
                  setRunTour(false);
                } else {
                  localStorage.removeItem("noMostrarTipMenu");
                }
              }}
            />
          </div>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
  ];

  useEffect(() => {
    // Limpia el timeout al desmontar o cambiar de categoría
    return () => {
      if (joyrideTimeoutRef.current) {
        clearTimeout(joyrideTimeoutRef.current);
        joyrideTimeoutRef.current = null;
      }
    };
  }, []);

  // Detecta usuario logueado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
    });
    return () => unsub();
  }, []);

  // Cargar categorías desde Firestore
  const fetchCategorias = async () => {
    const snapshot = await getDocs(collection(db, "categorias"));
    const cats = snapshot.docs
      .map((doc) => ({
        nombre: doc.data().nombre,
        orden: doc.data().orden ?? 0,
        descripcion: doc.data().descripcion || "",
      }))
      .sort((a, b) => a.orden - b.orden);
    setCategoriasDb(cats.map((c) => c.nombre));
    setCategorias(cats.map((c) => c.nombre));
    setCategoriasInfo(cats); // Nuevo estado para info de categoría
  };

  // Cargar subcategorías desde Firestore
  const fetchSubcategorias = async () => {
    const snapshot = await getDocs(collection(db, "subcategorias"));
    setSubcategoriasDb(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    );
  };

  const fetchPlatillos = async () => {
    const snapshot = await getDocs(collection(db, "platillos"));
    const datos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Ordena por el campo 'orden'
    datos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    const agrupados = { Todos: datos };
    datos.forEach((item) => {
      if (!agrupados[item.categoria]) agrupados[item.categoria] = [];
      agrupados[item.categoria].push(item);
    });

    setMenu(agrupados);
  };

  useEffect(() => {
    fetchPlatillos();
  }, []);

  const verificarAdmin = async (user) => {
    console.log("Verificando UID:", user.uid);
    // Buscar el documento donde authUid == user.uid
    const q = query(
      collection(db, "clientes"),
      where("authUid", "==", user.uid),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      console.log("Datos del usuario:", data);
      if (data.rol === "admin") {
        setIsAdmin(true);
        setRol("admin");
        console.log("✅ Es admin");
      } else if (data.rol === "caja") {
        setIsAdmin(false);
        setRol("caja");
      } else {
        setIsAdmin(false);
        setRol("cliente");
      }
    } else {
      console.log("❌ Documento no encontrado");
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        verificarAdmin(user);
      }
    });
    fetchCategorias();
    fetchPlatillos();
    return () => unsub();
  }, []);

  // Al crear categoría, guarda descripción
  const handleAgregarCategoria = async (e) => {
    e.preventDefault();
    const nueva = nuevaCategoria.trim();
    if (!nueva) return;
    await addDoc(collection(db, "categorias"), {
      nombre: nueva,
      descripcion: descripcionCategoria,
    });
    setNuevaCategoria("");
    setDescripcionCategoria("");
    setModalCategoria(false);

    // Espera a que se actualicen las categorías y selecciona la nueva
    await fetchCategorias();
    setForm((prev) => ({ ...prev, categoria: nueva }));
  };

  // Al crear subcategoría
  const handleAgregarSubcategoria = async (e) => {
    e.preventDefault();
    if (!nuevaSubcategoria.trim() || !form.categoria) return;
    await addDoc(collection(db, "subcategorias"), {
      nombre: nuevaSubcategoria.trim(),
      descripcion: descripcionSubcategoria,
      categoria: form.categoria,
    });
    setNuevaSubcategoria("");
    setDescripcionSubcategoria("");
    setModalSubcategoria(false);
    await fetchSubcategorias();
    setForm((prev) => ({ ...prev, subcategoria: nuevaSubcategoria.trim() }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setForm({ ...form, imagen: file });
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImg(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewImg(null);
    }
  };

  // Eliminar platillo
  const handleEliminarPlatillo = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este platillo?")) {
      await deleteDoc(doc(db, "platillos", id));
      fetchPlatillos();
    }
  };

  // Editar platillo
  const handleEditarPlatillo = (id, datos) => {
    setEditandoId(id);
    setForm({
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      precio: datos.precio,
      precioPromo: datos.precioPromo || "",
      categoria: datos.categoria,
      subcategoria: datos.subcategoria || "",
      alt: datos.alt,
      imagen: null,
      estado: datos.estado || "regular",
    });
    setPreviewImg(datos.imagen || null); // Muestra la imagen actual
    setMostrarModal(true);
  };

  // Modifica handleSubmit para guardar subcategoria
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.precio)
      return alert("Nombre y precio son requeridos.");

    let url = "";
    if (form.imagen) {
      const storageRef = ref(
        storage,
        `platillos/${Date.now()}-${form.imagen.name}`,
      );
      await uploadBytes(storageRef, form.imagen);
      url = await getDownloadURL(storageRef);
    }

    if (editandoId) {
      const platilloRef = doc(db, "platillos", editandoId);
      await updateDoc(platilloRef, {
        nombre: form.nombre,
        descripcion: form.descripcion || "",
        precio: form.precio,
        categoria: form.categoria || null,
        subcategoria: form.subcategoria || "",
        alt: form.alt || form.nombre,
        ...(url && { imagen: url }),
        estado: form.estado,
        precioPromo: form.estado === "promocion" ? form.precioPromo : "",
      });
    } else {
      await addDoc(collection(db, "platillos"), {
        nombre: form.nombre,
        descripcion: form.descripcion || "",
        precio: form.precio,
        categoria: form.categoria || null,
        subcategoria: form.subcategoria || "",
        alt: form.alt || form.nombre,
        imagen: url,
        creado: serverTimestamp(),
        estado: form.estado,
        precioPromo: form.estado === "promocion" ? form.precioPromo : "",
      });
    }

    setMostrarModal(false);
    setEditandoId(null);
    setForm({
      nombre: "",
      descripcion: "",
      precio: "",
      categoria: "",
      subcategoria: "",
      alt: "",
      imagen: null,
      estado: "regular",
    });
    setPreviewImg(null); // Limpia la vista previa

    fetchPlatillos();
  };

  // Detectar si el bloque destacado está visible
  useEffect(() => {
    const handleScroll = () => {
      if (!destacadoRef.current) return;
      const rect = destacadoRef.current.getBoundingClientRect();
      setShowSticky(rect.bottom <= 70); // 70px aprox. altura de NavBar
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (showSticky) {
      setStickyVisible(true);
    } else if (stickyVisible) {
      // Espera la animación de salida antes de ocultar
      const timeout = setTimeout(() => setStickyVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [showSticky, stickyVisible]);

  const handleSeleccionarCategoria = (cat) => {
    setCategoriaActual(cat);
    setRunTour(false); // Oculta el tour mientras se navega
    if (joyrideTimeoutRef.current) {
      clearTimeout(joyrideTimeoutRef.current);
      joyrideTimeoutRef.current = null;
    }
    setTimeout(() => {
      const el = document.getElementById(`cat-${cat.replace(/\s+/g, "-")}`);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 50);

    // Espera 1000ms y muestra el tour si corresponde
    if (!localStorage.getItem("noMostrarTipMenu")) {
      joyrideTimeoutRef.current = setTimeout(() => {
        setRunTour(true);
      }, 1000);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      let found = false;
      for (let i = 0; i < categoriasDb.length; i++) {
        const cat = categoriasDb[i];
        // Busca solo los elementos del menú principal
        const el = document.querySelector(
          `#cat-${cat.replace(/\s+/g, "-")}.categoria-menu`,
        );
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom > 140) {
            if (categoriaActual !== cat) setCategoriaActual(cat);
            found = true;
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categoriasDb, setCategoriaActual, categoriaActual]);

  // Justo antes del return de MenuDemo
  const handleScrollPrimerCategoria = () => {
    setTimeout(() => {
      const primerCategoria = document.getElementById(
        `cat-${categoriasDb[0].replace(/\s+/g, "-")}`,
      );
      if (primerCategoria) {
        const y =
          primerCategoria.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 50);
  };

  useEffect(() => {
    const cargarTodo = async () => {
      setLoading(true);
      await Promise.all([
        fetchCategorias(),
        fetchPlatillos(),
        fetchSubcategorias(),
      ]);
      setLoading(false);
    };
    cargarTodo();
  }, []);

  useEffect(() => {
    if (usuario) {
      getDocs(
        query(collection(db, "clientes"), where("authUid", "==", usuario.uid)),
      ).then((snap) => {
        if (!snap.empty) setClienteId(snap.docs[0].id);
      });
    }
  }, [usuario]);

  useEffect(() => {
    if (menuAbierto) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    // Limpia al desmontar
    return () => document.body.classList.remove("overflow-hidden");
  }, [menuAbierto]);

  // Maneja el cierre del tour
  const handleJoyrideCallback = (data) => {
    const { status, action, type } = data;

    // Cuando avanza al segundo paso, abre el menú y pausa el tour
    if (type === "step:after" && action === "next") {
      setMenuAbierto(true);
      setRunTour(false); // Pausa el tour
      setJoyrideStepIndex(1); // Guarda el índice del siguiente paso
    }

    // Cuando termina el tour
    if (
      [STATUS.FINISHED, STATUS.SKIPPED].includes(status) ||
      (type === "step:after" && action === "close")
    ) {
      setRunTour(false);
      setJoyrideStepIndex(0);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("noMostrarTipMenu")) {
      setRunTour(true);
    }
  }, []);

  useEffect(() => {
    const checkBtn = () => !!document.getElementById("btn-hamburguesa");
    if (!localStorage.getItem("noMostrarTipMenu")) {
      const interval = setInterval(() => {
        if (checkBtn()) {
          setRunTour(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // --- Joyride: solo mostrar una vez ---
  const [joyrideVisto, setJoyrideVisto] = useState(() => {
    // Lee de localStorage si ya se vio el tour
    return localStorage.getItem("joyrideMenuDemoVisto") === "1";
  });

  // Cuando se pulse "ENTENDIDO" o se cierre el tour, guardar en localStorage
  const handleJoyrideCallbackPersist = (data) => {
    if (
      data.status === "finished" ||
      data.status === "skipped" ||
      data.action === "close"
    ) {
      localStorage.setItem("joyrideMenuDemoVisto", "1");
      setJoyrideVisto(true);
      setRunTour(false);
    }
    if (typeof handleJoyrideCallback === "function") {
      handleJoyrideCallback(data);
    }
  };

  useEffect(() => {
    if (joyrideVisto) {
      setRunTour(false);
    }
  }, [joyrideVisto]);

  return (
    <div
      className="bg-[var(--color-negro)] min-h-screen"
      style={{ fontFamily: "'Nunito Sans', Arial, sans-serif" }}
    >
      {/* {!menuAbierto && !joyrideVisto && (
        <Joyride
          steps={steps}
          run={runTour}
          continuous={false}
          showSkipButton={true}
          showProgress={false}
          disableOverlayClose
          styles={{
            options: {
              zIndex: 10000,
              primaryColor: "#ea580c",
              textColor: "#181818",
              overlayColor: "rgba(0,0,0,0.4)",
            },
          }}
          locale={{
            last: "ENTENDIDO",
            close: "ENTENDIDO",
          }}
          callback={handleJoyrideCallbackPersist}
        />
      )} */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <FaSpinner className="animate-spin text-[var(--color-principal)] text-5xl" />
        </div>
      )}
      {!loading && (
        <div>
          {/* NavBar con props */}
          <NavBar
            categorias={categorias}
            categoriaActual={categoriaActual}
            setCategoriaActual={handleSeleccionarCategoria}
            menuAbierto={menuAbierto}
            setMenuAbierto={setMenuAbierto}
            subcategoriasDb={subcategoriasDb}
            handleSeleccionarCategoria={handleSeleccionarCategoria}
            setRunTour={setRunTour}
          />

          {stickyVisible && (
            <div
              className={`sticky z-30 w-full font-sonori tracking-wide bg-gradient-to-r from-[var(--color-principal)] via-[var(--color-principalHover)] to-[var(--color-negro)] shadow flex items-center justify-between px-2 py-1 border-b border-[var(--color-principal)]
      ${showSticky ? "fade-in-sticky" : "fade-out-sticky"}
      ${menuAbierto ? "top-[78px]" : "top-[78px]"} transition-all duration-300`}
            >
              {!auth.currentUser ? (
                <>
                  <span className="text-[var(--color-negro)] uppercase text-xl">
                    ¡Obtén tu tarjeta VIP!
                  </span>
                  <Link
                    to="/login"
                    onClick={() => window.scrollTo(0, 0)}
                    className="bg-[var(--color-principal)] text-center hover:bg-[var(--color-principalHover)] text-[var(--color-negro)] uppercase px-3 py-1 rounded-full text-lg shadow"
                  >
                    Regístrate
                  </Link>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[var(--color-negro)] uppercase text-xl tracking-tight">
                    No olvides sumar puntos
                  </span>
                  <Link
                    to="/tarjeta"
                    onClick={() => window.scrollTo(0, 0)}
                    className="bg-[var(--color-principal)] text-center hover:bg-[var(--color-principalHover)] text-[var(--color-negro)] tracking-tight uppercase px-3 py-1 rounded-full text-lg shadow"
                  >
                    Ir a mi tarjeta
                  </Link>
                </div>
              )}
            </div>
          )}

          {mostrarModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-black/80 p-6 rounded-lg w-full max-w-md relative max-h-[80vh] border-b-[20px] border-t-[8px] border-x border-[var(--color-principal)] overflow-y-auto">
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-[var(--color-promocion)]"
                  onClick={() => {
                    setMostrarModal(false);
                    setForm({
                      nombre: "",
                      descripcion: "",
                      precio: "",
                      categoria: "",
                      subcategoria: "",
                      alt: "",
                      imagen: null,
                      estado: "regular",
                    });
                    setPreviewImg(null); // Limpia la vista previa
                  }}
                >
                  <MdCancel size={24} />
                </button>
                <h2 className="text-xl font-bold mb-4 text-[var(--color-principalHover)]">
                  Nuevo Platillo
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label
                      htmlFor="nombre"
                      className="text-[var(--color-principalHover)]"
                    >
                      Nombre del platillo*
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del platillo*"
                      value={form.nombre}
                      onChange={(e) =>
                        setForm({ ...form, nombre: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  {form.categoria === "Charolas" ? (
                    <div>
                      <label
                        htmlFor="descripcion"
                        className="text-[var(--color-principalHover)]"
                      >
                        Detalles del platillo (cada línea será un punto)
                      </label>
                      <textarea
                        placeholder="Ejemplo:\n- 2 rollos clásicos...\n- Teriyaki de pollo o boneless...\n- Papas Sonori..."
                        value={form.descripcion}
                        onChange={(e) =>
                          setForm({ ...form, descripcion: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                        rows={5}
                        required
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Escribe cada punto en una línea diferente.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="descripcion"
                        className="text-[var(--color-principalHover)]"
                      >
                        Descripción (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Descripción (opcional)"
                        value={form.descripcion}
                        onChange={(e) =>
                          setForm({ ...form, descripcion: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="precio"
                      className="text-[var(--color-principalHover)]"
                    >
                      Precio (en pesos)*
                    </label>
                    <input
                      type="number"
                      placeholder="Precio (en pesos)*"
                      value={form.precio}
                      onChange={(e) =>
                        setForm({ ...form, precio: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="categoria"
                      className="text-[var(--color-principalHover)]"
                    >
                      Categoría*
                    </label>
                    <select
                      value={form.categoria}
                      onChange={(e) => {
                        if (e.target.value === "__agregar__") {
                          setModalCategoria(true);
                          setForm({ ...form, categoria: "", subcategoria: "" });
                        } else {
                          setForm({
                            ...form,
                            categoria: e.target.value,
                            subcategoria: "",
                          });
                        }
                      }}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="">Selecciona categoría</option>
                      {categoriasDb.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__agregar__">
                        ➕ Agregar nueva categoría...
                      </option>
                    </select>
                    {/* Mostrar descripción de la categoría seleccionada */}
                    {form.categoria && (
                      <div className="text-xs text-gray-300 mt-1">
                        {
                          (
                            categoriasInfo.find(
                              (c) => c.nombre === form.categoria,
                            ) || {}
                          ).descripcion
                        }
                      </div>
                    )}
                  </div>
                  {/* SUBCATEGORÍA */}
                  {form.categoria && (
                    <div>
                      <label
                        htmlFor="subcategoria"
                        className="text-[var(--color-principalHover)]"
                      >
                        Subcategoría
                      </label>
                      <select
                        value={form.subcategoria}
                        onChange={(e) => {
                          if (e.target.value === "__agregar__") {
                            setModalSubcategoria(true);
                            setForm({ ...form, subcategoria: "" });
                          } else {
                            setForm({ ...form, subcategoria: e.target.value });
                          }
                        }}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Selecciona subcategoría</option>
                        {subcategoriasDb
                          .filter((sub) => sub.categoria === form.categoria)
                          .map((sub) => (
                            <option key={sub.id} value={sub.nombre}>
                              {sub.nombre}
                            </option>
                          ))}
                        <option value="__agregar__">
                          ➕ Agregar nueva subcategoría...
                        </option>
                      </select>
                      {/* Mostrar descripción de la subcategoría seleccionada */}
                      {form.subcategoria && (
                        <div className="text-xs text-gray-300 mt-1">
                          {
                            (
                              subcategoriasDb.find(
                                (s) =>
                                  s.nombre === form.subcategoria &&
                                  s.categoria === form.categoria,
                              ) || {}
                            ).descripcion
                          }
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="tipo-precio"
                      className="text-[var(--color-principalHover)]"
                    >
                      Tipo de precio*
                    </label>
                    <select
                      value={form.estado}
                      onChange={(e) =>
                        setForm({ ...form, estado: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="regular">Precio regular</option>
                      <option value="promocion">Promoción</option>
                      <option value="nuevo">Lo Nuevo</option>
                    </select>
                  </div>

                  {form.estado === "promocion" && (
                    <div>
                      <label
                        htmlFor="precio-promo"
                        className="text-[var(--color-principalHover)]"
                      >
                        Precio en promoción*
                      </label>
                      <input
                        type="number"
                        placeholder="Precio en promoción*"
                        value={form.precioPromo}
                        onChange={(e) =>
                          setForm({ ...form, precioPromo: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="file-upload"
                      className="text-[var(--color-principalHover)]"
                    >
                      Imagen del platillo (opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full"
                    />
                  </div>
                  {previewImg && (
                    <div className="mb-4 relative">
                      <img
                        src={previewImg}
                        alt="Vista previa"
                        className="w-full h-auto max-h-[30vh] object-contain rounded-md"
                      />
                      <button
                        type="button"
                        className="absolute top-0 right-0 text-[var(--color-promocion)] hover:text-[var(--color-promocionHover)]"
                        onClick={() => setPreviewImg(null)}
                      >
                        <MdCancel size={30} />
                      </button>
                    </div>
                  )}
                  {previewImg && (
                    <div>
                      <label
                        htmlFor="alt-text"
                        className="text-[var(--color-principalHover)]"
                      >
                        Texto alternativo (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Texto descriptivo para la imagen"
                        value={form.alt}
                        onChange={(e) =>
                          setForm({ ...form, alt: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-[var(--color-principal)] text-[var(--color-negro)]  py-2 rounded hover:bg-[var(--color-principalHover)] transition"
                  >
                    Guardar platillo
                  </button>
                </form>
              </div>
            </div>
          )}

          {modalCategoria && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-black/80 p-6 rounded-lg w-full max-w-md relative border border-[var(--color-principal)]">
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-[var(--color-promocion)]"
                  onClick={() => setModalCategoria(false)}
                >
                  <MdCancel size={24} />
                </button>
                <h2 className="text-xl font-bold mb-4 text-[var(--color-principalHover)]">
                  Nueva Categoría
                </h2>
                <form onSubmit={handleAgregarCategoria} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nombre de la nueva categoría"
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <textarea
                    placeholder="Descripción de la categoría (opcional)"
                    value={descripcionCategoria}
                    onChange={(e) => setDescripcionCategoria(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                  <button
                    type="submit"
                    className="w-full bg-[var(--color-principal)] text-black  py-2 rounded hover:bg-[var(--color-principalHover)] transition"
                  >
                    Agregar categoría
                  </button>
                </form>
              </div>
            </div>
          )}

          {modalSubcategoria && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-black/80 p-6 rounded-lg w-full max-w-md relative border border-[var(--color-principal)]">
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-[var(--color-promocion)]"
                  onClick={() => setModalSubcategoria(false)}
                >
                  <MdCancel size={24} />
                </button>
                <h2 className="text-xl font-bold mb-4 text-[var(--color-principalHover)]">
                  Nueva Subcategoría
                </h2>
                <form
                  onSubmit={handleAgregarSubcategoria}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    placeholder="Nombre de la nueva subcategoría"
                    value={nuevaSubcategoria}
                    onChange={(e) => setNuevaSubcategoria(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <textarea
                    placeholder="Descripción de la subcategoría (opcional)"
                    value={descripcionSubcategoria}
                    onChange={(e) => setDescripcionSubcategoria(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                  <button
                    type="submit"
                    className="w-full bg-[var(--color-principal)] text-black  py-2 rounded hover:bg-[var(--color-principalHover)] transition"
                  >
                    Agregar subcategoría
                  </button>
                </form>
              </div>
            </div>
          )}

          {modalOrden.abierto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-black/80 border border-[var(--color-principal)] max-h-[80vh] overflow-y-auto p-6 pb-2 rounded-lg w-full max-w-md relative">
                <button
                  className="absolute top-2 right-2 text-gray-200 hover:text-[var(--color-promocion)]"
                  onClick={() =>
                    setModalOrden({
                      abierto: false,
                      tipo: null,
                      categoria: null,
                    })
                  }
                >
                  <MdCancel size={28} />
                </button>
                <h2 className="text-xl font-bold mb-4 text-[var(--color-principal)]">
                  {modalOrden.tipo === "categorias"
                    ? "Ordenar categorías"
                    : `Ordenar platillos (${modalOrden.categoria})`}
                </h2>
                {/* Si es platillos, permite elegir la categoría */}
                {modalOrden.tipo === "platillos" && (
                  <select
                    className="mb-4 w-full border rounded px-3 py-2"
                    value={modalOrden.categoria}
                    onChange={(e) => {
                      setModalOrden((m) => ({
                        ...m,
                        categoria: e.target.value,
                      }));
                      setOrdenTemporal([...(menu[e.target.value] || [])]);
                    }}
                  >
                    {categoriasDb.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
                {modalOrden.tipo === "subcategorias" && (
                  <select
                    className="mb-4 w-full border rounded px-3 py-2"
                    value={modalOrden.categoria}
                    onChange={(e) => {
                      const nuevaCategoria = e.target.value;
                      setModalOrden((m) => ({
                        ...m,
                        categoria: nuevaCategoria,
                      }));
                      setOrdenTemporal(() => {
                        const ordenadas = subcategoriasDb
                          .filter((s) => s.categoria === nuevaCategoria)
                          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                          .map((s) => s.nombre);

                        // Si hay platillos sin subcategoría, agrega "Sin subcategoría" si no está
                        const tieneSinSub = (menu[nuevaCategoria] || []).some(
                          (p) => !p.subcategoria,
                        );
                        if (
                          tieneSinSub &&
                          !ordenadas.includes("Sin subcategoría")
                        ) {
                          ordenadas.push("Sin subcategoría");
                        }
                        return ordenadas;
                      });
                    }}
                  >
                    {categoriasDb
                      .filter((cat) =>
                        subcategoriasDb.some((sub) => sub.categoria === cat),
                      )
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                  </select>
                )}
                <ul className="space-y-2">
                  {modalOrden.tipo === "platillos" && modalOrden.categoria
                    ? (() => {
                        // Agrupa platillos por subcategoría
                        const platillos = ordenTemporal;
                        const subcats = {};
                        platillos.forEach((item) => {
                          const key = item.subcategoria || "Sin subcategoría";
                          if (!subcats[key]) subcats[key] = [];
                          subcats[key].push(item);
                        });
                        // Ordena subcategorías según subcategoriasDb
                        const ordenSubcats = subcategoriasDb
                          .filter((s) => s.categoria === modalOrden.categoria)
                          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                          .map((s) => s.nombre);

                        // Si hay platillos sin subcategoría y no está en la lista, agrégalo
                        const tieneSinSub = platillos.some(
                          (p) => !p.subcategoria,
                        );
                        if (
                          tieneSinSub &&
                          !ordenSubcats.includes("Sin subcategoría")
                        ) {
                          ordenSubcats.push("Sin subcategoría");
                        }
                        const allSubcats = ordenSubcats;

                        return allSubcats.map((subcat) =>
                          (subcats[subcat] || []).length > 0 ? (
                            <li key={subcat} className="mb-4">
                              <div className="text-base font-bold text-[var(--color-secundario)] uppercase mb-1">
                                {subcat}
                              </div>
                              <ul className="space-y-1">
                                {subcats[subcat].map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex items-center gap-2"
                                  >
                                    <span className="flex-1 truncate text-white">
                                      <span className="font-bold text-[var(--color-principal)]">
                                        {item.nombre}
                                      </span>
                                    </span>
                                    <button
                                      disabled={
                                        ordenTemporal.findIndex(
                                          (p) => p.id === item.id,
                                        ) === 0
                                      }
                                      className="px-2 py-1 rounded bg-[var(--color-principal)] hover:bg-[var(--color-principalHover)] text-[var(--color-negro)] opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                                      onClick={() => {
                                        const idxGlobal =
                                          ordenTemporal.findIndex(
                                            (p) => p.id === item.id,
                                          );
                                        if (idxGlobal === 0) return;
                                        const nuevo = [...ordenTemporal];
                                        [
                                          nuevo[idxGlobal - 1],
                                          nuevo[idxGlobal],
                                        ] = [
                                          nuevo[idxGlobal],
                                          nuevo[idxGlobal - 1],
                                        ];
                                        setOrdenTemporal(nuevo);
                                      }}
                                      title="Subir"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      disabled={
                                        ordenTemporal.findIndex(
                                          (p) => p.id === item.id,
                                        ) ===
                                        ordenTemporal.length - 1
                                      }
                                      className="px-2 py-1 rounded bg-[var(--color-principal)] hover:bg-[var(--color-principalHover)] text-[var(--color-negro)] opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                                      onClick={() => {
                                        const idxGlobal =
                                          ordenTemporal.findIndex(
                                            (p) => p.id === item.id,
                                          );
                                        if (
                                          idxGlobal ===
                                          ordenTemporal.length - 1
                                        )
                                          return;
                                        const nuevo = [...ordenTemporal];
                                        [
                                          nuevo[idxGlobal],
                                          nuevo[idxGlobal + 1],
                                        ] = [
                                          nuevo[idxGlobal + 1],
                                          nuevo[idxGlobal],
                                        ];
                                        setOrdenTemporal(nuevo);
                                      }}
                                      title="Bajar"
                                    >
                                      ↓
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ) : null,
                        );
                      })()
                    : ordenTemporal.map((item, idx) => (
                        <li
                          key={
                            modalOrden.tipo === "categorias"
                              ? `${item}-${idx}`
                              : modalOrden.tipo === "subcategorias"
                                ? `${modalOrden.categoria}-${item}`
                                : item.id
                          }
                          className="flex items-center gap-2"
                        >
                          <span className="flex-1 truncate text-white">
                            <span className="font-bold text-[var(--color-principal)]">
                              {item}
                            </span>
                          </span>
                          <button
                            disabled={idx === 0}
                            className="px-2 py-1 rounded bg-[var(--color-principal)] hover:bg-[var(--color-principalHover)] text-[var(--color-negro)] opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (idx === 0) return;
                              const nuevo = [...ordenTemporal];
                              [nuevo[idx - 1], nuevo[idx]] = [
                                nuevo[idx],
                                nuevo[idx - 1],
                              ];
                              setOrdenTemporal(nuevo);
                            }}
                            title="Subir"
                          >
                            ↑
                          </button>
                          <button
                            disabled={idx === ordenTemporal.length - 1}
                            className="px-2 py-1 rounded bg-[var(--color-principal)] hover:bg-[var(--color-principalHover)] text-[var(--color-negro)] opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (idx === ordenTemporal.length - 1) return;
                              const nuevo = [...ordenTemporal];
                              [nuevo[idx], nuevo[idx + 1]] = [
                                nuevo[idx + 1],
                                nuevo[idx],
                              ];
                              setOrdenTemporal(nuevo);
                            }}
                            title="Bajar"
                          >
                            ↓
                          </button>
                        </li>
                      ))}
                </ul>
                <button
                  className="my-4 w-full sticky bottom-0 bg-[var(--color-principal)] text-black  py-2 rounded hover:bg-[var(--color-principalHover)] transition"
                  onClick={async () => {
                    if (modalOrden.tipo === "categorias") {
                      setCategoriasDb([...ordenTemporal]);
                      setCategorias([...ordenTemporal]);
                      // Guarda en Firestore
                      for (let i = 0; i < ordenTemporal.length; i++) {
                        const q = query(
                          collection(db, "categorias"),
                          where("nombre", "==", ordenTemporal[i]),
                        );
                        const snap = await getDocs(q);
                        if (!snap.empty) {
                          await updateDoc(
                            doc(db, "categorias", snap.docs[0].id),
                            {
                              orden: i,
                            },
                          );
                        }
                      }
                    } else if (modalOrden.tipo === "platillos") {
                      setMenu((prev) => ({
                        ...prev,
                        [modalOrden.categoria]: [...ordenTemporal],
                      }));
                      // Guarda en Firestore
                      for (let i = 0; i < ordenTemporal.length; i++) {
                        await updateDoc(
                          doc(db, "platillos", ordenTemporal[i].id),
                          {
                            orden: i,
                          },
                        );
                      }
                    } else if (modalOrden.tipo === "subcategorias") {
                      // Guarda el orden de las subcategorías de la categoría seleccionada
                      for (let i = 0; i < ordenTemporal.length; i++) {
                        if (ordenTemporal[i] === "Sin subcategoría") {
                          // Guarda el orden de "Sin subcategoría" en un documento especial
                          // Puedes usar un doc con nombre: "Sin subcategoría" y la categoría correspondiente
                          const q = query(
                            collection(db, "subcategorias"),
                            where("nombre", "==", "Sin subcategoría"),
                            where("categoria", "==", modalOrden.categoria),
                          );
                          const snap = await getDocs(q);
                          if (!snap.empty) {
                            await updateDoc(
                              doc(db, "subcategorias", snap.docs[0].id),
                              {
                                orden: i,
                              },
                            );
                          } else {
                            // Si no existe, créalo
                            await addDoc(collection(db, "subcategorias"), {
                              nombre: "Sin subcategoría",
                              categoria: modalOrden.categoria,
                              orden: i,
                              descripcion: "",
                            });
                          }
                        } else {
                          // Subcategoría normal
                          const q = query(
                            collection(db, "subcategorias"),
                            where("nombre", "==", ordenTemporal[i]),
                            where("categoria", "==", modalOrden.categoria),
                          );
                          const snap = await getDocs(q);
                          if (!snap.empty) {
                            await updateDoc(
                              doc(db, "subcategorias", snap.docs[0].id),
                              {
                                orden: i,
                              },
                            );
                          }
                        }
                      }
                      // Opcional: recarga subcategorías
                      await fetchSubcategorias();
                    }
                    setModalOrden({
                      abierto: false,
                      tipo: null,
                      categoria: null,
                    });
                  }}
                >
                  Guardar orden
                </button>
              </div>
            </div>
          )}

          <article className="relative min-h-[500px] flex flex-col justify-center border-b-2 border-dotted border-b-[var(--color-principal)] bg-gradient-to-br from-[var(--color-negro)] to-[var(--color-negro)] overflow-hidden">
            {/* Fondo decorativo de cafés en patrón de rejilla */}
            <div className="absolute inset-0 pointer-events-none z-0">
              {Array.from({ length: window.innerWidth < 640 ? 6 : 6 }).map(
                (_, row) =>
                  Array.from({ length: window.innerWidth < 640 ? 8 : 8 }).map(
                    (_, col) => (
                      <img
                        key={`coffee-${row}-${col}`}
                        className="text-[var(--color-principal)] opacity-40"
                        src={icon}
                        style={{
                          position: "absolute",
                          top: `${row * 18}%`,
                          left: `${col * 12.5}%`,
                          transform: `rotate(-30deg)`,
                          height: "auto",
                          width: "40px",
                        }}
                      />
                    ),
                  ),
              )}
            </div>
            {/* Contenido principal */}
            <div className="relative font-sonori flex flex-col items-center gap-4 z-10 bg-orange-600/30 p-6 rounded-3xl shadow-lg mx-4">
              <h1 className="text-8xl uppercase  text-center text-[var(--color-principal)]">
                Menú
              </h1>
              <p className="text-center text-[var(--color-blanco)] uppercase text-3xl font-medium italic drop-shadow-sm">
                Descubre nuestros deliciosos platillos y bebidas
              </p>
              <button
                className="bg-[var(--color-principal)] text-2xl text-black px-4 py-2 rounded shadow hover:bg-[var(--color-principalHover)] transition-all"
                onClick={handleScrollPrimerCategoria}
              >
                VER MENÚ{" "}
                <FaArrowDown className="inline-block ml-2 animate-bounce" />
              </button>
              {isAdmin && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setMostrarModal(true)}
                    className="flex items-center gap-2 bg-[var(--color-promocion)] text-[var(--color-blanco)] px-6 py-2 rounded shadow hover:bg-[var(--color-promocionHover)] transition-all"
                  >
                    <FaPlus /> Agregar Platillo
                  </button>
                </div>
              )}
              {isAdmin && (
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    className={`px-4 py-2 rounded bg-[var(--color-navBar)] text-[var(--color-blanco)]`}
                    onClick={() => {
                      setOrdenTemporal([...categoriasDb]);
                      setModalOrden({
                        abierto: true,
                        tipo: "categorias",
                        categoria: null,
                      });
                    }}
                  >
                    Ordenar categorías
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-[var(--color-secundario)] hover:bg-[var(--color-secundarioHover)] text-[var(--color-negro)]"
                    onClick={() => {
                      setModalOrden({
                        abierto: true,
                        tipo: "subcategorias",
                        categoria: categoriasDb[0],
                      });
                      setOrdenTemporal(
                        subcategoriasDb
                          .filter((s) => s.categoria === categoriasDb[0])
                          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                          .map((s) => s.nombre),
                      );
                    }}
                  >
                    Ordenar subcategorías
                  </button>
                  <button
                    className={`px-4 py-2 rounded bg-[var(--color-principal)] hover:bg-[var(--color-principalHover)] text-[var(--color-negro)]`}
                    onClick={() => {
                      // Puedes pedir primero seleccionar la categoría o mostrar un select en el modal
                      setModalOrden({
                        abierto: true,
                        tipo: "platillos",
                        categoria: categoriasDb[0],
                      });
                      setOrdenTemporal([...(menu[categoriasDb[0]] || [])]);
                    }}
                  >
                    Ordenar platillos
                  </button>
                </div>
              )}
            </div>
          </article>

          {rol !== "admin" &&
            rol !== "caja" &&
            (!auth.currentUser ? (
              <div
                ref={destacadoRef}
                className="relative font-sonori flex flex-col items-center justify-center py-8 px-4 overflow-hidden shadow-lg z-20 bg-gradient-to-br from-[var(--color-principal)] via-[var(--color-negro)] to-[var(--color-principal)] border-b-2 border-[var(--color-principal)]"
              >
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-[var(--color-negro)] rounded-full opacity-20 blur-2xl"></div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[var(--color-negro)] rounded-full opacity-20 blur-2xl"></div>
                <div className="relative flex flex-col items-center z-10">
                  <img
                    src={icon}
                    alt="Sonori Icon"
                    className="w-24 h-24 my-2 drop-shadow-2xl animate-bounce"
                  />
                  <h2 className="text-4xl uppercase text-[var(--color-blanco)] mb-2 text-center drop-shadow">
                    ¡Obtén tu Tarjeta para clientes VIP!
                  </h2>
                  <p className="text-[var(--color-blanco)] tracking-tight uppercase text-xl mb-4 text-center max-w-xl">
                    Regístrate en segundos y empieza a ganar{" "}
                    <span className=" text-[var(--color-principal)]">
                      dinero electrónico
                    </span>{" "}
                    por cada visita.
                    <br />
                    <span className="text-[var(--color-principal)] ">
                      ¡Canjea descuentos y productos GRATIS!
                    </span>
                  </p>
                  <Link
                    to="/login"
                    onClick={() => window.scrollTo(0, 0)}
                    className="flex uppercase gap-2 items-center bg-gradient-to-r from-[var(--color-principal)] to-[var(--color-secundario)] hover:from-[var(--color-secundario)] hover:to-[var(--color-principalHover)] text-[var(--color-negro)]  py-3 px-6 rounded-full shadow-lg transition-all animate-pulse hover:animate-none text-2xl mt-2"
                  >
                    ¡Regístrate aquí! <GiClick size={30} />
                  </Link>
                  <p className="mt-3 text-xl text-[var(--color-blanco)] text-center tracking-tight bg-black/40 shadow-xl rounded-3xl px-4 pt-2 pb-1">
                    Solo necesitas tu número de teléfono o correo y en menos de
                    1 minuto tendrás tu tarjeta digital lista.
                    <br />
                    <span className="inline-flex items-center gap-1 text-[var(--color-principal)]">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Sin costo, sin complicaciones.
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div
                ref={destacadoRef}
                className="relative font-sonori flex flex-col items-center justify-center py-6 px-4 overflow-hidden shadow-lg z-10 bg-gradient-to-br from-[var(--color-principal)] via-[var(--color-negro)] to-[var(--color-principal)] border-b-2 border-[var(--color-principal)]"
              >
                <div className="absolute -top-8 -left-8 w-24 h-24 bg-[var(--color-secundario)] rounded-full opacity-30 blur-2xl"></div>
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[var(--color-secundario)] rounded-full opacity-20 blur-2xl"></div>
                <div className="flex flex-col items-center z-10">
                  <img
                    src={icon}
                    alt="Sonori Icon"
                    className="w-24 h-24 my-2 drop-shadow-2xl animate-bounce"
                  />
                  <h2 className="text-4xl text-white uppercase mb-2 text-center drop-shadow">
                    ¡No olvides registrar tu visita!
                  </h2>
                  <p className="text-[var(--color-blanco)] text-xl uppercase font-medium mb-2 text-center max-w-xs">
                    Recuerda registrar tu visita para acumular{" "}
                    <span className=" text-[var(--color-principal)]">
                      dinero electrónico
                    </span>{" "}
                    y pagar parte de tus compras.
                  </p>
                  <Link
                    to="/tarjeta"
                    onClick={() => window.scrollTo(0, 0)}
                    className="flex gap-2 items-center uppercase mb-4 bg-gradient-to-r from-[var(--color-principal)] to-[var(--color-secundario)] hover:from-[var(--color-secundario)] hover:to-[var(--color-principalHover)] text-[var(--color-negro)] py-3 px-8 rounded-full animate-pulse shadow-lg transition-all text-2xl mt-2"
                  >
                    Ir a mi tarjeta <GiClick />
                  </Link>
                  <span className="text-xl text-[var(--color-blanco)] text-center bg-black/40 shadow-xl rounded-full px-4 py-2 mb-8">
                    ¡Sigue acumulando puntos y disfruta tus beneficios!
                  </span>
                </div>
              </div>
            ))}

          <article className="relative flex flex-col items-center">
            {categoriasDb.map((cat) => (
              <div
                key={cat}
                ref={categoriaRefs.current[cat]}
                id={`cat-${cat.replace(/\s+/g, "-")}`}
                className="categoria-menu flex flex-col w-full items-center relative py-6"
              >
                {/* Overlay para legibilidad */}
                <div className="w-full h-full absolute inset-0 bg-white/10 pointer-events-none" />

                <div className="w-full overflow-x-hidden flex justify-center z-20">
                  <div
                    className="absolute -top-6 left-0 w-full"
                    style={{
                      width: "99.8%",
                      height: "52px",
                      background:
                        "linear-gradient(90deg, #F6E71D 30%, #181818 100%)",
                      borderRadius: "0px",
                      boxShadow: "0 2px 8px 0 rgba(255,152,0,0.15)",
                      transform: "rotate(-1.5deg)",
                    }}
                  />
                </div>
                <div className="relative font-sonori w-full flex flex-col items-center py-14 z-10">
                  <h2 className="text-6xl tracking-normal text-center text-[var(--color-principal)] uppercase">
                    {cat}
                  </h2>
                  {/* Descripción de la categoría */}
                  <div className="text-center text-gray-100 px-4 mb-4 text-2xl/6 uppercase max-w-xl">
                    {
                      (categoriasInfo.find((c) => c.nombre === cat) || {})
                        .descripcion
                    }
                  </div>
                  <div className="flex flex-col items-center gap-2 w-full">
                    {/* Agrupar platillos por subcategoría */}
                    {(() => {
                      const platillos = menu[cat] || [];
                      // Agrupa por subcategoría
                      const subcats = {};
                      platillos.forEach((item) => {
                        const key = item.subcategoria || "Sin subcategoría";
                        if (!subcats[key]) subcats[key] = [];
                        subcats[key].push(item);
                      });
                      // Ordena subcategorías según subcategoriasDb
                      const ordenSubcats = subcategoriasDb
                        .filter((s) => s.categoria === cat)
                        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                        .map((s) => s.nombre);

                      // Si hay platillos sin subcategoría y no está en la lista, agrégalo
                      const tieneSinSub = (menu[cat] || []).some(
                        (p) => !p.subcategoria,
                      );
                      if (
                        tieneSinSub &&
                        !ordenSubcats.includes("Sin subcategoría")
                      ) {
                        ordenSubcats.push("Sin subcategoría");
                      }
                      const allSubcats = ordenSubcats;
                      return allSubcats.map((subcat) => (
                        <div
                          key={subcat}
                          className="w-full flex flex-col items-center"
                        >
                          {subcat !== "Sin subcategoría" && (
                            <div className="w-auto text-center sticky top-[120px] mb-2 z-10">
                              <div
                                id={`subcat-${cat
                                  .replace(/\s+/g, "-")
                                  .toLowerCase()}-${subcat
                                  .replace(/\s+/g, "-")
                                  .toLowerCase()}`}
                                className="text-4xl text-[var(--color-secundario)] px-3 py-1 rounded bg-orange-600 uppercase"
                              >
                                {subcat}
                              </div>
                              <div className="text-xl/5 backdrop-blur-sm uppercase text-gray-100 mb-2">
                                {
                                  (
                                    subcategoriasDb.find(
                                      (s) =>
                                        s.nombre === subcat &&
                                        s.categoria === cat,
                                    ) || {}
                                  ).descripcion
                                }
                              </div>
                            </div>
                          )}
                          {(subcats[subcat] || []).map((item) => (
                            <div
                              key={item.id}
                              className={`flex flex-col items-end w-[85vw] max-w-md border-dotted border-[var(--color-principal)] sm:px-4 mt-2 py-1 ${item.nombre === "bonelles" ? "border-b-0" : "border-b-2"}`}
                            >
                              <div className="flex flex-col items-center w-full">
                                {item.imagen && (
                                  <>
                                    <img
                                      src={item.imagen}
                                      alt={item.alt || item.nombre}
                                      className="w-full h-full object-cover rounded-2xl mb-4 cursor-pointer transition hover:scale-105"
                                      onClick={() => {
                                        setLightboxImg(item.imagen);
                                        setLightboxOpen(true);
                                      }}
                                      title="Haz clic para ampliar"
                                    />
                                    <Lightbox
                                      open={
                                        lightboxOpen &&
                                        lightboxImg === item.imagen
                                      }
                                      close={() => setLightboxOpen(false)}
                                      slides={[{ src: lightboxImg }]}
                                      plugins={[]} // Esto desactiva cualquier plugin de navegación
                                      controller={{
                                        closeOnBackdropClick: true,
                                        closeOnPullDown: true,
                                        closeOnEsc: true,
                                        navigation: false,
                                        pagination: false,
                                      }}
                                    />
                                  </>
                                )}
                                <div className="flex relative justify-between items-end w-full">
                                  <div className="flex-1 w-full text-left">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="uppercase text-[var(--color-principal)] text-4xl/7">
                                        {item.nombre}
                                      </div>
                                      <div className="flex text-orange-500 text-3xl tracking-wide justify-end items-end gap-1">
                                        {/* Precios especiales para Alitas */}
                                        {item.nombre.toLowerCase() ===
                                        "alitas" ? (
                                          <div className="flex flex-col text-right">
                                            <span className="text-white text-2xl">
                                              *300 gr{" "}
                                              <span className="text-[var(--color-principal)]">
                                                ${180}
                                              </span>
                                            </span>
                                            <span className="text-white text-2xl">
                                              *1/2 kilo{" "}
                                              <span className="text-[var(--color-principal)]">
                                                ${225}
                                              </span>
                                            </span>
                                          </div>
                                        ) : item.estado === "promocion" ? (
                                          <>
                                            <span className="text-lg line-through text-white">
                                              ${item.precio}
                                            </span>
                                            <span className="text-[var(--color-promocion)] font-bold">
                                              ${item.precioPromo}
                                            </span>
                                          </>
                                        ) : item.estado === "nuevo" ? (
                                          <span className="text-[var(--color-loNuevo)]">
                                            ${item.precio}
                                          </span>
                                        ) : item.nombre === "Spicy" ? (
                                          <span>
                                            <span className="text-xl">+</span> $
                                            {item.precio}
                                          </span>
                                        ) : item.nombre ===
                                          "Yakimeshi especial" ? (
                                          <span>
                                            <span className="text-xl">+</span> $
                                            {item.precio}
                                          </span>
                                        ) : (
                                          <span>${item.precio}</span>
                                        )}
                                      </div>
                                    </div>
                                    {/* Descripción especial para Alitas y Boneless */}
                                    {cat === "Charolas" && item.descripcion ? (
                                      <ul className="text-white uppercase text-2xl/6 text-pretty list-disc pl-4">
                                        {item.descripcion
                                          .split("\n")
                                          .filter((line) => line.trim() !== "")
                                          .map((line, idx) => (
                                            <li key={idx}>
                                              {line.replace(/^- /, "")}
                                            </li>
                                          ))}
                                      </ul>
                                    ) : (
                                      <div className="text-white uppercase text-2xl/6 text-pretty mb-2">
                                        {item.descripcion}
                                      </div>
                                    )}
                                    {/* Salsas para Alitas y Boneless */}
                                    {(item.nombre.toLowerCase() === "alitas" ||
                                      item.nombre.toLowerCase() ===
                                        "boneless") && (
                                      <div className="mt-4">
                                        <div className="text-[var(--color-principal)] text-xl uppercase">
                                          Salsas disponibles:
                                        </div>
                                        <div className="text-white text-xl/5 uppercase">
                                          *Buffalo *BBQ *Miel Picante *Chiltepín
                                          Habanero *BBQ Spicy *Mango Habanero
                                          *Chipotle *Parmesano *Sonori Spicy
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    className={`absolute ${
                                      item.imagen
                                        ? "-top-12 -right-1"
                                        : "-top-6 -right-2"
                                    }`}
                                  >
                                    {item.estado === "promocion" && (
                                      <span className="bg-[var(--color-promocion)] text-white text-xs font-bold px-2 py-1 rounded-full mr-2">
                                        Promoción
                                      </span>
                                    )}
                                    {item.estado === "nuevo" && (
                                      <span className="bg-[var(--color-loNuevo)] text-white text-xs font-bold px-2 py-1 rounded-full mr-2">
                                        Lo Nuevo
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {rol === "admin" && (
                                <div className="flex flex-row gap-2 pt-2 w-full justify-end">
                                  <button
                                    className="bg-[var(--color-principal)] hover:bg-[var(--color-principalHover)] text-black px-3 py-1 rounded transition text-sm"
                                    onClick={() =>
                                      handleEditarPlatillo(item.id, item)
                                    }
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="bg-[var(--color-secundario)] hover:bg-[var(--color-secundarioHover)] text-black px-3 py-1 rounded transition text-sm"
                                    onClick={() =>
                                      handleEliminarPlatillo(item.id)
                                    }
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                {cat === "Sushi" && (
                  <div className="sticky bottom-0 left-0 w-full z-20 flex justify-center pointer-events-none">
                    <div className="pointer-events-auto bg-black/95 border-t-1 border-orange-600 shadow-2xl rounded-t-xl pb-2 max-w-xl w-full flex flex-col items-center gap-2">
                      <div className="text-3xl w-full rounded-t-lg font-sonori tracking-wide text-[var(--color-blanco)] bg-orange-600 p-[1px] text-center">
                        ¡CONVIERTELO EN COMBO!
                      </div>
                      <div className="flex flex-row gap-1 justify-center items-center font-sonori w-full">
                        <div className="text-center px-4 text-xl/5 text-white">
                          AGREGA TERIYAKI POR SOLO $80
                        </div>
                        <div className="border-l-2 border-gray-300 h-10"></div>
                        <div className="text-center px-4 text-xl/5 text-white">
                          AGREGA BONELESS POR SOLO $90
                        </div>
                      </div>
                      <div className="text-sm/4 text-white px-8 -mt-2 text-center">
                        *TODOS NUESTROS ROLLOS LLEVAN SALSA ANGUILA Y AJONJOLÍ
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            ;
          </article>
          {/* Sección de Ubicación y Contacto */}
          <div
            id="ubicacion-contacto"
            className="relative w-full flex justify-center"
          >
            <div
              className="absolute -top-6 left-0 w-full"
              style={{
                width: "99.8%",
                height: "52px",
                background: "linear-gradient(90deg, #F6E71D 30%, #181818 100%)",
                borderRadius: "0px",
                boxShadow: "0 2px 8px 0 rgba(255,152,0,0.15)",
                transform: "rotate(-1.5deg)",
              }}
            />
          </div>
          <section className="max-w-2xl mx-auto pt-20 pb-8 bg-[var(--color-fondo)] font-sonori rounded p-6 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <h2 className="text-6xl text-center sm:text-left tracking-wide text-[var(--color-principal)] mb-4 uppercase">
                Ubicación
              </h2>
              <div className="rounded overflow-hidden shadow mb-2">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.3668066982063!2d-114.77907300000001!3d32.4628794!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d64ffcac15d76f%3A0x88a9f81f8f4cb511!2sSonori%20Restaurant!5e0!3m2!1ses-419!2smx!4v1762371873627!5m2!1ses-419!2smx"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <p className="text-white text-center uppercase px-2 text-2xl/6">
                Av. Tamaulipas y Calle 9, 83440 San Luis Río Colorado, Son.
              </p>
            </div>
            <div className="flex-1">
              <h2 className="text-6xl text-center sm:text-left tracking-wide text-[var(--color-principal)] mb-4 uppercase">
                Contacto
              </h2>
              <ul className="text-white text-3xl/6 space-y-4">
                <li>
                  <span className="">TELÉFONO:</span>{" "}
                  <a href="tel:+526536908010" className="underline">
                    653 690 8010
                  </a>
                </li>
                {/* <li>
                  <span className="">WhatsApp:</span> +52 653 123 4567
                </li>
                <li>
                  <span className="">Correo:</span>{" "}
                  contacto@sonorirestaurant.com
                </li> */}
                <li className="flex flex-col items-center md:items-start gap-2 font-sonori">
                  <span className="uppercase text-4xl tracking-wide text-[var(--color-principal)]">
                    Horario:
                  </span>
                  <div className="flex flex-col justify-center items-center md:items-start gap-0 text-2xl">
                    <span className="text-3xl">TODOS LOS DÍAS</span>
                    <span>LUN-JUE: 12:00PM - 10:00PM</span>
                    <span>VIE-SÁB: 12:00PM - 11:00PM</span>
                    <span>DOM: 1:00PM - 9:00PM</span>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <Footer />
        </div>
      )}
    </div>
  );
}

export default MenuDemo;
