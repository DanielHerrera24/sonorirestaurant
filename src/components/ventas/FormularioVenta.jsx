import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  serverTimestamp,
  getDocs,
  setDoc,
  doc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { FiPlus, FiMinus, FiShoppingCart } from "react-icons/fi";
import { AiFillDollarCircle } from "react-icons/ai";
import toast, { Toaster } from "react-hot-toast";
import RegistrarVisita from "../RegistrarVisita"; // Ajusta la ruta si es necesario
import { FaClipboardList, FaTimes } from "react-icons/fa";
import { IoIosArrowBack, IoIosArrowDown } from "react-icons/io";
import CanjearRecompensas from "../CanjearRecompensas";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import campana from "../../assets/sonidos/campana 1.mp3";

export default function FormularioVenta() {
  const [catalogo, setCatalogo] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [propina, setPropina] = useState(0);
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarModalPuntos, setMostrarModalPuntos] = useState(false);
  const [puntosUsados, setPuntosUsados] = useState(0);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [descuentoEmpleado, setDescuentoEmpleado] = useState(false);
  const [tipoCambio, setTipoCambio] = useState(null);
  const [pagoMXN, setPagoMXN] = useState("");
  const [pagoUSD, setPagoUSD] = useState("");
  const [pagoTarjeta, setPagoTarjeta] = useState("");
  const [pagoTransferencia, setPagoTransferencia] = useState("");
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [canjeAplicado, setCanjeAplicado] = useState(null);
  const [tabPuntos, setTabPuntos] = useState("visita"); // "visita" o "canje"
  const registrarVisitaRef = useRef(null);
  const canjearRef = useRef(null);
  const [mostrarNotas, setMostrarNotas] = useState(false);
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [nombrePedidoPendiente, setNombrePedidoPendiente] = useState("");
  const [mostrarModalPendiente, setMostrarModalPendiente] = useState(false);
  const [idPedidoPendienteEditando, setIdPedidoPendienteEditando] =
    useState(null);
  const [mostrarNavPendientes, setMostrarNavPendientes] = useState(false);
  const [subcategoriaFiltro, setSubcategoriaFiltro] = useState("");
  const [comboTeriyaki, setComboTeriyaki] = useState(false);
  const [comboBonelles, setComboBonelles] = useState(false);
  const [mesas, setMesas] = useState([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState("");
  const [modoPendiente, setModoPendiente] = useState("mesa");
  const [productosOriginales, setProductosOriginales] = useState([]);

  const prevPedidosRef = useRef([]);
  const audioCambioRef = useRef(null);

  useEffect(() => {
    audioCambioRef.current = new Audio(campana);
    audioCambioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    const cargarMesas = async () => {
      const q = query(collection(db, "mesas"));
      const snap = await getDocs(q);
      setMesas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    cargarMesas();
  }, []);

  const normaliza = (texto) =>
    (texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const platillosFiltrados = catalogo
    .filter((p) => {
      const coincideCategoria = categoriaFiltro
        ? p.categoria === categoriaFiltro
        : true;
      const coincideSubcategoria =
        categoriaFiltro && subcategoriaFiltro
          ? p.subcategoria === subcategoriaFiltro
          : true;
      const coincideBusqueda =
        busqueda && busqueda.trim().length > 0
          ? normaliza(
              (p.nombre || "") +
                " " +
                (p.categoria || "") +
                " " +
                (p.subcategoria || ""),
            ).includes(normaliza(busqueda))
          : true;
      return coincideCategoria && coincideSubcategoria && coincideBusqueda;
    })
    .sort((a, b) => normaliza(a.nombre).localeCompare(normaliza(b.nombre)));

  const productosAgregados = productos.filter((p) => p.cantidad > 0);

  const haySushi = productosAgregados.some((p) => p.categoria === "Sushi");
  const teriyaki = productosAgregados.find((p) => p.categoria === "Teriyaki");
  const bonelles = productosAgregados.find(
    (p) =>
      p.categoria === "Botanas" && normaliza(p.nombre).includes("bonelles"),
  );
  const puedeComboTeriyaki = haySushi && teriyaki;
  const puedeComboBonelles = haySushi && bonelles;

  useEffect(() => {
    if (!puedeComboTeriyaki) setComboTeriyaki(false);
    if (!puedeComboBonelles) setComboBonelles(false);
  }, [puedeComboTeriyaki, puedeComboBonelles]);

  useEffect(() => {
    const fetchPlatillos = async () => {
      const snapshot = await getDocs(collection(db, "platillos"));
      let datos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      datos = datos.sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || ""),
      );
      setCatalogo(datos);
      setProductos(datos.map((p) => ({ ...p, cantidad: 0 })));
      const cats = Array.from(
        new Set(datos.map((p) => p.categoria).filter(Boolean)),
      );
      setCategorias(cats);
    };
    // Cambia aquí: lee pendientes desde ventas
    const fetchPedidosPendientes = async () => {
      const q = query(
        collection(db, "ventas"),
        where("estado", "in", [
          "pendiente",
          "en cocina",
          "cocinando",
          "servida",
        ]),
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pedidos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Detectar cambio de pendiente a servida
        const prevPendientes = prevPedidosRef.current.filter(
          (p) => p.estado === "pendiente",
        );
        const nuevosServidos = pedidos.filter(
          (p) =>
            p.estado === "servida" &&
            prevPendientes.some((prev) => prev.id === p.id),
        );
        if (nuevosServidos.length > 0) {
          try {
            audioCambioRef.current.currentTime = 0;
            const playPromise = audioCambioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {});
            }
          } catch (err) {
            // Silenciar error
          }
        }

        prevPedidosRef.current = pedidos;
        setPedidosPendientes(pedidos);
      });
      return () => unsubscribe();
    };
    fetchPlatillos();
    fetchPedidosPendientes();
  }, []);

  useEffect(() => {
    // Leer tipo de cambio de Firestore
    const fetchTipoCambio = async () => {
      const docRef = doc(db, "configuracion", "tipoCambio");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTipoCambio(Number(docSnap.data().valor) || null);
      }
    };
    fetchTipoCambio();
  }, []);

  useEffect(() => {
    // Si no hay productos agregados, asegúrate de limpiar el modo edición de pendiente
    if (productos.every((p) => p.cantidad === 0) && idPedidoPendienteEditando) {
      setIdPedidoPendienteEditando(null);
    }
  }, [productos]);

  const handleSumar = (id) => {
    setProductos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              cantidad: (p.cantidad || 0) + 1,
              seleccionadoEn: p.cantidad > 0 ? p.seleccionadoEn : Date.now(),
            }
          : p,
      ),
    );
  };

  const handleRestar = (id) => {
    setProductos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, cantidad: Math.max(0, (p.cantidad || 0) - 1) }
          : p,
      ),
    );
  };

  const registrarVenta = async (e) => {
    e.preventDefault();
    setLoading(true);
    const productosVendidos = productos
      .filter((p) => p.cantidad > 0)
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precioUnitario:
          p.estado === "promocion" && p.precioPromo
            ? Number(p.precioPromo)
            : Number(p.precio),
      }));
    try {
      // Genera ID basado en fecha y hora: YYYYMMDDHHmmss
      const now = new Date();
      const idFecha = now
        .toISOString()
        .replace(/[-:T.Z]/g, "")
        .slice(0, 14); // YYYYMMDDHHMMSS
      await setDoc(doc(db, "ventas", idFecha), {
        productos: productosVendidos,
        totalOriginal: totalSinDescuento,
        total,
        propina: Number(propina),
        notas,
        fecha: serverTimestamp(),
        fechaTexto: dayjs().format("YYYY-MM-DD"),
        puntosUsados: Number(puntosUsados) || 0,
        descuentoEmpleado,
        tipoPago: tipoPagoTexto,
        desglosePago,
        canjeRecompensa: canjeAplicado ? { ...canjeAplicado } : null, // <-- Guarda el canje de recompensa si existe
      });
      toast.success("Venta registrada correctamente.");
      if (idPedidoPendienteEditando) {
        await setDoc(
          doc(db, "ventas", idPedidoPendienteEditando),
          { estado: "servida" },
          { merge: true },
        );
        setPedidosPendientes(
          pedidosPendientes.filter((p) => p.id !== idPedidoPendienteEditando),
        );
        setIdPedidoPendienteEditando(null);
      }
      setProductos(catalogo.map((p) => ({ ...p, cantidad: 0 })));
      setPropina(0);
      setNotas("");
      setCanjeAplicado(null);
      setPagoMXN("");
      setPagoUSD("");
      setPagoTarjeta("");
      setPagoTransferencia("");
    } catch (err) {
      toast.error("Error al registrar la venta.");
      console.error("Error al registrar la venta:", err);
    }
    setLoading(false);
  };

  const totalSinDescuento =
    productos.reduce((acc, p) => {
      // Combo Sushi + Teriyaki
      if (
        comboTeriyaki &&
        p.categoria === "Teriyaki" &&
        productos.find((x) => x.categoria === "Sushi" && x.cantidad > 0) &&
        p.cantidad > 0
      ) {
        return acc + 80 * p.cantidad;
      }
      // Combo Sushi + Bonelles
      if (
        comboBonelles &&
        p.categoria === "Botanas" &&
        normaliza(p.nombre).includes("bonelles") &&
        productos.find((x) => x.categoria === "Sushi" && x.cantidad > 0) &&
        p.cantidad > 0
      ) {
        return acc + 90 * p.cantidad;
      }
      // Normal
      const precio =
        p.estado === "promocion" && p.precioPromo
          ? Number(p.precioPromo) || 0
          : Number(p.precio) || 0;
      return acc + precio * p.cantidad;
    }, 0) + (Number(propina) || 0);

  const totalConDescuento = descuentoEmpleado
    ? totalSinDescuento * 0.8
    : totalSinDescuento;

  let total = totalConDescuento - (Number(puntosUsados) || 0);

  if (canjeAplicado?.tipo === "descuentoGeneral") {
    if (canjeAplicado.esPorcentaje) {
      total = totalSinDescuento * (1 - canjeAplicado.descuento / 100);
    } else {
      total = totalSinDescuento - canjeAplicado.descuento;
    }
    total -= Number(puntosUsados) || 0;
    if (total < 0) total = 0;
  }

  const pagoTarjetaNum = Number(pagoTarjeta) || 0;
  const pagoTransferenciaNum = Number(pagoTransferencia) || 0;
  const pagoEfectivoMXN = Number(pagoMXN) || 0;
  const pagoEfectivoUSD = Number(pagoUSD) || 0;
  const pagoEfectivoUSDEnMXN = pagoEfectivoUSD * (tipoCambio || 0);

  // Suma total pagada en MXN (incluyendo USD convertido)
  const pagoTotalEnMXN =
    pagoEfectivoMXN +
    pagoEfectivoUSDEnMXN +
    pagoTarjetaNum +
    pagoTransferenciaNum;

  const faltanteDespuesDeNoEfectivo = Math.max(
    total - pagoTarjetaNum - pagoTransferenciaNum,
    0,
  );
  const efectivoAplicadoMXN = Math.min(
    pagoEfectivoMXN + pagoEfectivoUSDEnMXN,
    faltanteDespuesDeNoEfectivo,
  );
  const tiposPagoSeleccionados = [
    pagoEfectivoMXN > 0 || pagoEfectivoUSD > 0 ? "efectivo" : null,
    pagoTarjetaNum > 0 ? "tarjeta" : null,
    pagoTransferenciaNum > 0 ? "transferencia" : null,
  ].filter(Boolean);
  const tipoPagoTexto = tiposPagoSeleccionados.join(", ") || "sin especificar";

  // Cambio total en MXN
  const cambioTotalMXN = pagoTotalEnMXN - total;

  // Cambio total en USD (si hay tipo de cambio)
  const cambioTotalUSD = tipoCambio ? cambioTotalMXN / tipoCambio : 0;

  const desglosePago = {
    efectivoMXN: pagoEfectivoMXN,
    efectivoUSD: pagoEfectivoUSD,
    efectivoUSDEnMXN: pagoEfectivoUSDEnMXN,
    efectivoAplicadoMXN,
    tarjeta: pagoTarjetaNum,
    transferencia: pagoTransferenciaNum,
    totalRecibidoMXN: pagoTotalEnMXN,
    cambioMXN: Math.max(cambioTotalMXN, 0),
    faltaMXN: cambioTotalMXN < 0 ? Math.abs(cambioTotalMXN) : 0,
  };

  const aplicarCanje = (tipoCanje, datosCanje) => {
    if (tipoCanje === "productoGratis") {
      setProductos((prev) => [
        ...prev,
        {
          id: "gratis-" + Date.now(),
          nombre: datosCanje.producto,
          cantidad: 1,
          precio: 0,
          estado: "gratis",
        },
      ]);
      setCanjeAplicado({
        tipo: "productoGratis",
        nombre: `${datosCanje.producto}`,
        producto: datosCanje.producto,
      });
      toast.success("Producto gratis agregado al carrito.");
    }
    if (tipoCanje === "descuentoGeneral") {
      setCanjeAplicado({
        tipo: "descuentoGeneral",
        nombre: `Descuento general ${datosCanje.descuentoGeneral}%`,
        descuento: Number(datosCanje.descuentoGeneral),
        esPorcentaje: Number(datosCanje.descuentoGeneral) <= 100,
      });
      toast.success("Descuento general aplicado.");
    }
  };

  const cerrarModalPuntos = async () => {
    try {
      if (tabPuntos === "visita") {
        if (
          registrarVisitaRef.current &&
          typeof registrarVisitaRef.current.stopScanner === "function"
        ) {
          await registrarVisitaRef.current.stopScanner();
        }
      } else if (tabPuntos === "canje") {
        if (
          canjearRef.current &&
          typeof canjearRef.current.stopScanner === "function"
        ) {
          await canjearRef.current.stopScanner();
        }
      } else {
        if (
          registrarVisitaRef.current &&
          typeof registrarVisitaRef.current.stopScanner === "function"
        ) {
          await registrarVisitaRef.current.stopScanner();
        }
        if (
          canjearRef.current &&
          typeof canjearRef.current.stopScanner === "function"
        ) {
          await canjearRef.current.stopScanner();
        }
      }
    } catch (err) {
      console.error("Error deteniendo scanner desde padre:", err);
    } finally {
      setMostrarModalPuntos(false);
      setTabPuntos("visita");
    }
  };

  // Agrupa subcategorías por categoría
  const subcategoriasPorCategoria = useMemo(() => {
    const mapa = {};
    catalogo.forEach((p) => {
      if (p.categoria && p.subcategoria) {
        if (!mapa[p.categoria]) mapa[p.categoria] = new Set();
        mapa[p.categoria].add(p.subcategoria);
      }
    });
    // Convierte los sets a arrays
    Object.keys(mapa).forEach((cat) => {
      mapa[cat] = Array.from(mapa[cat]);
    });
    return mapa;
  }, [catalogo]);

  const platillosPorCategoria = useMemo(() => {
    const grupos = {};
    platillosFiltrados.forEach((p) => {
      const cat = p.categoria || "Sin categoría";
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(p);
    });
    return grupos;
  }, [platillosFiltrados]);

  const guardarPedidoPendiente = async () => {
    // Validación según el modo
    if (
      (modoPendiente === "nombre" && !nombrePedidoPendiente) ||
      (modoPendiente === "mesa" && !mesaSeleccionada) ||
      productosAgregados.length === 0
    ) {
      toast.error("Faltan datos para guardar el pedido pendiente");
      return;
    }
    setLoading(true);
    try {
      // Genera ID basado en fecha y hora: YYYYMMDDHHmmss
      const now = new Date();
      const idFecha = now
        .toISOString()
        .replace(/[-:T.Z]/g, "")
        .slice(0, 14); // YYYYMMDDHHMMSS

      await setDoc(doc(db, "ventas", idFecha), {
        nombre:
          modoPendiente === "mesa"
            ? `Mesa ${mesaSeleccionada}`
            : nombrePedidoPendiente,
        mesa: modoPendiente === "mesa" ? mesaSeleccionada : "",
        productos: productosAgregados.map((p) => ({ ...p })),
        notas,
        descuentoEmpleado,
        canjeAplicado,
        propina: Number(propina),
        fecha: serverTimestamp(),
        fechaTexto: dayjs().format("YYYY-MM-DD"),
        estado: "pendiente",
        total,
      });

      setProductos(productos.map((p) => ({ ...p, cantidad: 0 })));
      setNotas("");
      setNombrePedidoPendiente("");
      setMesaSeleccionada("");
      setCanjeAplicado(null);
      setDescuentoEmpleado(false);
      setPropina(0);
      setCarritoAbierto(false);
      setMostrarModalPendiente(false);
      setIdPedidoPendienteEditando(null);
      setModoPendiente("mesa");
      toast.success("Pedido guardado como pendiente");
    } catch (err) {
      toast.error("Error al guardar el pedido pendiente");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <>
      {pedidosPendientes.length > 0 && (
        <button
          type="button"
          className="fixed top-24 right-6 z-30 bg-orange-400 hover:bg-orange-500 text-xl uppercase font-bold text-white rounded-full p-3 shadow-lg transition-all duration-300 sm:hidden"
          style={{ boxShadow: "0 4px 24px #0002" }}
          onClick={() => setMostrarNavPendientes((v) => !v)}
          aria-label="Mostrar pedidos pendientes"
        >
          {" "}
          Pendientes
        </button>
      )}
      <form
        className="bg-white rounded-xl shadow-lg p-2 flex flex-col gap-4 mx-auto w-full mb-52 mt-6 sm:mt-0"
        onSubmit={registrarVenta}
      >
        {pedidosPendientes.length > 0 && (
          <div
            className={`
      fixed top-[88px] sm:top-[128px] sm:left-30 w-full z-30 bg-black/90 border-b border-yellow-400 flex flex-col sm:flex-row items-center gap-2 px-4 py-2 overflow-x-auto shadow
      ${mostrarNavPendientes ? "" : "hidden"}
      sm:flex
    `}
            style={{
              transition: "transform 0.3s",
              transform: mostrarNavPendientes
                ? "translateY(0)"
                : "translateY(-100%)",
            }}
          >
            {/* Botón para cerrar la nav en móvil */}
            <button
              type="button"
              className="mr-auto fixed top-2 left-2 sm:hidden text-2xl bg-red-600 text-white rounded-full p-1 font-bold"
              onClick={() => setMostrarNavPendientes(false)}
              aria-label="Cerrar pedidos pendientes"
            >
              <FaTimes />
            </button>
            <span className="font-bold uppercase text-orange-500">
              Pedidos pendientes:
            </span>
            <div className="flex flex-wrap gap-2">
              {pedidosPendientes.map((pedido, idx) => (
                <div key={idx} className="relative flex items-center">
                  <button
                    type="button"
                    className={`text-white font-bold px-3 py-1 rounded-full shadow transition pr-8
                      ${
                        pedido.estado === "servida"
                          ? "bg-green-500 hover:bg-green-600"
                          : pedido.estado === "cocinando"
                            ? "bg-yellow-500 hover:bg-yellow-600"
                            : "bg-orange-500 hover:bg-orange-600"
                      }
                    `}
                    onClick={async () => {
                      setProductos(
                        productos.map((p) => {
                          const encontrado = pedido.productos.find(
                            (pp) => pp.id === p.id,
                          );
                          return encontrado
                            ? { ...p, cantidad: encontrado.cantidad }
                            : { ...p, cantidad: 0 };
                        }),
                      );
                      setProductosOriginales(
                        pedido.productos
                          ? pedido.productos.map((p) => ({ ...p }))
                          : [],
                      );
                      setNotas(pedido.notas || "");
                      setDescuentoEmpleado(pedido.descuentoEmpleado || false);
                      setCanjeAplicado(pedido.canjeAplicado || null);
                      setPropina(pedido.propina || 0);
                      setCarritoAbierto(true);
                      setIdPedidoPendienteEditando(pedido.id);
                      setMostrarNavPendientes(false);
                    }}
                  >
                    {pedido.nombre}
                  </button>
                  <button
                    type="button"
                    className="absolute right-0 top-[2px] text-white bg-red-500 hover:bg-red-600 rounded-full w-7 h-7 flex items-center justify-center text-xs"
                    title="Eliminar pendiente"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const confirm = await Swal.fire({
                        title: "¿Eliminar pedido pendiente?",
                        text: `¿Seguro que deseas eliminar "${pedido.nombre}"?`,
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonColor: "#d33",
                        cancelButtonColor: "#aaa",
                        confirmButtonText: "Sí, eliminar",
                        cancelButtonText: "Cancelar",
                      });
                      if (confirm.isConfirmed) {
                        await deleteDoc(
                          doc(db, "ventas", pedido.id), // Cambia aquí a ventas
                        );
                        setPedidosPendientes(
                          pedidosPendientes.filter((p) => p.id !== pedido.id),
                        );
                        setProductos(
                          productos.map((p) => ({ ...p, cantidad: 0 })),
                        );
                        setNotas("");
                        setCanjeAplicado(null);
                        setDescuentoEmpleado(false);
                        setPropina(0);
                        setIdPedidoPendienteEditando(null);
                        setCarritoAbierto(false); // Cierra el modal de productos agregados
                        toast.success("Pedido pendiente eliminado");
                      }
                    }}
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <Toaster position="top-center" />
        <h3
          className={`text-2xl font-bold text-orange-500 text-center mb-2 flex items-center justify-center gap-2 ${pedidosPendientes.length > 0 ? "pt-6 sm:pt-10" : ""}`}
        >
          <FiShoppingCart className="inline-block text-orange-500" size={28} />
          Registrar nueva venta
        </h3>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <select
            value={categoriaFiltro}
            onChange={(e) => {
              setCategoriaFiltro(e.target.value);
              setSubcategoriaFiltro(""); // Reinicia subcategoría al cambiar categoría
            }}
            className="border rounded px-3 py-2 text-base bg-gray-50 focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {/* Mostrar select de subcategoría solo si hay subcategorías para la categoría seleccionada */}
          {categoriaFiltro &&
            subcategoriasPorCategoria[categoriaFiltro] &&
            subcategoriasPorCategoria[categoriaFiltro].length > 0 && (
              <select
                value={subcategoriaFiltro}
                onChange={(e) => setSubcategoriaFiltro(e.target.value)}
                className="border rounded px-3 py-2 text-base bg-gray-50 focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Todas las subcategorías</option>
                {subcategoriasPorCategoria[categoriaFiltro].map((subcat) => (
                  <option key={subcat} value={subcat}>
                    {subcat}
                  </option>
                ))}
              </select>
            )}
          <input
            type="text"
            placeholder="🔍 Buscar platillo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="border rounded px-3 py-2 flex-1 text-base bg-gray-50 focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Lista de platillos separados por categoría */}
        <div>
          {catalogo.length === 0 ? (
            <span className="col-span-2 text-center text-gray-500">
              Cargando platillos...
            </span>
          ) : Object.keys(platillosPorCategoria).length === 0 ? (
            <span className="col-span-2 text-center text-gray-500">
              No hay platillos para mostrar.
            </span>
          ) : (
            Object.entries(platillosPorCategoria).map(([cat, platillos]) => (
              <div key={cat} className="mb-6">
                <h4 className="text-xl font-bold text-orange-600 mb-2">
                  {cat}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {platillos.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer relative"
                      onClick={() => handleSumar(p.id)}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold uppercase text-lg text-orange-500">
                          {p.nombre}
                        </span>
                        <span className="text-sm text-gray-500">
                          {p.categoria}
                        </span>
                        <span className="text-sm text-gray-500">
                          {p.subcategoria}
                        </span>
                        <span className="text-base mt-1">
                          {p.estado === "promocion" && p.precioPromo ? (
                            <>
                              <span className="line-through text-gray-400">
                                ${p.precio}
                              </span>
                              <span className="text-[var(--color-promocion)] font-bold ml-1">
                                ${p.precioPromo}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-800 font-bold">
                              ${p.precio}
                            </span>
                          )}
                        </span>
                      </div>
                      {/* Número de seleccionados, discreto */}
                      {productos.find((prod) => prod.id === p.id)?.cantidad >
                        0 && (
                        <span className="absolute top-2 right-2 bg-orange-200 text-orange-700 rounded-full px-2 py-1 text-xs font-bold shadow">
                          {productos.find((prod) => prod.id === p.id)?.cantidad}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sticky/fixed resumen, total y botón en el bottom */}
        {productosAgregados.length > 0 && (
          <div
            className={`
            fixed bottom-0 right-0 w-full sm:w-[320px] z-30
            bg-[var(--color-fondo)] border-t sm:border-l border-yellow-400 shadow-2xl
            flex flex-col max-w-2xl mx-auto
            h-[72vh] sm:h-[92%] 
            transition-transform duration-300 ease-in-out
            ${carritoAbierto ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"}
          `}
            style={{ willChange: "transform" }}
          >
            {/* Productos agregados con scroll */}
            <div className="flex-1 overflow-y-auto px-2 py-3">
              {/* Botón para cerrar */}
              <div className="flex items-end justify-between sm:justify-center w-full">
                <button
                  type="button"
                  onClick={() => setCarritoAbierto(false)}
                  className="sticky sm:fixed top-0 sm:top-2 left-0 sm:left-2 text-3xl bg-red-500 hover:bg-red-600 text-white rounded-full w-10 flex items-center justify-center z-50"
                  title="Cerrar carrito"
                >
                  <span className="sm:block hidden">
                    <IoIosArrowBack size={40} />
                  </span>
                  <span className="sm:hidden">
                    <IoIosArrowDown size={40} />
                  </span>
                </button>
                <div className="flex flex-col items-center gap-1">
                  {idPedidoPendienteEditando && (
                    <span
                      className="ml-2 text-orange-600 font-bold text-lg truncate"
                      title="Pedido pendiente"
                    >
                      Pedido:{" "}
                      {
                        pedidosPendientes.find(
                          (p) => p.id === idPedidoPendienteEditando,
                        )?.nombre
                      }
                    </span>
                  )}
                  {idPedidoPendienteEditando && (
                    <span className="text-black uppercase font-bold text-xs">
                      {(() => {
                        const pedido = pedidosPendientes.find(
                          (p) => p.id === idPedidoPendienteEditando,
                        );
                        if (pedido?.estado === "servida")
                          return (
                            <span className="bg-green-200 px-2 py-1 rounded-full">
                              Servido
                            </span>
                          );
                        if (pedido?.estado === "cocinando")
                          return (
                            <span className="bg-yellow-200 px-2 py-1 rounded-full">
                              Cocinando
                            </span>
                          );
                        if (pedido?.estado === "en cocina")
                          return (
                            <span className="bg-orange-200 px-2 py-1 rounded-full">
                              En cocina
                            </span>
                          );
                      })()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col text-md sm:pt-4">
                <span className="font-bold text-md text-orange-500 flex items-center gap-2 mb-1">
                  <FiShoppingCart className="inline-block" />
                  Productos agregados:
                </span>
                <ul className="ml-0 text-md flex flex-col gap-2">
                  {productosAgregados.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 bg-white rounded-lg px-2 py-1 shadow-sm"
                    >
                      <span className="font-semibold flex flex-col items-start text-orange-500">
                        {p.nombre}
                        <span className="text-xs text-gray-600 font-normal">
                          {p.categoria ? `${p.categoria}` : ""}
                          {p.subcategoria ? ` - ${p.subcategoria}` : ""}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRestar(p.id)}
                            className="bg-red-100 hover:bg-red-200 rounded-full p-1 transition"
                            aria-label="Restar"
                          >
                            <FiMinus size={24} />
                          </button>
                          <span className="font-bold text-lg w-6 text-center">
                            {p.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSumar(p.id)}
                            className="bg-green-100 hover:bg-green-200 rounded-full p-1 transition"
                            aria-label="Sumar"
                          >
                            <FiPlus size={24} />
                          </button>
                        </div>
                        <span className="text-gray-800 min-w-[40px] text-right">
                          $
                          {(p.estado === "promocion" && p.precioPromo
                            ? Number(p.precioPromo) || 0
                            : Number(p.precio) || 0) * p.cantidad}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {puedeComboTeriyaki && !comboTeriyaki && (
              <button
                type="button"
                className="bg-yellow-300 hover:bg-yellow-400 text-orange-900 font-bold px-3 py-1 rounded-full shadow transition mb-2"
                onClick={() => setComboTeriyaki(true)}
              >
                Aplicar combo Sushi + Teriyaki ($80)
              </button>
            )}
            {puedeComboBonelles && !comboBonelles && (
              <button
                type="button"
                className="bg-yellow-300 hover:bg-yellow-400 text-orange-900 font-bold px-3 py-1 rounded-full shadow transition mb-2"
                onClick={() => setComboBonelles(true)}
              >
                Aplicar combo Sushi + Bonelles ($90)
              </button>
            )}
            {(comboTeriyaki || comboBonelles) && (
              <div className="text-green-700 font-bold mb-2">
                Combo aplicado: {comboTeriyaki && "Sushi + Teriyaki ($80)"}
                {comboBonelles && "Sushi + Bonelles ($90)"}
              </div>
            )}

            {/* Resumen, notas y botones siempre visibles abajo */}
            <div className="flex flex-col gap-2 w-full bg-[var(--color-fondo)] p-2 flex-shrink-0 border-t border-yellow-300">
              {/* Notas */}
              <div className="flex flex-col gap-2 w-full mt-2">
                {!mostrarNotas && (
                  <button
                    type="button"
                    className="text-sm text-blue-600 underline w-fit self-start"
                    onClick={() => setMostrarNotas(true)}
                  >
                    Agregar notas
                  </button>
                )}
                {mostrarNotas && (
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">Notas</label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      className="border rounded px-2 py-1 bg-gray-50"
                      rows={2}
                      placeholder="Ej: Para llevar, leche sin lactosa..."
                    />
                    <button
                      type="button"
                      className="text-xs text-gray-500 underline mt-1 w-fit self-end"
                      onClick={() => setMostrarNotas(false)}
                    >
                      Ocultar notas
                    </button>
                  </div>
                )}
              </div>
              {/* Descuento empleado */}
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={descuentoEmpleado}
                  onChange={(e) => setDescuentoEmpleado(e.target.checked)}
                  className="accent-[var(--color-principal)] w-5 h-5"
                />
                <span className="font-semibold text-[var(--color-principal)]">
                  Descuento empleado (20%)
                </span>
              </label>
              {/* Total y botones */}
              <div className="font-bold text-xl text-[var(--color-principal)] flex flex-wrap justify-center items-center">
                {canjeAplicado?.tipo === "descuentoGeneral" && (
                  <span className="text-gray-500 line-through text-lg mr-2">
                    ${totalSinDescuento.toFixed(2)} MXN
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <AiFillDollarCircle className="inline-block text-3xl" />
                  <span>Total: ${total.toFixed(2)} MXN</span>
                </div>
                {tipoCambio ? (
                  <span className="ml-2 text-md text-green-700 font-semibold">
                    (${(total / tipoCambio).toFixed(2)} USD)
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 text-lg uppercase rounded-full shadow transition"
                disabled={productosAgregados.length === 0}
                onClick={async () => {
                  if (idPedidoPendienteEditando) {
                    // Buscar el pendiente original
                    const pendienteOriginal = pedidosPendientes.find(
                      (p) => p.id === idPedidoPendienteEditando,
                    );
                    // Compara productos, notas, descuentos, propina, etc.
                    const productosIguales =
                      JSON.stringify(
                        productosAgregados.map((p) => ({
                          id: p.id,
                          cantidad: p.cantidad,
                        })),
                      ) ===
                      JSON.stringify(
                        (pendienteOriginal.productos || []).map((p) => ({
                          id: p.id,
                          cantidad: p.cantidad,
                        })),
                      );
                    const notasIguales =
                      (pendienteOriginal.notas || "") === notas;
                    const descuentoIgual =
                      !!pendienteOriginal.descuentoEmpleado ===
                      !!descuentoEmpleado;
                    const propinaIgual =
                      Number(pendienteOriginal.propina) === Number(propina);
                    const canjeIgual =
                      JSON.stringify(
                        pendienteOriginal.canjeAplicado || null,
                      ) === JSON.stringify(canjeAplicado || null);

                    if (
                      productosIguales &&
                      notasIguales &&
                      descuentoIgual &&
                      propinaIgual &&
                      canjeIgual
                    ) {
                      // No hubo cambios: solo cierra el carrito y limpia edición
                      setCarritoAbierto(false);
                      setIdPedidoPendienteEditando(null);
                      setProductos(
                        productos.map((p) => ({ ...p, cantidad: 0 })),
                      );
                      setNotas("");
                      setCanjeAplicado(null);
                      setDescuentoEmpleado(false);
                      setPropina(0);
                      return;
                    } else {
                      // Sí hubo cambios: actualiza el pendiente en Firestore
                      setLoading(true);
                      try {
                        const productosOriginalesIds = productosOriginales.map(
                          (p) => p.id,
                        );
                        const productosActuales = productos.filter(
                          (p) => p.cantidad > 0,
                        );

                        const productosMarcados = productosActuales.map((p) => {
                          const original = productosOriginales.find(
                            (po) => po.id === p.id,
                          );
                          if (!original) {
                            // Producto completamente nuevo
                            return {
                              ...p,
                              nuevo: true,
                              cantidadNueva: p.cantidad,
                              servido: false,
                            };
                          }
                          if (p.cantidad > original.cantidad) {
                            // Producto existente con cantidad aumentada
                            return {
                              ...p,
                              nuevo: true,
                              cantidadNueva: p.cantidad - original.cantidad,
                              servido: false,
                            };
                          }
                          // Producto ya servido
                          return {
                            ...p,
                            nuevo: false,
                            cantidadNueva: 0,
                            servido: true,
                          };
                        });
                        const estadoFinal =
                          pendienteOriginal.estado === "cocinando"
                            ? "cocinando"
                            : "pendiente";
                        const esServida =
                          pendienteOriginal.estado === "servida";
                        console.log(
                          "productosOriginales:",
                          productosOriginales,
                        );
                        console.log("productosActuales:", productosActuales);
                        console.log("productosMarcados:", productosMarcados);
                        console.log("notas:", notas);
                        console.log("descuentoEmpleado:", descuentoEmpleado);
                        console.log("canjeAplicado:", canjeAplicado);
                        console.log("propina:", propina);
                        console.log("estadoFinal:", estadoFinal);
                        console.log("total:", total);
                        console.log("esServida:", esServida);
                        console.log("setDoc payload:", {
                          productos: productosMarcados.map((p) => ({
                            ...p,
                            nuevo: !!p.nuevo,
                            cantidadNueva: Number(p.cantidadNueva) || 0,
                            servido: !!p.servido,
                          })),
                          notas: notas || "",
                          descuentoEmpleado: !!descuentoEmpleado,
                          canjeAplicado: canjeAplicado || null,
                          propina: Number(propina) || 0,
                          estado: estadoFinal,
                          total: Number(total) || 0,
                          ...(esServida ? { fecha: "serverTimestamp()" } : {}),
                        });
                        await setDoc(
                          doc(db, "ventas", idPedidoPendienteEditando),
                          {
                            productos: productosMarcados.map((p) => ({
                              ...p,
                              nuevo: !!p.nuevo,
                              cantidadNueva: Number(p.cantidadNueva) || 0,
                              servido: !!p.servido,
                            })),
                            notas: notas || "",
                            descuentoEmpleado: !!descuentoEmpleado,
                            canjeAplicado: canjeAplicado || null,
                            propina: Number(propina) || 0,
                            estado: estadoFinal,
                            total: Number(total) || 0,
                            ...(esServida ? { fecha: serverTimestamp() } : {}),
                          },
                          { merge: true },
                        );
                        toast.success("Pedido pendiente actualizado");
                      } catch (err) {
                        toast.error("Error al actualizar el pendiente");
                        console.error("Error al actualizar el pendiente:", err);
                      }
                      setLoading(false);
                      setCarritoAbierto(false);
                      setIdPedidoPendienteEditando(null);
                      setProductos(
                        productos.map((p) => ({ ...p, cantidad: 0 })),
                      );
                      setNotas("");
                      setCanjeAplicado(null);
                      setDescuentoEmpleado(false);
                      setPropina(0);
                      return;
                    }
                  } else {
                    // Si no es edición de pendiente, abre el modal para guardar pendiente nuevo
                    setMostrarModalPendiente(true);
                  }
                }}
              >
                {idPedidoPendienteEditando
                  ? "Seguir pendiente"
                  : "Marcar como pendiente"}
              </button>
              <button
                type="button"
                onClick={() => setMostrarModalPuntos(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-lg uppercase rounded-full shadow transition"
              >
                Registrar visita o canjes
              </button>
              <button
                type="button"
                onClick={() => setMostrarModalPago(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white text-lg uppercase font-bold px-6 py-2 mb-4 rounded-full shadow hover:scale-105 transition"
                disabled={loading}
              >
                Registrar venta
              </button>
            </div>
          </div>
        )}

        {mostrarModalPendiente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs relative">
              <button
                type="button"
                className="absolute top-2 right-2 text-xl text-white bg-red-500 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition"
                onClick={() => setMostrarModalPendiente(false)}
                title="Cerrar"
              >
                <FaTimes />
              </button>
              <h2 className="text-lg font-bold text-orange-500 mb-3 text-center">
                Guardar venta como pendiente
              </h2>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full font-bold border ${
                    modoPendiente === "mesa"
                      ? "bg-orange-500 text-white"
                      : "bg-white text-orange-500 border-orange-300"
                  }`}
                  onClick={() => setModoPendiente("mesa")}
                >
                  Mesa
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full font-bold border ${
                    modoPendiente === "nombre"
                      ? "bg-orange-500 text-white"
                      : "bg-white text-orange-500 border-orange-300"
                  }`}
                  onClick={() => setModoPendiente("nombre")}
                >
                  Nombre
                </button>
              </div>
              {modoPendiente === "mesa" ? (
                <select
                  value={mesaSeleccionada}
                  onChange={(e) => setMesaSeleccionada(e.target.value)}
                  className="border rounded px-2 py-1 mb-3 w-full"
                >
                  <option value="">Selecciona una mesa</option>
                  {mesas
                    .slice()
                    .sort((a, b) => Number(a.numero) - Number(b.numero))
                    .map((mesa) => (
                      <option key={mesa.id} value={mesa.numero}>
                        {mesa.numero}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={nombrePedidoPendiente}
                  onChange={(e) => setNombrePedidoPendiente(e.target.value)}
                  placeholder="Nombre del pedido pendiente"
                  className="border rounded px-2 py-1 mb-3 w-full"
                  autoFocus
                />
              )}
              <button
                type="button"
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-full shadow transition w-full"
                disabled={
                  (modoPendiente === "nombre" && !nombrePedidoPendiente) ||
                  (modoPendiente === "mesa" && !mesaSeleccionada) ||
                  productosAgregados.length === 0 ||
                  pedidosPendientes.some((p) =>
                    modoPendiente === "nombre"
                      ? p.nombre.trim().toLowerCase() ===
                        nombrePedidoPendiente.trim().toLowerCase()
                      : p.mesa === mesaSeleccionada,
                  )
                }
                onClick={guardarPedidoPendiente}
              >
                Guardar pendiente
              </button>
            </div>
          </div>
        )}

        {mostrarModalPago && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
              <button
                className="absolute top-2 right-2 text-3xl text-white bg-red-500 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition"
                onClick={() => setMostrarModalPago(false)}
                title="Cerrar"
              >
                ×
              </button>
              <h2 className="flex gap-2 items-center text-xl uppercase font-bold text-orange-500 mb-4">
                <AiFillDollarCircle className="inline-block text-4xl" />
                Pago del cliente
              </h2>
              <div className="mb-4">
                <div className="font-bold text-lg text-orange-500 flex flex-col items-center gap-1">
                  <span>Total a pagar: </span>
                  <span>${total.toFixed(2)} MXN</span>
                  {tipoCambio ? (
                    <span className="ml-2 text-md text-green-700 font-semibold">
                      (${(total / tipoCambio).toFixed(2)} USD)
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-4">
                <label className="font-semibold text-gray-700 mb-1">
                  Desglose de pago
                </label>
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-28">MXN</span>
                    <input
                      type="number"
                      min={0}
                      value={pagoMXN}
                      onChange={(e) => setPagoMXN(e.target.value)}
                      className="border rounded px-2 py-1 flex-1"
                      placeholder="Efectivo MXN"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28">USD</span>
                    <input
                      type="number"
                      min={0}
                      value={pagoUSD}
                      onChange={(e) => setPagoUSD(e.target.value)}
                      className="border rounded px-2 py-1 flex-1"
                      placeholder="Efectivo USD"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28">Tarjeta</span>
                    <input
                      type="number"
                      min={0}
                      value={pagoTarjeta}
                      onChange={(e) => setPagoTarjeta(e.target.value)}
                      className="border rounded px-2 py-1 flex-1"
                      placeholder="Monto en tarjeta"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28">Transferencia</span>
                    <input
                      type="number"
                      min={0}
                      value={pagoTransferencia}
                      onChange={(e) => setPagoTransferencia(e.target.value)}
                      className="border rounded px-2 py-1 flex-1"
                      placeholder="Monto en transferencia"
                    />
                  </div>
                  {(pagoMXN || pagoUSD || pagoTarjeta || pagoTransferencia) && (
                    <div className="my-2 text-center font-bold text-lg text-green-700">
                      {cambioTotalMXN >= 0 ? (
                        <>
                          Cambio: ${cambioTotalMXN.toFixed(2)} MXN
                          {tipoCambio && (
                            <span className="ml-2 text-blue-700">
                              (~${cambioTotalUSD.toFixed(2)} USD)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-red-600">
                          Falta por pagar: $
                          {Math.abs(cambioTotalMXN).toFixed(2)} MXN
                          {tipoCambio && (
                            <span className="ml-2 text-blue-700">
                              (~${(Math.abs(cambioTotalMXN) / tipoCambio).toFixed(2)} USD)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                onClick={(e) => {
                  setMostrarModalPago(false);
                  registrarVenta(e);
                }}
                className="bg-orange-500 text-white text-lg font-bold px-6 py-2 rounded-full shadow hover:scale-105 transition w-full"
                disabled={loading}
              >
                {loading ? "Registrando..." : "Confirmar y registrar venta"}
              </button>
            </div>
          </div>
        )}

        {mostrarModalPuntos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white max-h-[90vh] overflow-y-auto rounded-lg shadow-lg p-3 max-w-md w-full relative">
              <button
                type="button"
                className="sticky top-2 right-2 text-2xl text-white bg-red-500 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition"
                onClick={cerrarModalPuntos}
                title="Cerrar"
              >
                <FaTimes />
              </button>
              <div className="flex gap-2 mb-4 justify-center">
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full font-semibold border transition ${
                    tabPuntos === "visita"
                      ? "bg-[var(--color-principal)] text-white border-[var(--color-principal)]"
                      : "bg-white text-[var(--color-principal)] border-[var(--color-principalClaro)]"
                  }`}
                  onClick={() => setTabPuntos("visita")}
                >
                  Registrar visita
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full font-semibold border transition ${
                    tabPuntos === "canje"
                      ? "bg-[var(--color-principal)] text-white border-[var(--color-principal)]"
                      : "bg-white text-[var(--color-principal)] border-[var(--color-principalClaro)]"
                  }`}
                  onClick={() => setTabPuntos("canje")}
                >
                  Canjear recompensa
                </button>
              </div>
              {tabPuntos === "visita" && (
                <RegistrarVisita
                  ref={registrarVisitaRef}
                  onVisitaRegistrada={cerrarModalPuntos}
                />
              )}
              {tabPuntos === "canje" && (
                <CanjearRecompensas
                  ref={canjearRef}
                  aplicarCanje={aplicarCanje}
                  onCanjeado={cerrarModalPuntos}
                  totalCaja={total} // pasa el total actual para prellenar el modal de descuento general
                />
              )}
            </div>
          </div>
        )}

        {productosAgregados.length > 0 && (
          <button
            type="button"
            onClick={() => setCarritoAbierto(true)}
            className="fixed bottom-6 right-6 z-20 bg-orange-500 hover:bg-orange-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 flex items-center gap-2"
            style={{ boxShadow: "0 4px 24px #0002" }}
          >
            <FiShoppingCart size={28} />
            <span className="font-bold">{productosAgregados.length}</span>
          </button>
        )}
      </form>
    </>
  );
}
