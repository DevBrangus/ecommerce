import React, { useEffect, useMemo } from "react";

const PRIMARY = "#c43728";
const moneyCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
const safe = (v) => (v === null || v === undefined ? "" : String(v));

export default function ModalConfirmacionPedido({
    isOpen = false,
    order = null,
    onFinalizar = () => { },
}) {
    const data = useMemo(() => {
        const pedido = order?.pedido || {};
        const puntos = order?.puntos || {};
        const cliente = order?.cliente || {};
        const resumen = order?.resumen || {};
        const pago = order?.pago || {};

        const fechaISO =
            safe(pedido?.created_at) ||
            safe(order?.created_at) ||
            safe(order?.saved_at) ||
            new Date().toISOString();

        const direccionFull = [safe(cliente?.direccion), safe(cliente?.barrio) ? ` | ${safe(cliente?.barrio)}` : ""]
            .join("")
            .trim();

        return {
            codigo: safe(pedido?.codigo),
            estado: safe(pedido?.estado || "PENDIENTE"),
            total: Number(pedido?.total ?? resumen?.total ?? 0),

            idPedido: pedido?.id,
            idUsuario: pedido?.idUsuario,
            idSede: pedido?.idSede,
            idCiudad: pedido?.idCiudad,

            metodoPago: safe(pago?.metodo || "CONTRA ENTREGA"),

            nombre: safe(cliente?.nombre),
            direccionFull,
            telefono: safe(cliente?.telefono),
            email: safe(cliente?.email),

            puntosGanados: Number(puntos?.ganados ?? 0),
            saldoPuntos: Number(puntos?.saldo ?? 0),

            fechaISO,
        };
    }, [order]);

    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const fechaLegible = (() => {
        try {
            const d = new Date(data.fechaISO);
            return d.toLocaleString("es-CO", {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return data.fechaISO;
        }
    })();

    const handleFinalizar = () => {
        console.log("✅ CONFIRMACIÓN PEDIDO (order):", order);
        console.log("✅ CONFIRMACIÓN PEDIDO (data):", data);
        onFinalizar?.(order);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6">
            {/* Overlay (NO cierra al hacer click) */}
            <div className="absolute inset-0 bg-black/55" />

            {/* Modal */}
            <div className="relative w-full max-w-xl sm:max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
                {/* Header (compacto) */}
                <header className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-white">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm flex-shrink-0">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
                                <path
                                    d="M20 6L9 17l-5-5"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 leading-tight">
                                ¡Pedido confirmado!
                            </h2>
                            <p className="mt-1 text-sm text-slate-600 leading-snug">
                                Pedido{" "}
                                <span className="font-extrabold" style={{ color: PRIMARY }}>
                                    #{data.codigo || "—"}
                                </span>{" "}
                                — te contactaremos para confirmar disponibilidad y envío.
                            </p>
                        </div>
                    </div>
                </header>

                {/* Body scrolleable */}
                <section className="p-4 sm:p-6 overflow-y-auto">
                    {/* Total destacado (más compacto) */}
                    <div className="rounded-xl border border-[#f3c4bf] bg-[#fff7f6] p-4">
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-slate-600">Total del pedido</p>
                                <p className="mt-1 text-2xl sm:text-3xl font-extrabold" style={{ color: PRIMARY }}>
                                    {moneyCOP(data.total)}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-xs text-slate-500">Fecha del pedido</p>
                                <p className="text-sm font-semibold text-slate-800">{fechaLegible}</p>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Chip text={data.metodoPago || "CONTRA ENTREGA"} />
                            {/* <Chip text={data.estado || "PENDIENTE"} /> */}
                        </div>
                    </div>

                    {/* Grid responsive: 1 col móvil, 2 col en >=sm */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-1 gap-4">
                        {/* Entrega */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-extrabold text-slate-900">Datos de entrega</p>

                            <div className="mt-3 grid grid-cols-1 gap-3">
                                <Info label="Nombre" value={data.nombre || "—"} />
                                <Info label="Teléfono" value={data.telefono || "—"} />
                                <Info label="Dirección" value={data.direccionFull || "—"} />
                                <Info label="Email" value={data.email || "—"} />
                            </div>
                        </div>

                        {/* Puntos
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-extrabold text-slate-900">Puntos</p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Kpi label="Ganados" value={String(data.puntosGanados || 0)} />
                <Kpi label="Saldo" value={String(data.saldoPuntos ?? "—")} />
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Los puntos se verán reflejados después de la confirmación del pedido.
              </p>

              <div className="mt-3 text-[11px] text-slate-500">
                <p>{`idPedido: ${safe(data.idPedido)} | idUsuario: ${safe(data.idUsuario)} | idSede: ${safe(
                  data.idSede
                )} | idCiudad: ${safe(data.idCiudad)}`}</p>
              </div>
            </div> */}
                    </div>
                </section>

                {/* Footer fijo */}
                <footer className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-white">
                    <button
                        type="button"
                        onClick={handleFinalizar}
                        className="w-full h-[44px] rounded-xl text-white font-extrabold text-base transition transform-gpu will-change-transform duration-150 ease-out hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-0"
                        style={{ background: PRIMARY }}
                    >
                        Finalizar
                    </button>
                </footer>
            </div>
        </div>
    );
}

function Chip({ text = "" }) {
    return (
        <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold">
            {text || "—"}
        </span>
    );
}

function Info({ label = "", value = "" }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-extrabold text-slate-900 break-words">{value || "—"}</p>
        </div>
    );
}

function Kpi({ label = "", value = "" }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{value || "—"}</p>
        </div>
    );
}
