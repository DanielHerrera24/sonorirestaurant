/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";
import { MdCancel } from "react-icons/md"; // Para botón de cerrar modal

export default function EditarPlatillos() {
  const [platillos, setPlatillos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    categoria: "",
    alt: "",
    imagen: null,
    estado: "regular",
    precioPromo: "",
    soloVenta: false,
  });
  const [loading, setLoading] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [editandoCategoria, setEditandoCategoria] = useState(null);
  const [nombreCategoriaEdit, setNombreCategoriaEdit] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevaCategoriaSoloVenta, setNuevaCategoriaSoloVenta] = useState(false);
  const [imagenCategoria, setImagenCategoria] = useState(null);
  const [previewImgCategoria, setPreviewImgCategoria] = useState(null);

  useEffect(() => {
    fetchPlatillos();
    fetchCategorias();
  }, []);

  const fetchPlatillos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "platillos"));
      setPlatillos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      toast.error("Error al cargar platillos");
    }
    setLoading(false);
  };

  const fetchCategorias = async () => {
    try {
      const snap = await getDocs(collection(db, "categorias"));
      const cats = snap.docs.map((doc) => doc.data().nombre).sort();
      setCategorias(cats);
    } catch (e) {
      toast.error("Error al cargar categorías");
    }
  };

  const handleEdit = (platillo) => {
    setEditando(platillo.id);
    setForm({
      nombre: platillo.nombre,
      descripcion: platillo.descripcion || "",
      precio: platillo.precio,
      categoria: platillo.categoria,
      alt: platillo.alt || "",
      imagen: platillo.imagen || null,
      estado: platillo.estado || "regular",
      precioPromo: platillo.precioPromo || "",
      soloVenta: platillo.soloVenta || false,
    });
    setPreviewImg(platillo.imagen || null);
    setModalAgregar(true);
  };

  const handleEliminar = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar platillo?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      setLoading(true);
      try {
        (await doc(db, "platillos", id).delete?.()) ||
          (await (
            await import("firebase/firestore")
          ).deleteDoc(doc(db, "platillos", id)));
        setPlatillos(platillos.filter((p) => p.id !== id));
        toast.success("Platillo eliminado");
      } catch (e) {
        toast.error("Error al eliminar platillo");
      }
      setLoading(false);
    }
  };

  // Filtrado y búsqueda
  let platillosFiltrados = platillos;
  if (categoriaFiltro !== "todas") {
    platillosFiltrados = platillosFiltrados.filter(
      (p) => p.categoria === categoriaFiltro,
    );
  }
  if (busqueda.trim()) {
    platillosFiltrados = platillosFiltrados.filter(
      (p) =>
        (p.nombre && p.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
        (p.descripcion &&
          p.descripcion.toLowerCase().includes(busqueda.toLowerCase())),
    );
  }
  if (categoriaFiltro === "todas") {
    platillosFiltrados = [...platillosFiltrados].sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }

  // Reset form and preview when closing modal
  const closeModalAgregar = () => {
    setModalAgregar(false);
    setEditando(null);
    setForm({
      nombre: "",
      descripcion: "",
      precio: "",
      categoria: "",
      alt: "",
      imagen: null,
      estado: "regular",
      precioPromo: "",
      soloVenta: false,
    });
    setPreviewImg(null);
  };

  return (
    <div className="mx-auto mt-8 sm:mt-0 p-4 bg-white rounded-lg shadow">
      <ToastContainer position="top-right" autoClose={2000} />
      <h2 className="text-2xl font-bold mb-6 text-orange-500 flex items-center gap-2">
        <span role="img" aria-label="edit">
          ✏️
        </span>{" "}
        Editar Platillos
      </h2>

      <div className="flex justify-start mb-4">
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded transition"
          onClick={() => setModalAgregar(true)}
        >
          + Agregar platillo
        </button>
      </div>

      {/* Modal para agregar platillo */}
      {modalAgregar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-2xl"
              onClick={closeModalAgregar}
              title="Cerrar"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-4 text-orange-500">
              {editando ? "Editar Platillo" : "Agregar Platillo"}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!form.nombre.trim() || !form.precio || !form.categoria) {
                  toast.warn("Completa todos los campos obligatorios");
                  return;
                }
                setLoading(true);
                let url = form.imagen;
                if (form.imagen && typeof form.imagen !== "string") {
                  try {
                    const storage = getStorage();
                    const storageRef = ref(
                      storage,
                      `platillos/${Date.now()}-${form.imagen.name}`,
                    );
                    await uploadBytes(storageRef, form.imagen);
                    url = await getDownloadURL(storageRef);
                  } catch (err) {
                    toast.error("Error al subir imagen");
                    setLoading(false);
                    return;
                  }
                }
                try {
                  if (editando) {
                    // Editar platillo existente
                    await updateDoc(doc(db, "platillos", editando), {
                      nombre: form.nombre,
                      descripcion: form.descripcion || "",
                      precio: Number(form.precio),
                      categoria: form.categoria,
                      alt: form.alt || form.nombre,
                      imagen: url || "",
                      estado: form.estado || "regular",
                      precioPromo:
                        form.estado === "promocion" ? form.precioPromo : "",
                      soloVenta: form.soloVenta || false,
                    });
                    toast.success("Platillo actualizado");
                  } else {
                    // Agregar nuevo platillo
                    await addDoc(collection(db, "platillos"), {
                      nombre: form.nombre,
                      descripcion: form.descripcion || "",
                      precio: Number(form.precio),
                      categoria: form.categoria,
                      alt: form.alt || form.nombre,
                      imagen: url || "",
                      creado: new Date(),
                      estado: form.estado || "regular",
                      precioPromo:
                        form.estado === "promocion" ? form.precioPromo : "",
                      soloVenta: form.soloVenta || false,
                    });
                    toast.success("Platillo agregado");
                  }
                  closeModalAgregar();
                  fetchPlatillos();
                } catch (err) {
                  toast.error("Error al guardar platillo");
                }
                setLoading(false);
              }}
              className="grid grid-cols-1 gap-3"
            >
              <div>
                <label className="font-semibold">Nombre*</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="font-semibold">Categoría*</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={form.categoria}
                  onChange={(e) => {
                    if (e.target.value === "__agregar__") {
                      setModalCategoria(true);
                      setEditandoCategoria(null);
                      setNuevaCategoria("");
                      setPreviewImgCategoria(null);
                      setImagenCategoria(null);
                      setNuevaCategoriaSoloVenta(false);
                      setForm({ ...form, categoria: "" });
                    } else {
                      setForm({ ...form, categoria: e.target.value });
                    }
                  }}
                  required
                >
                  <option value="">Selecciona categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__agregar__">
                    ➕ Agregar nueva categoría...
                  </option>
                </select>
                {form.categoria && categorias.includes(form.categoria) && (
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                    onClick={() => {
                      setEditandoCategoria(form.categoria);
                      setNombreCategoriaEdit(form.categoria);
                      setPreviewImgCategoria(null);
                      setImagenCategoria(null);
                      setModalCategoria(true);
                    }}
                  >
                    Editar categoría
                  </button>
                )}
              </div>
              <div>
                <label className="font-semibold">Descripción</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full"
                  value={form.descripcion || ""}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="font-semibold">Precio*</label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="font-semibold">Tipo de precio</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={form.estado || "regular"}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  <option value="regular">Precio regular</option>
                  <option value="promocion">Promoción</option>
                  <option value="nuevo">Lo Nuevo</option>
                </select>
              </div>
              {form.estado === "promocion" && (
                <div>
                  <label className="font-semibold">Precio en promoción*</label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full"
                    value={form.precioPromo || ""}
                    onChange={(e) =>
                      setForm({ ...form, precioPromo: e.target.value })
                    }
                    required
                  />
                </div>
              )}
              <div>
                <label className="font-semibold">Imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setForm({ ...form, imagen: file });
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPreviewImg(reader.result);
                      reader.readAsDataURL(file);
                    } else {
                      setPreviewImg(null);
                    }
                  }}
                />
                {previewImg && (
                  <img
                    src={previewImg}
                    alt="Vista previa"
                    className="w-32 h-32 object-cover rounded mt-2"
                  />
                )}
              </div>
              <div>
                <label className="font-semibold">Texto alternativo</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full"
                  value={form.alt || ""}
                  onChange={(e) => setForm({ ...form, alt: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.soloVenta || false}
                  onChange={(e) =>
                    setForm({ ...form, soloVenta: e.target.checked })
                  }
                />
                <span>Solo visible en sistema de ventas</span>
              </div>
              <button
                type="submit"
                className="bg-orange-500 hover:bg-[var(--color-principalHover)] text-white font-semibold py-2 rounded transition mt-2"
                disabled={loading}
              >
                {editando ? "Guardar cambios" : "Agregar platillo"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal para agregar categoría */}
      {modalCategoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-2xl"
              onClick={() => {
                setModalCategoria(false);
                setEditandoCategoria(null);
                setNombreCategoriaEdit("");
                setNuevaCategoria("");
                setPreviewImgCategoria(null);
                setImagenCategoria(null);
                setNuevaCategoriaSoloVenta(false);
              }}
              title="Cerrar"
            >
              <MdCancel size={24} />
            </button>
            <h3 className="text-xl font-bold mb-4 text-orange-500">
              {editandoCategoria ? "Editar Categoría" : "Nueva Categoría"}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                let urlImg = "";
                if (imagenCategoria) {
                  try {
                    const storage = getStorage();
                    const storageRef = ref(
                      storage,
                      `categorias/${Date.now()}-${imagenCategoria.name}`,
                    );
                    await uploadBytes(storageRef, imagenCategoria);
                    urlImg = await getDownloadURL(storageRef);
                  } catch (err) {
                    toast.error("Error al subir imagen");
                    setLoading(false);
                    return;
                  }
                }
                try {
                  if (editandoCategoria) {
                    // Editar categoría existente
                    const q = await getDocs(collection(db, "categorias"));
                    const catDoc = q.docs.find(
                      (d) => d.data().nombre === editandoCategoria,
                    );
                    if (catDoc) {
                      await updateDoc(doc(db, "categorias", catDoc.id), {
                        nombre: nombreCategoriaEdit,
                        ...(urlImg && { imagen: urlImg }),
                        soloVenta: nuevaCategoriaSoloVenta,
                      });
                    }
                  } else {
                    // Nueva categoría
                    await addDoc(collection(db, "categorias"), {
                      nombre: nuevaCategoria,
                      imagen: urlImg,
                      soloVenta: nuevaCategoriaSoloVenta,
                    });
                    setForm((f) => ({ ...f, categoria: nuevaCategoria }));
                  }
                  toast.success(
                    editandoCategoria
                      ? "Categoría actualizada"
                      : "Categoría agregada",
                  );
                  setModalCategoria(false);
                  setEditandoCategoria(null);
                  setNombreCategoriaEdit("");
                  setNuevaCategoria("");
                  setPreviewImgCategoria(null);
                  setImagenCategoria(null);
                  setNuevaCategoriaSoloVenta(false);
                  fetchCategorias();
                } catch (err) {
                  toast.error("Error al guardar categoría");
                }
                setLoading(false);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="Nombre de la categoría"
                value={editandoCategoria ? nombreCategoriaEdit : nuevaCategoria}
                onChange={(e) =>
                  editandoCategoria
                    ? setNombreCategoriaEdit(e.target.value)
                    : setNuevaCategoria(e.target.value)
                }
                className="w-full border rounded px-3 py-2"
                required
              />
              <div>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={nuevaCategoriaSoloVenta}
                    onChange={(e) =>
                      setNuevaCategoriaSoloVenta(e.target.checked)
                    }
                  />
                  Solo visible en sistema de ventas
                </label>
              </div>
              <div>
                <label className="font-semibold">Imagen (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setImagenCategoria(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () =>
                        setPreviewImgCategoria(reader.result);
                      reader.readAsDataURL(file);
                    } else {
                      setPreviewImgCategoria(null);
                    }
                  }}
                />
                {previewImgCategoria && (
                  <img
                    src={previewImgCategoria}
                    alt="Vista previa"
                    className="w-32 h-32 object-cover rounded mt-2"
                  />
                )}
              </div>
              <button
                type="submit"
                className="bg-orange-500 hover:bg-[var(--color-principalHover)] text-white font-semibold py-2 rounded transition mt-2 w-full"
                disabled={loading}
              >
                {editandoCategoria ? "Guardar cambios" : "Agregar categoría"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Filtros y grid de platillos */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="todas">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar por nombre o descripción"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
      </div>
      {loading && (
        <div className="text-center my-4 text-orange-500">
          Cargando...
        </div>
      )}
      <div
        className="
          grid grid-cols-1
          md:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-4
          gap-4
        "
      >
        {platillosFiltrados.map((p) => (
          <div
            key={p.id}
            className="bg-gray-50 border rounded-lg p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition"
          >
            <>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-lg">{p.nombre}</span>
                <span className="text-orange-500 font-bold">
                  ${p.precio}
                </span>
                <span className="text-gray-500 text-sm">{p.categoria}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEdit(p)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(p.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
                  disabled={loading}
                >
                  Eliminar
                </button>
              </div>
            </>
          </div>
        ))}
      </div>
      {platillosFiltrados.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          No hay platillos que coincidan.
        </div>
      )}
    </div>
  );
}
