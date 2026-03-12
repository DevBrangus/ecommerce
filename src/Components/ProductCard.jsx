import { memo, useEffect, useMemo, useRef, useState } from "react";
import { IoMdPricetags } from "react-icons/io";
import { RiScales2Fill } from "react-icons/ri";
import { MdAddShoppingCart } from "react-icons/md";

const PRIMARY = "#c43728";
const COLOR_BASE = "#AB2121";

export const ProductCard = memo(function ProductCard({ p, fallbackImg, onAdd, onOpen, getImg }) {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgSrc, setImgSrc] = useState("");
    const [imgError, setImgError] = useState(false);

    const boxRef = useRef(null);

    const precioTexto = useMemo(() => {
        const v = Number(p?.valor || 0);
        if (!(v > 0)) return "";
        return `$${v.toLocaleString("es-CO")}`;
    }, [p?.valor]);

    // Reset cuando cambia el producto
    useEffect(() => {
        setImgLoaded(false);
        setImgError(false);
        setImgSrc("");
    }, [p?.id, p?.urlRemota]);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;

        let cancelled = false;

        const io = new IntersectionObserver(
            async (entries) => {
                const entry = entries?.[0];
                if (!entry?.isIntersecting) return;

                io.disconnect();

                // ✅ fallback URL directa (siempre intenta mostrar algo)
                const directUrl = String(p?.urlRemota || p?.img || "").trim();

                try {
                    if (typeof getImg === "function") {
                        const url = await getImg(p);
                        const finalUrl = String(url || "").trim() || directUrl;
                        if (!cancelled) setImgSrc(finalUrl);
                    } else {
                        if (!cancelled) setImgSrc(directUrl);
                    }
                } catch {
                    if (!cancelled) {
                        setImgSrc(directUrl);
                        setImgError(!directUrl); // si ni directUrl hay, marcar error
                    }
                }
            },
            { root: null, rootMargin: "350px", threshold: 0.01 }
        );

        io.observe(el);

        return () => {
            cancelled = true;
            io.disconnect();
        };
    }, [getImg, p]);

    return (
        <div ref={boxRef} className="bg-white border border-slate-200 rounded-lg shadow p-4 flex flex-col">
            <div className="relative w-full rounded-lg border border-slate-200 overflow-hidden bg-slate-100" style={{ height: "13rem" }}>
                {Number(p?.oferta) === 1 && (
                    <div className="absolute -left-10 top-4 rotate-[-35deg] z-20">
                        <div className="px-12 text-white text-lg font-semibold tracking-wider shadow-lg" style={{ background: PRIMARY }}>
                            OFERTA
                        </div>
                    </div>
                )}

                {Number(p?.descuento) > 0 && (
                    <div className="absolute top-3 right-3 z-20">
                        <span className="px-3 rounded-full bg-black/70 text-white text-lg font-semibold shadow-md">-{Number(p.descuento)}%</span>
                    </div>
                )}

                {!imgLoaded && <div className="absolute inset-0 z-10 animate-pulse bg-slate-200" />}

                <img
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                    src={imgError ? fallbackImg : (imgSrc || fallbackImg)}
                    alt={p?.producto || "Producto"}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    width="500"
                    height="350"
                    style={{ aspectRatio: "10/7" }}
                    onLoad={() => setImgLoaded(true)}
                    onClick={() => onOpen?.(p)}
                    onError={() => {
                        setImgError(true);
                        setImgLoaded(true);
                    }}
                />
            </div>

            <div className="pt-4 flex flex-col gap-2 flex-1">
                <p onClick={() => onOpen?.(p)} className="text-xl font-semibold leading-tight text-[#AB2121] hover:underline line-clamp-2 min-h-12 cursor-pointer">
                    {p?.producto}
                </p>

                <ul className="flex flex-col items-start gap-1">
                    {p?.categoria?.nombre ? (
                        <li className="flex items-center gap-2 text-sm text-slate-500">
                            <IoMdPricetags className="w-4 h-4 shrink-0" style={{ color: COLOR_BASE }} />
                            <span className="leading-tight">{p.categoria.nombre}</span>
                        </li>
                    ) : null}

                    {p?.presentacion?.nombre ? (
                        <li className="flex items-center gap-2 text-sm text-slate-500">
                            <RiScales2Fill className="w-4 h-4 shrink-0" style={{ color: COLOR_BASE }} />
                            <span className="leading-tight">{p.presentacion.nombre}</span>
                        </li>
                    ) : null}
                </ul>

                <div className="mt-auto  pt-3 flex flex-col  2xl:flex-row items-start 2xl:justify-between  2xl:items-center  gap-3">
                    <p className="font-extrabold text-slate-900 tracking-tight leading-none text-xl lg:text-2xl whitespace-nowrap ">
                        {precioTexto ? precioTexto : <span className="text-sm font-semibold text-slate-500">Consultar</span>}
                    </p>

                    <button
                        type="button"
                        onClick={() => onAdd?.(p)}
                        className="flex items-center 2xl:w-auto w-full justify-center gap-2 px-3 lg:px-5 py-2 rounded-lg text-[#AB2121] hover:text-white text-sm font-semibold border border-[#AB2121] hover:bg-[#AB2121] transition-colors shrink-0"
                    >
                        <MdAddShoppingCart className="h-5 w-5" />
                        <span className="hidden lg:inline">Agregar</span>
                    </button>
                </div>
            </div>
        </div>
    );
});
