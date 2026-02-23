import React, { useMemo, useState } from "react";
import logo from "../../assets/logo.png";

export const Categorias = () => {
    const panels = useMemo(() => ([
        { title: "CERDO", img: "https://tienda.carnesbrangus.com/img/cerdo.jpg" },
        { title: "RES", img: "https://tienda.carnesbrangus.com/img/res.jpeg" },
        { title: "POLLO", img: "https://tienda.carnesbrangus.com/img/pollo.jpg" },
        { title: "PROMOS", img: "https://tienda.carnesbrangus.com/img/combo.webp" },
    ]), []);

    const [hovered, setHovered] = useState(null);

    return (
        <div className="w-full min-h-screen flex flex-col items-center justify-start gap-8 py-5 px-2 bg-w">
            {/* Header */}
            <div className="w-full max-w-[75%] flex flex-col items-center gap-4">
                <img src={logo} alt="Carnes Brangus" className="w-[10%] md:w-[15%] select-none" />

                <h1 className="text-center text-2xl md:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    ¿Listo para una carne <span className="text-[#c62828]">de verdad?</span>
                </h1>
                <p className="text-slate-500 text-lg max-w-[600px] text-center">
                    Selecciona tu categoría favorita y descubre los mejores cortes y promociones.
                </p>

                <div className="h-[4px] w-[84px] rounded-full bg-gradient-to-r from-[#c62828] to-[#ff5252]" />
            </div>

            {/* Panels */}
            <div className="w-full max-w-[95%]">
                <div
                    className="w-full h-[57vh] min-h-[75%] overflow-hidden rounded-[18px] flex flex-row md:flex-row flex-col"
                    onMouseLeave={() => setHovered(null)}
                >
                    {panels.map((p, idx) => {
                        const isHovered = hovered === idx;
                        const hasHover = hovered !== null;

                        // ✅ flex dinámico (para reemplazar .panel:hover { flex: 3 })
                        const flexValue = !hasHover ? 1 : (isHovered ? 3 : 1);

                        return (
                            <div
                                key={p.title}
                                style={{ flex: flexValue }}
                                onMouseEnter={() => setHovered(idx)}
                                className={[
                                    "relative overflow-hidden cursor-pointer group",
                                    "transition-[flex,transform,box-shadow] duration-[650ms] ease-[cubic-bezier(0.65,0,0.35,1)]",
                                    "border-b md:border-b-0 md:border-r border-white/10 last:border-0",
                                    // hover: elevación + sombra izquierda
                                    "hover:z-10 hover:translate-x-1 hover:shadow-[-28px_0_55px_rgba(0,0,0,0.45)]",
                                ].join(" ")}
                            >
                                {/* Background image */}
                                <div
                                    className="absolute inset-0 bg-center bg-cover bg-no-repeat brightness-75"
                                    style={{ backgroundImage: `url(${p.img})` }}
                                />

                                {/* Overlay */}
                                <div
                                    className="absolute inset-0 transition-opacity duration-[450ms] opacity-90 group-hover:opacity-70"
                                    style={{
                                        background: "linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.2))"
                                    }}
                                />

                                {/* Content */}
                                <div className="absolute left-[22px] bottom-[18px] z-[2]">
                                    <h2 className="m-0 text-white font-black tracking-wide text-[26px] md:text-[26px] transition-all duration-[450ms] drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)] group-hover:-translate-y-[2px] group-hover:text-[40px]">
                                        {p.title}
                                    </h2>

                                    {/* CTA opcional */}
                                    <div className="mt-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/30 bg-white/15 text-white font-semibold backdrop-blur-md">
                                            Ver más
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Nota: en móvil no hay hover, esto igual se ve como columnas apiladas */}
            </div>
        </div>
    );
};
