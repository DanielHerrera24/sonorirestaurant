import { useState } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const adminUid = "93253831"; // cambia esto

export default function AgregarPlatillo({ user }) {
  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    descripcion: "",
    categoria: "Desayunos",
    alt: "",
  });
  const [imagenFile, setImagenFile] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  if (!user || user.uid !== adminUid) return <><h2>Holaaaaa</h2></>;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleImagenChange = (e) => {
    setImagenFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.precio) {
      setMensaje("El nombre y el precio son obligatorios.");
      return;
    }

    setSubiendo(true);
    let imagenUrl = "";

    try {
      if (imagenFile) {
        const storageRef = ref(
          storage,
          `platillos/${Date.now()}_${imagenFile.name}`
        );
        await uploadBytes(storageRef, imagenFile);
        imagenUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "platillos"), {
        ...form,
        precio: parseFloat(form.precio),
        imagen: imagenUrl,
        creadoPor: user.uid,
        creadoEn: serverTimestamp(),
      });

      setMensaje("✅ Platillo agregado correctamente.");
      setForm({
        nombre: "",
        precio: "",
        descripcion: "",
        alt: "",
        categoria: "Desayunos",
      });
      setImagenFile(null);
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error al agregar el platillo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-md max-w-md mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4">Agregar nuevo platillo</h2>
      {mensaje && <p className="text-sm mb-4">{mensaje}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder="Nombre del platillo *"
          className="border p-2 rounded"
        />
        <input
          name="precio"
          type="number"
          value={form.precio}
          onChange={handleChange}
          placeholder="Precio *"
          className="border p-2 rounded"
        />
        <input
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          placeholder="Descripción"
          className="border p-2 rounded"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleImagenChange}
          className="border p-2 rounded"
        />
        <input
          name="alt"
          value={form.alt}
          onChange={handleChange}
          placeholder="Texto alternativo (alt)"
          className="border p-2 rounded"
        />
        <select
          name="categoria"
          value={form.categoria}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option>Desayunos</option>
          <option>Comidas</option>
          <option>Bebidas</option>
          <option>Postres</option>
        </select>
        <button
          type="submit"
          disabled={subiendo}
          className="bg-[var(--color-principal)] text-white px-4 py-2 rounded hover:bg-[var(--color-principalHover)] transition-colors disabled:opacity-50"
        >
          {subiendo ? "Subiendo..." : "Guardar platillo"}
        </button>
      </form>
    </div>
  );
}
