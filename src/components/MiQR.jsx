import QRCode from "react-qr-code";

export default function MiQR({ uid }) {
  if (!uid) return null;

  return (
    <div className="text-center">
      <h2 className="text-4xl tracking-wide text-[var(--color-negro)] mb-2 uppercase">Tarjeta:</h2>
      <div className="inline-block bg-[var(--color-blanco)] p-4 rounded-2xl shadow">
        <QRCode value={uid} size={250} />
        <p className="mt-2 text-5xl tracking-wider text-black">{uid}</p>
      </div>
    </div>
  );
}
