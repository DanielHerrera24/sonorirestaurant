export default function DetalleVentaModal({ venta, onClose }) {
  if (!venta) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-red-500 font-bold text-xl">X</button>
        <h4 className="text-lg font-bold mb-2">Detalle de venta</h4>
        {/* Mostrar productos, cantidades, total, método de pago, fecha, cajero, etc. */}
      </div>
    </div>
  );
}