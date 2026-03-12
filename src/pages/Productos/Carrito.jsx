// src/pages/Cart/Carrito.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCartItems, updateCartQty, removeCartItem, clearCart } from "../../utils/cartStorage";
import { ProductCard } from "../../Components/ProductCard";
import { ModalDetalleProducto } from "../Productos/ModalDetalleProducto";
import { GoTrash } from "react-icons/go";
import { TbMeat } from "react-icons/tb";

const PRIMARY = "#c43728";
const BASE_IMG = "https://carnesbrangus.com/tiendaBrangus";
const CART_KEY = "cart_items";

const FALLBACK_IMG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
      <rect width='100%' height='100%' fill='#f1f5f9'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#64748b' font-family='Arial' font-size='16'>Sin imagen</text>
    </svg>`
    );

const moneyCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;

const resolveImg = (raw) => {
    const u = String(raw || "").trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/")) return `${BASE_IMG}${u}`;
    return u;
};

function QtyControl({ qty, onDec, onInc }) {
    return (
        <div className="flex items-center">
            <button type="button" onClick={onDec} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200" aria-label="Disminuir">
                <span className="text-slate-800 text-lg leading-none">−</span>
            </button>
            <input readOnly value={qty} className="w-12 shrink-0 border-0 bg-transparent text-center text-sm font-semibold text-slate-900 focus:outline-none focus:ring-0" />
            <button type="button" onClick={onInc} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200" aria-label="Aumentar">
                <span className="text-slate-800 text-lg leading-none">+</span>
            </button>
        </div>
    );
}

function CartItem({ item, onInc, onDec, onRemove }) {
    const titulo = String(item?.producto || item?.title || "").trim();
    const img = String(item?.urlRemota || item?.img || "").trim() || FALLBACK_IMG;

    const qty = Number(item?.cantidad || item?.qty || 0);
    const unit = Number(item?.precio_unitario || item?.price || item?.valor || 0);
    const subtotal = Number(item?.subtotal || unit * qty || 0);

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="space-y-4 md:flex md:items-center md:justify-between md:gap-6 md:space-y-0">
                <div className="shrink-0 md:order-1">
                    <div className="h-20 w-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={img} alt={titulo || "Producto"} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    </div>
                </div>

                <div className="flex items-center justify-between md:order-3 md:justify-end gap-4">
                    <QtyControl qty={qty} onDec={onDec} onInc={onInc} />
                    <div className="text-end md:order-4 md:w-40">
                        <p className="text-base font-extrabold text-slate-900">{moneyCOP(subtotal)}</p>
                        <p className="text-xs text-slate-500">{moneyCOP(unit)} c/u</p>
                    </div>
                </div>

                <div className="w-full min-w-0 flex-1 space-y-3 md:order-2 md:max-w-md">
                    <p className="text-base font-semibold text-slate-900 line-clamp-2">{titulo}</p>

                    <div className="flex items-center gap-4">
                        <button type="button" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 hover:underline">
                            Add to Favorites
                        </button>

                        <button type="button" onClick={onRemove} className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition" title="Eliminar del carrito">
                            <GoTrash className="text-xl" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const Carrito = ({ setPagina = () => { }, topbarH = 0, }) => {
    const [items, setItems] = useState(() => getCartItems());

    // ✅ Modal detalle (mismo que VistaProductos)
    const [openDetalle, setOpenDetalle] = useState(false);
    const [prodSel, setProdSel] = useState(null);

    // ✅ People also bought (desde el servicio)
    const [alsoBought, setAlsoBought] = useState([]);
    const [loadingAlso, setLoadingAlso] = useState(false);
    const [errorAlso, setErrorAlso] = useState("");

    const abortAlsoRef = useRef(null);

    const normalizarProducto = useCallback((p) => {
        const id = Number(p?.id ?? 0);
        const codigoInterno = Number(p?.codigoInterno ?? 0);

        const valor = Number(p?.precio?.valor ?? p?.valor ?? 0);
        const descuento = Number(p?.precio?.descuento ?? p?.descuento ?? 0);
        const oferta = Number(p?.precio?.oferta ?? p?.oferta ?? 0);

        const urlRemota = resolveImg(p?.url);

        return {
            id,
            codigoInterno,
            producto: String(p?.producto || ""),
            descripcion: p?.descripcion ?? "",
            valor: Number.isFinite(valor) ? valor : 0,
            descuento: Number.isFinite(descuento) ? descuento : 0,
            oferta: Number.isFinite(oferta) ? oferta : 0,
            categoria: p?.categoria,
            presentacion: p?.presentacion,
            preparacion: p?.preparacion,
            urlRemota,
            rating: Number(p?.rating || 5),
            reviews: Number(p?.reviews || 0),
        };
    }, []);

    // ✅ getImg compatible con ProductCard (sin thumbs aquí)
    const getImg = useCallback(async (p) => {
        const u = String(p?.urlRemota || "").trim();
        return u || FALLBACK_IMG;
    }, []);

    const handleOpenDetalle = useCallback((prod) => {
        setProdSel(prod);
        setOpenDetalle(true);
    }, []);

    const handleCloseDetalle = useCallback(() => {
        setOpenDetalle(false);
        setProdSel(null);
    }, []);

    const fetchAlsoBought = useCallback(async () => {
        const endpoint = "https://carnesbrangus.com/tiendaBrangus/productos/ProductosGetAll.php";

        if (abortAlsoRef.current) abortAlsoRef.current.abort();
        const controller = new AbortController();
        abortAlsoRef.current = controller;

        setLoadingAlso(true);
        setErrorAlso("");

        const tryFetch = async (paramsObj) => {
            const qs = new URLSearchParams();
            Object.entries(paramsObj || {}).forEach(([k, v]) => {
                if (v === null || v === undefined || v === "") return;
                qs.set(k, String(v));
            });

            const url = `${endpoint}?${qs.toString()}`;
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) return null;

            const json = await res.json().catch(() => null);
            if (!json || json.rpta !== "si" || !Array.isArray(json.data)) return null;

            return json.data.map(normalizarProducto);
        };

        try {
            let data = await tryFetch({ page: 1, limit: 12, oferta: 1 });
            if (!data || data.length === 0) data = await tryFetch({ page: 1, limit: 12 });

            if (!data) {
                setAlsoBought([]);
                setErrorAlso("No se pudo cargar la sección de recomendados.");
                return;
            }

            const inCart = new Set((getCartItems() || []).map((it) => String(it?.cartKey || it?.id || "").trim()).filter(Boolean));

            const filtered = data.filter((p) => {
                const key = p?.codigoInterno ? `COD:${p.codigoInterno}` : `ID:${p.id}`;
                return !inCart.has(key);
            });

            setAlsoBought(filtered.slice(0, 3));
        } catch (e) {
            if (e?.name === "AbortError") return;
            setAlsoBought([]);
            setErrorAlso("Ocurrió un error cargando recomendados.");
        } finally {
            setLoadingAlso(false);
        }
    }, [normalizarProducto]);

    // ✅ Mantener Carrito sincronizado con TopBar / VistaProductos
    useEffect(() => {
        const sync = () => setItems(getCartItems());
        sync();
        window.addEventListener("cart_updated", sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener("cart_updated", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    // ✅ Cargar “People also bought” cuando entra a la página
    useEffect(() => {
        fetchAlsoBought();
        return () => abortAlsoRef.current?.abort();
    }, [fetchAlsoBought]);

    const getPrecioFinal = useCallback((prod) => {
        const valor = Number(prod?.valor || 0);
        const desc = Number(prod?.descuento || 0);
        return desc > 0 ? Math.max(0, valor - (valor * desc) / 100) : valor;
    }, []);

    const getKey = useCallback((prod) => {
        const codigo = String(prod?.codigoInterno ?? "").trim();
        if (codigo && codigo !== "0" && codigo !== "NaN") return `COD:${codigo}`;
        const id = String(prod?.id ?? "").trim();
        return `ID:${id}`;
    }, []);

    // ✅ Add to cart desde “People also bought”
    const handleAdd = useCallback(
        (prod) => {
            try {
                const raw = localStorage.getItem(CART_KEY);
                const cart = raw ? JSON.parse(raw) : [];

                const key = getKey(prod);
                if (!key || key === "ID:" || key === "COD:") return;

                const precioFinal = getPrecioFinal(prod);
                const idx = cart.findIndex((x) => String(x?.cartKey || "") === key);

                const itemSafe = {
                    ...prod,
                    cartKey: key,
                    categoria_nombre: String(prod?.categoria?.nombre || ""),
                    presentacion_nombre: String(prod?.presentacion?.nombre || ""),
                    precio_unitario: precioFinal,
                    urlRemota: String(prod?.urlRemota || "").trim(),
                };

                if (idx >= 0) {
                    const newQty = Number(cart[idx]?.cantidad || 0) + 1;
                    cart[idx] = { ...cart[idx], ...itemSafe, cantidad: newQty, subtotal: precioFinal * newQty, updated_at: new Date().toISOString() };
                } else {
                    cart.push({ ...itemSafe, cantidad: 1, subtotal: precioFinal, added_at: new Date().toISOString() });
                }

                localStorage.setItem(CART_KEY, JSON.stringify(cart));
                window.dispatchEvent(new Event("cart_updated"));
                fetchAlsoBought();
            } catch (e) {
                console.error("Error guardando carrito:", e);
            }
        },
        [fetchAlsoBought, getKey, getPrecioFinal]
    );

    const onInc = useCallback((key) => setItems(updateCartQty(key, 1)), []);
    const onDec = useCallback((key) => setItems(updateCartQty(key, -1)), []);
    const onRemove = useCallback((key) => setItems(removeCartItem(key)), []);
    const onClear = useCallback(() => {
        clearCart();
        setItems([]);
        window.dispatchEvent(new Event("cart_updated"));
        fetchAlsoBought();
    }, [fetchAlsoBought]);

    // ======================================================
    // ✅ TOTALES REALES (como tu imagen)
    // ======================================================
    const subtotalFinal = useMemo(() => {
        return (items || []).reduce((acc, it) => acc + Number(it?.subtotal || 0), 0);
    }, [items]);

    const subtotalAntesDescuento = useMemo(() => {
        return (items || []).reduce((acc, it) => {
            const qty = Number(it?.cantidad || 0);
            if (qty <= 0) return acc;

            const valor = Number(it?.valor || 0);
            const precioUnit = Number(it?.precio_unitario || 0);
            const descPct = Number(it?.descuento || 0);

            // 1) si viene valor, perfecto
            if (valor > 0) return acc + (valor * qty);

            // 2) reconstruir precio original desde precio_final + descuento%
            if (precioUnit > 0 && descPct > 0 && descPct < 100) {
                const valorEstimado = precioUnit / (1 - (descPct / 100));
                return acc + (valorEstimado * qty);
            }

            // 3) fallback: suma el final para no romper
            return acc + (precioUnit * qty);
        }, 0);
    }, [items]);

    const descuentoTotal = useMemo(() => {
        const d = Number(subtotalAntesDescuento || 0) - Number(subtotalFinal || 0);
        return d > 0 ? d : 0;
    }, [subtotalAntesDescuento, subtotalFinal]);

    const IVA_RATE = 0; // por ahora
    const iva = useMemo(() => {
        return Math.max(0, Math.round((subtotalFinal * IVA_RATE) * 100) / 100);
    }, [subtotalFinal]);

    const BOLSA_UNIT = 350;
    const bolsasQty = useMemo(() => ((items || []).length > 0 ? 1 : 0), [items]);
    const bolsaTotal = useMemo(() => bolsasQty * BOLSA_UNIT, [bolsasQty]);

    const total = useMemo(() => {
        return Math.max(0, subtotalFinal + iva + bolsaTotal);
    }, [subtotalFinal, iva, bolsaTotal]);

    const cartCount = useMemo(() => (items || []).reduce((acc, it) => acc + Number(it?.cantidad || 0), 0), [items]);

    return (
        <>
            <section className="bg-white py-5 antialiased ">
                <div className="mx-auto max-w-7xl px-1 2xl:px-0">
                    <div className="flex justify-center items-center pb-2">

                        <h2 className="text-[#AB2121] text-4xl  font-semibold">Mi carrito</h2>
                    </div>
                    <div className="mt-6 sm:mt-8 md:gap-6 lg:flex lg:items-start xl:gap-8">
                        <div className="mx-auto w-full flex-none lg:max-w-2xl xl:max-w-4xl">
                            <div className="space-y-6">
                                {items.map((it) => {
                                    const key = String(it?.cartKey || it?.id || "").trim();
                                    return <CartItem key={key} item={it} onInc={() => onInc(key)} onDec={() => onDec(key)} onRemove={() => onRemove(key)} />;
                                })}

                                {items.length === 0 ? (
                                    <div className="rounded-lg border gap-4 border-slate-200 bg-white p-8 text-center shadow-sm justify-center items-center flex flex-col">
                                        <p className="text-base font-semibold text-slate-900 ">Tu carrito está vacío</p>
                                        <button type="button" onClick={() => setPagina('VistaProductos')} className="justify-center w-65 px-5 py-2.5 rounded-lg text-[#AB2121] hover:text-white text-sm font-semibold flex items-center gap-2 border  hover:bg-[#AB2121] transform-gpu will-change-transform transition-transform duration-150 ease-out hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 appearance-none">
                                            <TbMeat className="text-xl" />
                                            Seguir Seleccionando
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            {/* ✅ People also bought usando ProductCard */}
                            <div className="hidden xl:mt-8 xl:block">
                                <div className="flex items-center justify-between gap-4">
                                    <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Carrito</h2>

                                    {items.length > 0 ? (
                                        <button type="button" onClick={onClear} className="px-5 py-2.5 rounded-lg text-[#AB2121] hover:text-white text-sm font-semibold flex items-center gap-2 border border-[#AB2121] hover:bg-[#AB2121] transform-gpu will-change-transform transition-transform duration-150 ease-out hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 appearance-none">
                                            <GoTrash className="text-xl" />
                                            Vaciar Carrito
                                        </button>
                                    ) : null}
                                </div>

                                {loadingAlso ? (
                                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600">Cargando recomendados...</div>
                                ) : errorAlso ? (
                                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 text-center text-red-600">{errorAlso}</div>
                                ) : (
                                    <div className="mt-6 grid grid-cols-3 gap-4 sm:mt-8">
                                        {alsoBought.map((p) => (
                                            <ProductCard key={String(p?.codigoInterno || p?.id)} p={p} fallbackImg={FALLBACK_IMG} onAdd={handleAdd} onOpen={handleOpenDetalle} getImg={getImg} />
                                        ))}

                                        {alsoBought.length === 0 ? (
                                            <div className="col-span-3 rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600">No hay recomendados para mostrar.</div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mx-auto mt-6 max-w-4xl flex-1 space-y-6 lg:mt-0 lg:w-full">
                            {/* ✅ RESUMEN estilo tu imagen + cálculos reales */}
                            <div className="rounded-lg border border-[#c43728] bg-white p-4 shadow-sm sm:p-6">
                                <p className="text-xl font-semibold text-slate-900">Total del carrito</p>

                                <div className="mt-4 divide-y divide-slate-200">
                                    <dl className="flex items-center justify-between gap-4 py-3">
                                        <dt className="text-base font-semibold text-slate-700">Subtotal</dt>
                                        <dd className="text-base font-semibold text-slate-900">{moneyCOP(subtotalAntesDescuento)}</dd>
                                    </dl>

                                    <dl className="flex items-center justify-between gap-4 py-3">
                                        <dt className="text-base font-semibold text-slate-700">Descuento</dt>
                                        <dd className="text-base font-semibold text-slate-900">{descuentoTotal > 0 ? `-${moneyCOP(descuentoTotal)}` : moneyCOP(0)}</dd>
                                    </dl>

                                    <dl className="flex items-center justify-between gap-4 py-3">
                                        <dt className="text-base font-semibold text-slate-700">Impuestos (IVA)</dt>
                                        <dd className="text-base font-semibold text-slate-900">{moneyCOP(iva)}</dd>
                                    </dl>

                                    <dl className="flex items-center justify-between gap-4 py-3">
                                        <dt className="text-base font-semibold text-slate-700">{`Bolsa x${bolsasQty}`}</dt>
                                        <dd className="text-base font-semibold text-slate-900">{moneyCOP(bolsaTotal)}</dd>
                                    </dl>

                                    <div className="py-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="text-base font-semibold text-slate-700">Envío</p>
                                            <p className="text-base font-semibold text-slate-900">{moneyCOP(0)}</p>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">Los costes de envío se calculan al finalizar la compra</p>
                                    </div>

                                    <dl className="flex items-center justify-between gap-4 py-4">
                                        <dt className="text-lg font-extrabold text-[#c43728]">Total</dt>
                                        <dd className="text-lg font-extrabold text-[#c43728]">{moneyCOP(total)}</dd>
                                    </dl>
                                </div>

                                <div className="flex flex-col gap-3 w-full">

                                    {/* BOTÓN PRINCIPAL */}
                                    <button
                                        type="button"
                                        onClick={() => setPagina('FinalizarPedido')}
                                        className="w-full h-11 rounded-lg font-semibold text-white bg-[#c43728] transition-all duration-200 ease-in-out hover:bg-white hover:text-[#c43728] hover:ring-1 hover:ring-[#c43728] focus:outline-none"
                                    >
                                        Ir a pagar
                                    </button>

                                    {/* BOTÓN SECUNDARIO */}
                                    <button
                                        type="button"
                                        onClick={() => setPagina('VistaProductos')}
                                        className="w-full h-11 rounded-lg font-semibold flex items-center justify-center gap-2 border border-[#c43728] text-[#c43728] bg-white transition-all duration-200 ease-in-out hover:bg-[#c43728] hover:text-white focus:outline-none"
                                    >
                                        <TbMeat className="text-lg" />
                                        Seguir seleccionando
                                    </button>

                                </div>


                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {openDetalle && (
                <ModalDetalleProducto
                    p={prodSel}
                    onClose={handleCloseDetalle}
                    onAdd={handleAdd}
                    fallbackImg={FALLBACK_IMG}
                    topbarH={topbarH}
                    getImg={getImg}
                />
            )}
        </>
    );
};
