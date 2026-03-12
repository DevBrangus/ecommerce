import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import logoBlanco from "../assets/logoblanco.png";
import { LuShoppingCart } from "react-icons/lu";
import { FaSearchLocation } from "react-icons/fa";
import { IoReload } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";
import { GoTrash } from "react-icons/go";

import { getCartItems, removeCartItem, clearCart, updateCartQty } from "../utils/cartStorage";

const PRIMARY = "#AB2121";

export const TopBar = forwardRef(function TopBar(
  { value, onChange, onReload, onSelectCategoria, setPagina = () => { }, pagina },
  ref
) {
  const [cartOpen, setCartOpen] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  const [carrito, setCarrito] = useState(() => getCartItems());

  const cartBoxRef = useRef(null);

  const consultaCategorias = async () => {
    try {
      const url = "https://carnesbrangus.com/tiendaBrangus/productos/CategoriasGetAll.php";
      const res = await fetch(url);
      const response = await res.json();

      if (response?.rpta === "si") setCategorias(Array.isArray(response.data) ? response.data : []);
      else setCategorias([]);
    } catch (err) {
      console.error("Error al consultar categorias:", err);
      setCategorias([]);
    }
  };

  useEffect(() => {
    console.log('VistaProductos ', pagina);
    setCartOpen(false);
    consultaCategorias();
  }, []);

  useEffect(() => {
    const sync = () => setCarrito(getCartItems());
    sync();
    window.addEventListener("cart_updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cart_updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // ✅ Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!cartOpen) return;
    const onDown = (e) => {
      const el = cartBoxRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setCartOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [cartOpen]);

  const cartCount = useMemo(() => {
    return (carrito || []).reduce((acc, it) => acc + Number(it?.cantidad || 0), 0);
  }, [carrito]);

  const cartTotal = useMemo(() => {
    return (carrito || []).reduce((acc, it) => acc + Number(it?.subtotal || 0), 0);
  }, [carrito]);

  const onToggleCart = useCallback(() => {
    setCartOpen((v) => !v);
  }, []);

  const onRemove = useCallback((keyOrId) => {
    const next = removeCartItem(keyOrId);
    setCarrito(next);
  }, []);

  const onClear = useCallback(() => {
    clearCart();
    setCarrito([]);
  }, []);

  const onToggleCartVer = useCallback(() => {
    setCartOpen((v) => !v);
    setPagina('Carrito');
  }, []);





  return (
    <nav ref={ref} className="bg-[#AB2121] antialiased shadow-md flex items-center flex-col fixed top-0 left-0 w-full z-[299]">
      <div className="w-[90%] px-4 mx-auto 2xl:px-0 py-2 border-b border-gray-100/30">
        <div className="flex items-center justify-between gap-4">
          {/* LEFT */}
          <div className="flex items-center space-x-8 flex-1 ">
            <div className="shrink-0">
              <a href="#">
                <img className="block w-auto h-12" src={logoBlanco} alt="Logo" onClick={() => setPagina('VistaProductos')} />
              </a>
            </div>
          </div>

          {/* Buscar */}
          <div className="w-[30%] flex-1 min-w-70 bg-white flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden">
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="px-2 py-2 text-sm outline-none w-full"
              placeholder="Buscar producto..."
            />
            <button type="button" onClick={onReload} className="px-3 py-2 text-slate-600 hover:bg-slate-50" title="Recargar">
              <IoReload className="text-lg" />
            </button>
          </div>

          {/* RIGHT */}
          <div className="flex flex-1 items-center lg:space-x-2 relative justify-end">
            {/* ====== CART BUTTON ====== */}
            <button type="button" onClick={onToggleCart} className="mr-10 flex items-center gap-2 hover:scale-110 transition font-semibold cursor-pointer">
              <LuShoppingCart className="text-white text-xl" />
              <span className="hidden sm:flex text-white">Carrito</span>
              {cartCount > 0 && (
                <span className="min-w-6 h-6 px-2 rounded-full bg-white text-[#AB2121] text-xs font-extrabold flex items-center justify-center shadow">
                  {cartCount}
                </span>
              )}
            </button>

            <div className="flex items-center hover:scale-110 transition font-semibold cursor-pointer">
              <FaSearchLocation className="text-white text-xl" />
              <span className="hidden sm:flex ml-2 text-white">Seguir pedido</span>
            </div>

            {/* ====== CART DROPDOWN ====== */}
            {cartOpen && (
              <div ref={cartBoxRef} className="absolute right-0 top-12 z-50 w-[520px] max-w-[95vw] rounded-lg bg-white p-5 shadow-xl border border-slate-200 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-800">Mi carrito ({cartCount})</p>

                  <button type="button" onClick={() => setCartOpen(false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                    <IoMdClose className="text-lg" />
                  </button>
                </div>

                {/* Items */}
                <div className="max-h-[500px] overflow-auto space-y-5 pr-1">
                  {(carrito || []).length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-sm text-slate-600">
                      Tu carrito está vacío.
                    </div>
                  ) : (
                    (carrito || []).map((it) => {
                      const precio = Number(it?.precio_unitario || it?.valor || 0);
                      const qty = Number(it?.cantidad || 0);
                      const key = it?.cartKey || it?.id;

                      return (
                        <div key={key} className="flex gap-5 border-b border-slate-200 pb-5">
                          {/* Imagen */}
                          <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                            <img
                              src={String(it?.urlRemota || it?.img || "").trim() || "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><rect width='100%' height='100%' fill='#f1f5f9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#64748b' font-family='Arial' font-size='16'>Sin imagen</text></svg>")}
                              alt={it?.producto || "Producto"}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />


                          </div>

                          {/* Contenido */}
                          <div className="flex-1 space-y-3">
                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{it?.producto}</p>

                            <p className="text-sm text-slate-600">${precio.toLocaleString("es-CO")}</p>

                            {/* + / - + delete */}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => setCarrito(updateCartQty(key, -1))}
                                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700"
                                  title="Disminuir"
                                >
                                  −
                                </button>

                                <span className="px-4 py-1 text-sm font-medium">{qty}</span>

                                <button
                                  type="button"
                                  onClick={() => setCarrito(updateCartQty(key, 1))}
                                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700"
                                  title="Aumentar"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => onRemove(key)}
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition"
                                title="Eliminar del carrito"
                              >
                                <GoTrash className="text-xl" />
                              </button>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Subtotal</span>
                              <span className="font-semibold text-slate-900">
                                ${Number(it?.subtotal || 0).toLocaleString("es-CO")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {(carrito || []).length > 0 && (
                  <>
                    <div className="flex justify-between items-center border-t pt-4">
                      <button type="button" onClick={onClear} className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium">
                        Vaciar
                      </button>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="text-xl font-extrabold text-slate-900">${Number(cartTotal || 0).toLocaleString("es-CO")}</p>
                      </div>
                    </div>

                    <button type="button" onClick={onToggleCartVer} className="cursor-pointer w-full py-3 rounded-lg text-white font-semibold transition hover:opacity-95" style={{ background: PRIMARY }}>
                      Ver Carrito
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* CATEGORÍAS */}
      {pagina !== 'Carrito' && pagina !== 'FinalizarPedido' ? (
        <div className="h-12 flex gap-8 justify-center items-center w-[90%]">
          <div className="flex items-center gap-2">
            <p
              onClick={() => {
                setCategoriaActiva(null);
                onSelectCategoria(null);
              }}
              className={`${categoriaActiva === null ? "font-bold underline text-white" : "text-white hover:underline"} text-lg cursor-pointer transition`}
              title="Ver todos los productos"
            >
              Todos
            </p>
          </div>

          {categorias.map((c) => (
            <p
              key={c.id}
              onClick={() => {
                setCategoriaActiva(c.id);
                onSelectCategoria(c.id);
              }}
              className={`${categoriaActiva === c.id ? "font-bold underline text-white" : "text-white hover:underline"} text-lg cursor-pointer transition`}
            >
              {c.nombre}
            </p>
          ))}
        </div>
      ) : null}


      {/* <div className="h-12 flex gap-8 justify-center items-center w-[90%]">
        <div className="flex items-center gap-2">
          <p
            onClick={() => {
              setCategoriaActiva(null);
              onSelectCategoria(null);
            }}
            className={`${categoriaActiva === null ? "font-bold underline text-white" : "text-white hover:underline"} text-lg cursor-pointer transition`}
            title="Ver todos los productos"
          >
            Todos
          </p>
        </div>

        {categorias.map((c) => (
          <p
            key={c.id}
            onClick={() => {
              setCategoriaActiva(c.id);
              onSelectCategoria(c.id);
            }}
            className={`${categoriaActiva === c.id ? "font-bold underline text-white" : "text-white hover:underline"} text-lg cursor-pointer transition`}
          >
            {c.nombre}
          </p>
        ))}
      </div> */}
    </nav>
  );
});
