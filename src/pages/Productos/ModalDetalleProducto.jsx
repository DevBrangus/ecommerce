import { useMemo } from "react";
import { IoMdClose } from "react-icons/io";
import { forwardRef, useEffect, useState } from "react";
import { GrRestaurant } from "react-icons/gr";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { MdAddShoppingCart } from "react-icons/md";


const PRIMARY = "#c43728";

export const ModalDetalleProducto = ({ p, onClose, onAdd, fallbackImg, topbarH }) => {
    const precioFinal = useMemo(() => {
        const valor = Number(p?.valor || 0);
        const desc = Number(p?.descuento || 0);
        const tieneDesc = desc > 0;
        const final = tieneDesc ? Math.max(0, valor - (valor * desc) / 100) : valor;
        return { valor, desc, final, tieneDesc };
    }, [p]);

    if (!p) return null;

    useEffect(() => {
        console.log('producto select:', p);
    }, []);

    return (
        <div className="fixed inset-0 z-130">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="absolute inset-0 p-4 flex items-start justify-center overflow-y-auto">
                <div className="w-[60%] bg-white rounded-lg shadow border border-slate-200 overflow-hidden" style={{ marginTop: topbarH }}>
                    <header className="flex items-start justify-between px-5 py-2 border-b border-slate-200">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg md:text-xl font-semibold text-slate-800">Detalle del producto</h3>
                            <p className="text-xs md:text-sm text-slate-500">{p?.categoria.nombre} {p?.presentacion.nombre ? `• ${p.presentacion.nombre}` : ""}</p>
                        </div>

                        <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-white" style={{ background: "transparent" }} onMouseEnter={(e) => (e.currentTarget.style.background = PRIMARY)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                            <IoMdClose className="text-xl" />
                        </button>
                    </header>

                    <section className="p-4 md:p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                            <div className="w-full  ">
                                <div className="relative w-full h-full bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">

                                    <img
                                        src={p?.img || fallbackImg}
                                        alt={p?.producto}
                                        className="w-full h-full  object-cover bg-white"
                                    />

                                    {/* ⭐ Reseña dentro de la imagen */}
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm shadow-md flex items-center gap-1">
                                        <span>⭐</span>
                                        <b className="text-slate-900">
                                            {Number(p?.rating || 5).toFixed(1)}
                                        </b>
                                    </div>

                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <h1 className="text-5xl  font-semibold text-slate-900">{p?.producto}</h1>

                                <div className="flex  gap-3 items-center">
                                    <p className="text-2xl md:text-3xl font-extrabold text-slate-900">
                                        ${precioFinal.final.toLocaleString("es-CO")}
                                    </p>

                                    {precioFinal.tieneDesc && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-base text-slate-500 line-through">${precioFinal.valor.toLocaleString("es-CO")}</span>
                                            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-green-700 border border-slate-200 text-white">
                                                -{precioFinal.desc}%
                                            </span>
                                        </div>
                                    )}

                                    {Number(p?.oferta || 0) === 1 && (
                                        <span className="text-xs font-semibold px-2 py-1 rounded-md text-white" style={{ background: PRIMARY }}>
                                            OFERTA
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    {p?.descripcion ? (
                                        <>
                                            <div className="flex items-center gap-1">
                                                <HiOutlineDocumentText className="text-[#AB2121] text-xl" />
                                                <h5 className="font-semibold">Descripción del prodúcto:</h5>
                                            </div>

                                            <p
                                                className="text-sm text-slate-600 leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: p.descripcion }}
                                            />
                                        </>
                                    ) : (
                                        <p className="text-sm text-slate-500">Sin descripción.</p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    {p?.preparacion ? (
                                        <>
                                            <div className="flex items-center gap-1 ">
                                                <GrRestaurant className="text-[#AB2121] text-xl" />
                                                <h5 className="font-semibold">Preparación:</h5>
                                            </div>
                                            <p
                                                className="text-sm text-slate-600 leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: p.preparacion }}
                                            />
                                        </>
                                    ) : (
                                        <p className="text-sm text-slate-500">Sin descripción.</p>
                                    )}
                                </div>

                                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3 items-end justify-end">
                                    <button type="button" className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 text-sm font-medium">
                                        Favoritos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onAdd?.(p)}

                                        className="px-11 py-2.5 rounded-lg text-[#AB2121] hover:text-white text-sm font-semibold flex items-center gap-2 border border-[#AB2121] hover:bg-[#AB2121] transform-gpu will-change-transform transition-transform duration-150 ease-out hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 appearance-none "
                                    >
                                        <MdAddShoppingCart className="h-5 w-5" />
                                        Agregar
                                    </button>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-200 text-xs text-slate-500">
                                    * La información puede variar según disponibilidad.
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* <footer className="px-5 py-2 border-t border-slate-200 flex items-center justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium">
                            Cerrar
                        </button>
                    </footer> */}
                </div>
            </div>
        </div>
    );
};
