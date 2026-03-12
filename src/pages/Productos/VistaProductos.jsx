import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { IoMdClose } from "react-icons/io";
import { ProductCard } from "../../Components/ProductCard";
import { ModalDetalleProducto } from "./ModalDetalleProducto";
import { toast } from "react-toastify";
const PRIMARY = "#c43728";
const BASE_IMG = "https://carnesbrangus.com/tiendaBrangus";

const FALLBACK_IMG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
      <rect width='100%' height='100%' fill='#f1f5f9'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#64748b' font-family='Arial' font-size='22'>
        Sin imagen
      </text>
    </svg>`
    );

const resolveImg = (raw) => {
    const u = String(raw || "").trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/")) return `${BASE_IMG}${u}`;
    return u;
};

// ===============================
// THUMB CLIENT-SIDE (reduce jank)
// ===============================
const MAX_THUMB_W = 700; // 450-700 recomendado
const THUMB_QUALITY = 0.78;

const waitIdle = () =>
    new Promise((resolve) => {
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            window.requestIdleCallback(() => resolve(), { timeout: 800 });
        } else {
            setTimeout(resolve, 30);
        }
    });

const blobToThumbUrl = async (blob) => {
    const bmp = await createImageBitmap(blob);

    const srcW = bmp.width;
    const srcH = bmp.height;

    const scale = Math.min(1, MAX_THUMB_W / Math.max(1, srcW));
    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = dstW;
    canvas.height = dstH;

    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, dstW, dstH);

    bmp.close?.();

    const thumbBlob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b || blob), "image/webp", THUMB_QUALITY);
    });

    return URL.createObjectURL(thumbBlob);
};

export const VistaProductos = ({ q = "", idCategoria = null, reloadKey = 0, topbarH = 0, setPagina = () => { } }) => {
    const [openFilter, setOpenFilter] = useState(false);
    const [openSort, setOpenSort] = useState(false);
    const [tab, setTab] = useState("brand");
    const [sort, setSort] = useState("popular");

    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    const [page, setPage] = useState(1);
    const limit = 15;

    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [openDetalle, setOpenDetalle] = useState(false);
    const [prodSel, setProdSel] = useState(null);

    const abortRef = useRef(null);

    // ===============================
    // Cache en memoria (blob thumbs)
    // ===============================
    const imagenesCache = useRef(new Map()); // id -> { url, ts }
    const imagenesPendientes = useRef(new Map()); // id -> Promise<string>

    const MAX_CACHE = 220;
    const TTL_MS = 1000 * 60 * 40;

    // Concurrencia de creación de thumbs (evita tirones)
    const inflight = useRef(0);
    const MAX_CONCURRENCY = 2;

    const waitSlot = async () => {
        while (inflight.current >= MAX_CONCURRENCY) {
            await new Promise((r) => setTimeout(r, 50));
        }
    };

    useEffect(() => {
        return () => {
            for (const [, item] of imagenesCache.current.entries()) {
                if (item?.url) {
                    try {
                        URL.revokeObjectURL(item.url);
                    } catch { }
                }
            }
            imagenesCache.current.clear();
            imagenesPendientes.current.clear();
        };
    }, []);

    const getImg = useCallback(async (prod) => {
        const id = String(prod?.id ?? "").trim();
        const urlRemota = String(prod?.urlRemota ?? "").trim();
        if (!id || !urlRemota) return FALLBACK_IMG;

        const hit = imagenesCache.current.get(id);
        if (hit?.url) {
            if (!TTL_MS || Date.now() - (hit.ts || 0) < TTL_MS) return hit.url;
            try {
                URL.revokeObjectURL(hit.url);
            } catch { }
            imagenesCache.current.delete(id);
        }

        const pending = imagenesPendientes.current.get(id);
        if (pending) return pending;

        const p = (async () => {
            await waitSlot();
            inflight.current += 1;

            try {
                // ✅ evita pelear con el scroll
                await waitIdle();

                const res = await fetch(urlRemota, { cache: "no-store" });
                if (!res.ok) return FALLBACK_IMG;

                const blob = await res.blob();

                // ✅ clave: miniatura
                const thumbUrl = await blobToThumbUrl(blob);

                imagenesCache.current.set(id, { url: thumbUrl, ts: Date.now() });

                if (imagenesCache.current.size > MAX_CACHE) {
                    const firstKey = imagenesCache.current.keys().next().value;
                    const first = imagenesCache.current.get(firstKey);
                    if (first?.url) {
                        try {
                            URL.revokeObjectURL(first.url);
                        } catch { }
                    }
                    imagenesCache.current.delete(firstKey);
                }

                return thumbUrl;
            } catch {
                return FALLBACK_IMG;
            } finally {
                inflight.current = Math.max(0, inflight.current - 1);
            }
        })();

        imagenesPendientes.current.set(id, p);

        try {
            return await p;
        } finally {
            imagenesPendientes.current.delete(id);
        }
    }, []);

    const handleOpenDetalle = useCallback((prod) => {
        setProdSel(prod);
        setOpenDetalle(true);
        setOpenFilter(false);
        setOpenSort(false);
    }, []);

    const handleCloseDetalle = useCallback(() => {
        setOpenDetalle(false);
        setProdSel(null);
    }, []);

    const normalizarProducto = useCallback((p) => {
        const id = Number(p?.id ?? 0);
        const codigoInterno = Number(p?.codigoInterno ?? 0);

        const valor = Number(p?.precio?.valor ?? 0);
        const descuento = Number(p?.precio?.descuento ?? 0);
        const oferta = Number(p?.precio?.oferta ?? 0);

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

    const cargarProductos = useCallback(
        async ({ qParam = "", pageParam = 1, append = false } = {}) => {
            const endpoint = "https://carnesbrangus.com/tiendaBrangus/productos/ProductosGetAll.php";

            if (abortRef.current) abortRef.current.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setCargando(true);
            setError("");

            try {
                const qs = new URLSearchParams();
                if (idCategoria !== null && idCategoria !== "") qs.set("idCategoria", String(idCategoria));
                qs.set("page", String(pageParam));
                qs.set("limit", String(limit));
                if (qParam?.trim()) qs.set("q", qParam.trim());

                const url = `${endpoint}?${qs.toString()}`;
                const res = await fetch(url, { signal: controller.signal });

                if (!res.ok) {
                    setError("No se pudieron cargar los productos");
                    if (!append) setProductos([]);
                    setTotal(0);
                    setTotalPages(1);
                    return;
                }

                const json = await res.json().catch(() => null);

                if (!json || json.rpta !== "si" || !Array.isArray(json.data)) {
                    setError(json?.mensaje || "Respuesta inválida al cargar productos");
                    if (!append) setProductos([]);
                    setTotal(0);
                    setTotalPages(1);
                    return;
                }

                const normalizados = json.data.map(normalizarProducto);

                setProductos((prev) => {
                    const next = append ? [...prev, ...normalizados] : normalizados;
                    return next.length > 60 ? next.slice(next.length - 60) : next;
                });

                setTotal(Number(json?.paginacion?.total || 0));
                setTotalPages(Number(json?.paginacion?.totalPages || 1));
            } catch (e) {
                if (e?.name === "AbortError") return;
                setError("Ocurrió un error cargando productos");
                if (!append) setProductos([]);
                setTotal(0);
                setTotalPages(1);
            } finally {
                setCargando(false);
            }
        },
        [idCategoria, limit, normalizarProducto]
    );

    useEffect(() => {
        setPage(1);
        cargarProductos({ qParam: q, pageParam: 1, append: false });
        return () => abortRef.current?.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, idCategoria, reloadKey]);

    useEffect(() => {
        if (page === 1) return;
        cargarProductos({ qParam: q, pageParam: page, append: true });
        return () => abortRef.current?.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const closeAllPopups = useCallback(() => {
        setOpenSort(false);
        setOpenFilter(false);
    }, []);

    const productosOrdenados = useMemo(() => {
        const arr = [...productos];
        const getDiscountPct = (p) => Number(p?.descuento || 0);

        if (sort === "newest") return arr.sort((a, b) => (b.id || 0) - (a.id || 0));
        if (sort === "priceUp") return arr.sort((a, b) => (a.valor || 0) - (b.valor || 0));
        if (sort === "priceDown") return arr.sort((a, b) => (b.valor || 0) - (a.valor || 0));
        if (sort === "discount") return arr.sort((a, b) => getDiscountPct(b) - getDiscountPct(a));

        return arr.sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)) || (Number(b.reviews || 0) - Number(a.reviews || 0)));
    }, [productos, sort]);

    const onCargarMas = useCallback(() => {
        if (cargando) return;
        if (page >= totalPages) return;
        setPage((p) => p + 1);
    }, [cargando, page, totalPages]);

    const CART_KEY = "cart_items";

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

    const handleAdd = useCallback((prod) => {
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
                // ✅ Persistente (NO blob)
                urlRemota: String(prod?.urlRemota || "").trim(),
            };

            if (idx >= 0) {
                const newQty = Number(cart[idx]?.cantidad || 0) + 1;
                cart[idx] = {
                    ...cart[idx],
                    ...itemSafe,
                    cantidad: newQty,
                    subtotal: precioFinal * newQty,
                    updated_at: new Date().toISOString(),
                };
            } else {
                cart.push({
                    ...itemSafe,
                    cantidad: 1,
                    subtotal: precioFinal,
                    added_at: new Date().toISOString(),
                });
            }
            toast.info('Producto agregado Corectamente');

            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            window.dispatchEvent(new Event("cart_updated"));
        } catch (e) {
            console.error("Error guardando carrito:", e);
        }
    }, [getKey, getPrecioFinal]);


    const cards = useMemo(() => {
        return productosOrdenados.map((p) => (
            <ProductCard key={p.id} p={p} fallbackImg={FALLBACK_IMG} onAdd={handleAdd} onOpen={handleOpenDetalle} getImg={getImg} />
        ));
    }, [productosOrdenados, handleAdd, handleOpenDetalle, getImg]);

    return (
        <>
            <section className="bg-slate-50 py-2 antialiased overflow-x-hidden">
                <article className="w-[90%] mx-auto flex flex-col gap-2">
                    <header className="bg-white border border-slate-200 rounded-lg shadow p-2 md:p-4 ">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                            <div className=" flex items-center justify-center">
                                <p className="text-slate-800 text-xl md:text-2xl font-semibold">Productos</p>
                           
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-3">
                       
                                <div className="relative">
                                    <button type="button" onClick={() => { setOpenSort((v) => !v); setOpenFilter(false); }} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium flex items-center gap-2">
                                        Ordenar
                                    </button>

                                    {openSort && (
                                        <div className="absolute right-0  w-48 rounded-lg bg-white border border-slate-200 shadow z-50 overflow-hidden">
                                            {[
                                                ["popular", "El más popular"],
                                                ["newest", "Más nuevo"],
                                                ["priceUp", "Precio ↑"],
                                                ["priceDown", "Precio ↓"],
                                                ["discount", "Descuento %"],
                                            ].map(([key, label]) => (
                                                <button key={key} type="button" onClick={() => { setSort(key); setOpenSort(false); }} className={`${sort === key ? "bg-slate-50 text-slate-900" : "text-slate-600"} w-full text-left px-3 py-2 text-sm hover:bg-slate-50 hover:text-slate-900`}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </header>

                    {cargando && page === 1 && <div className="w-full bg-white border border-slate-200 rounded-lg shadow p-6 text-center text-slate-600">Cargando productos...</div>}
                    {!cargando && error && <div className="w-full bg-white border border-slate-200 rounded-lg shadow p-6 text-center text-red-600">{error}</div>}

                    {!error && (                       <>
                       

                            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 w-full min-w-0">
                                {cards}

                                {!cargando && productosOrdenados.length === 0 && (
                                    <div className="col-span-full bg-white border border-slate-200 rounded-lg shadow p-6 text-center text-slate-600">No hay productos para mostrar.</div>
                                )}
                            </section>

                            {page < totalPages && (
                                <div className="w-full flex items-center justify-center py-6">
                                    <button type="button" disabled={cargando} onClick={onCargarMas} className={`${cargando ? "opacity-60 cursor-not-allowed" : "hover:text-slate-900"} text-slate-500 font-semibold tracking-widest transition`}>
                                        {cargando ? "CARGANDO..." : "CARGAR MÁS"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </article>

           
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
