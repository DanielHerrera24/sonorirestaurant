import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import TipoCambio from "../ventas/TipoCambio";
import { useAuth } from "../../context/AuthContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FaDollarSign, FaEdit } from "react-icons/fa";
import { GiRoundTable } from "react-icons/gi";
import EditarPlatillos from "../ventas/EditarPlatillos";
import ConfigurarMesas from "./ConfigurarMesas";

const TABS = [
  { key: "cambio", label: "Tipo de Cambio", icon: <FaDollarSign /> },
  { key: "editar", label: "Editar Platillos", icon: <FaEdit /> },
  { key: "mesas", label: "Mesas", icon: <GiRoundTable /> },
];

function Configuracion() {
  const [tab, setTab] = useState("cambio");
  const { user } = useAuth();
  const [rol, setRol] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "clientes"),
      where("authUid", "==", user.uid),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setRol(data.rol || "cliente");
      }
    });
    return () => unsub();
  }, [user]);

  return (
    <section className="flex flex-col gap-3 items-center justify-center">
      <h2 className="text-3xl text-orange-500">Configuración</h2>
      <div className="flex gap-2">
        {["admin", "caja"].includes(rol) &&
          TABS.filter((t) => t.key !== "lista").map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
              }}
              className={`
                  flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition
                  ${
                    tab === t.key
                      ? "bg-black text-orange-500 shadow"
                      : "text-orange-500 hover:bg-orange-700 hover:text-white"
                  }
                `}
              title={t.label}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-xs font-semibold">{t.label}</span>
            </button>
          ))}
      </div>
      <div>
        {tab === "cambio" && <TipoCambio />}
        {tab === "editar" && <EditarPlatillos />}
        {tab === "mesas" && <ConfigurarMesas />}
      </div>
    </section>
  );
}

export default Configuracion;
