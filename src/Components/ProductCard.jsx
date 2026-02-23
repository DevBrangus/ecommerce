import { memo, useEffect, useMemo, useRef, useState } from "react";
import { IoMdPricetags } from "react-icons/io";
import { RiScales2Fill } from "react-icons/ri";
import { MdAddShoppingCart } from "react-icons/md";

const PRIMARY = "#c43728";
const COLOR_BASE = "#AB2121";

export const ProductCard = memo(function ProductCard({ p, fallbackImg, onAdd, onOpen }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const boxRef = useRef(null);

  const imgSrc = useMemo(() => (p?.img ? String(p.img) : ""), [p?.img]);

  useEffect(() => {
    setImgLoaded(false);
  }, [imgSrc]);

  return (
    <div ref={boxRef} className="bg-white border border-slate-200 rounded-lg shadow p-4 flex flex-col" style={{ contentVisibility: "auto", containIntrinsicSize: "350px" }}>
      <div className="relative h-52 w-full rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
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
          src={imgSrc || fallbackImg}
          alt={p?.producto || "Producto"}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          width="500"
          height="350"
          style={{ aspectRatio: "10/7" }}
          onLoad={() => setImgLoaded(true)}
          onClick={() => onOpen?.(p)}
          onError={(e) => {
            e.currentTarget.src = fallbackImg;
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

        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {Number(p?.valor) > 0 ? `$${Number(p.valor).toLocaleString("es-CO")}` : <span className="text-base font-semibold text-slate-500">Consultar</span>}
          </p>

          <button type="button" onClick={() => onAdd?.(p)} className="px-5 py-2.5 rounded-lg text-[#AB2121] hover:text-white text-sm font-semibold flex items-center gap-2 border border-[#AB2121] hover:bg-[#AB2121] transform-gpu will-change-transform transition-transform duration-150 ease-out hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 appearance-none">
            <MdAddShoppingCart className="h-5 w-5" />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
});
