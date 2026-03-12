import React, { useEffect, useMemo, useState, useCallback } from "react";
import { getCartItems, clearCart } from "../../utils/cartStorage";

const PRIMARY = "#c43728";
const TITLE = "#AB2121";
const moneyCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

// letras (con tildes), números, espacios, y algunos separadores típicos de direcciones
const isAlphaNumAddress = (v) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s#\-,.]+$/.test(String(v || "").trim());

// ✅ AJUSTA ESTA URL A TU RUTA REAL
const API_URL = "https://carnesbrangus.com/tiendaBrangus/pedidos/PedidosCreate.php";
const API_CIUDADES = "https://carnesbrangus.com/tiendaBrangus/ciudades/CiudadesGetAll.php";

export const FinalizarPedido = ({ setPagina = () => { }, onConfirm = () => { } }) => {
    const [items, setItems] = useState(() => getCartItems());

    const [ciudades, setCiudades] = useState([]);
    const [loadingCiudades, setLoadingCiudades] = useState(false);

    const [form, setForm] = useState({
        fullName: "",
        documento: "",
        email: "",
        phone: "",
        address: "",
        city: "", // ✅ ahora es idCiudad
        neighborhood: "",
        note: "",
        paymentMethod: "CONTRA_ENTREGA",
    });

    const [touched, setTouched] = useState({});
    const [errors, setErrors] = useState({});

    const [sending, setSending] = useState(false);
    const [serverError, setServerError] = useState("");
    const [serverOk, setServerOk] = useState(null);

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

    // ✅ cargar ciudades desde API
    useEffect(() => {
        const load = async () => {
            try {
                setLoadingCiudades(true);
                const res = await fetch(API_CIUDADES, { method: "GET" });
                const text = await res.text();

                let json = null;
                try {
                    json = text ? JSON.parse(text) : null;
                } catch {
                    json = null;
                }

                if (!res.ok) throw new Error(json?.mensaje || json?.error || text || `HTTP ${res.status}`);

                if (json?.rpta === "si" && Array.isArray(json?.data)) {
                    setCiudades(json.data);

                    const cali = json.data.find(
                        (x) =>
                            String(x?.codigo || "").toUpperCase() === "CALI" ||
                            String(x?.nombre || "").trim().toLowerCase() === "cali"
                    );

                    const def = cali?.id ?? json.data?.[0]?.id ?? "";
                    setForm((s) => ({ ...s, city: def ? String(def) : "" }));
                } else {
                    setCiudades([]);
                    setForm((s) => ({ ...s, city: "" }));
                }
            } catch (e) {
                setCiudades([]);
                setForm((s) => ({ ...s, city: "" }));
                setServerError("No se pudieron cargar las ciudades.");
            } finally {
                setLoadingCiudades(false);
            }
        };
        load();
    }, []);

    const validate = (data) => {
        const e = {};
        const fullName = String(data.fullName || "").trim();
        const documento = String(data.documento || "").trim();
        const email = String(data.email || "").trim();
        const phone = String(data.phone || "").trim();
        const address = String(data.address || "").trim();
        const city = String(data.city || "").trim(); // ✅ idCiudad
        const neighborhood = String(data.neighborhood || "").trim();

        if (!fullName) e.fullName = "El nombre completo es obligatorio.";
        else if (fullName.length < 3) e.fullName = "Debe tener al menos 3 caracteres.";

        if (!documento) e.documento = "El documento es obligatorio (factura electrónica).";
        else if (!/^\d+$/.test(documento)) e.documento = "El documento debe contener solo números.";
        else if (documento.length < 6 || documento.length > 15) e.documento = "Debe tener entre 6 y 15 dígitos.";

        if (!email) e.email = "El correo es obligatorio.";
        else if (!isEmail(email)) e.email = "Correo inválido.";

        if (!phone) e.phone = "El teléfono es obligatorio.";
        else if (!/^\d+$/.test(phone)) e.phone = "Solo se permiten números.";
        else if (phone.length !== 10) e.phone = "Debe tener 10 dígitos.";

        if (!city) e.city = "Selecciona una ciudad válida.";
        else if (!/^\d+$/.test(city)) e.city = "Ciudad inválida.";

        if (!neighborhood) e.neighborhood = "El barrio es obligatorio.";
        else if (!isAlphaNumAddress(neighborhood)) e.neighborhood = "Solo letras/números. Puedes usar # - . ,";

        if (!address) e.address = "La dirección es obligatoria.";
        else if (!isAlphaNumAddress(address)) e.address = "Solo letras/números. Puedes usar # - . ,";

        return e;
    };

    useEffect(() => {
        setErrors(validate(form));
    }, [form]);

    const onBlur = (e) => {
        const { name } = e.target;
        setTouched((s) => ({ ...s, [name]: true }));
    };

    const onChange = (e) => {
        const { name, value } = e.target;

        if (name === "phone" || name === "documento") {
            const onlyDigits = String(value || "").replace(/\D+/g, "");
            setForm((s) => ({ ...s, [name]: onlyDigits }));
            return;
        }

        setForm((s) => ({ ...s, [name]: value }));
    };

    // ======================================================
    // ✅ TOTALES REALES (como Carrito)
    // ======================================================
    const subtotalFinal = useMemo(() => (items || []).reduce((acc, it) => acc + Number(it?.subtotal || 0), 0), [items]);

    const subtotalAntesDescuento = useMemo(() => {
        return (items || []).reduce((acc, it) => {
            const qty = Number(it?.cantidad || 0);
            if (qty <= 0) return acc;

            const valor = Number(it?.valor || 0);
            const precioUnit = Number(it?.precio_unitario || 0);
            const descPct = Number(it?.descuento || 0);

            if (valor > 0) return acc + valor * qty;

            if (precioUnit > 0 && descPct > 0 && descPct < 100) {
                const valorEstimado = precioUnit / (1 - descPct / 100);
                return acc + valorEstimado * qty;
            }

            return acc + precioUnit * qty;
        }, 0);
    }, [items]);

    const descuentoTotal = useMemo(() => {
        const d = Number(subtotalAntesDescuento || 0) - Number(subtotalFinal || 0);
        return d > 0 ? d : 0;
    }, [subtotalAntesDescuento, subtotalFinal]);

    const IVA_RATE = 0;
    const iva = useMemo(() => Math.max(0, Math.round(subtotalFinal * IVA_RATE * 100) / 100), [subtotalFinal]);

    const BOLSA_UNIT = 350;
    const bolsasQty = useMemo(() => ((items || []).length > 0 ? 1 : 0), [items]);
    const bolsaTotal = useMemo(() => bolsasQty * BOLSA_UNIT, [bolsasQty]);

    const envio = 0;
    const total = useMemo(() => Math.max(0, subtotalFinal + iva + bolsaTotal + envio), [subtotalFinal, iva, bolsaTotal]);

    const cartCount = useMemo(() => (items || []).reduce((acc, it) => acc + Number(it?.cantidad || 0), 0), [items]);

    const canSubmit = useMemo(
        () => items.length > 0 && Object.keys(errors).length === 0 && !sending && !loadingCiudades && !!form.city,
        [items, errors, sending, loadingCiudades, form.city]
    );

    // ✅ Normaliza items para el backend
    const buildItemsForApi = useCallback(() => {
        return (items || []).map((it) => {
            const idProducto = Number(it?.idProducto ?? it?.id ?? 0);
            const cantidad = Number(it?.cantidad ?? 0);
            const precio_unitario = Number(it?.precio_unitario ?? 0);
            const subtotal = Number(it?.subtotal ?? precio_unitario * cantidad ?? 0);

            const presentacion_snapshot = String(
                it?.presentacion_snapshot ?? it?.presentacion_nombre ?? it?.presentacion?.nombre ?? it?.presentacion ?? ""
            ).trim();

            const nota = String(it?.nota ?? "").trim();

            return { idProducto, cantidad, precio_unitario, subtotal, presentacion_snapshot, nota };
        });
    }, [items]);

    const sendToApi = async (payload) => {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const text = await res.text();

        console.log("HTTP", res.status, res.statusText);
        console.log("Content-Type:", res.headers.get("content-type"));
        console.log("RAW RESPONSE:", text);

        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            json = null;
        }

        if (!res.ok) throw new Error(json?.mensaje || json?.error || text || `HTTP ${res.status}`);
        if (!json || json?.rpta !== "si") throw new Error(json?.mensaje || "Respuesta inválida del servidor.");

        return json;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setServerError("");
        setServerOk(null);

        const allTouched = {
            fullName: true,
            documento: true,
            email: true,
            phone: true,
            city: true,
            neighborhood: true,
            address: true,
            note: true,
        };
        setTouched(allTouched);

        const e2 = validate(form);
        setErrors(e2);
        if (Object.keys(e2).length > 0) return;

        const itemsApi = buildItemsForApi();
        if (itemsApi.some((x) => !x.idProducto || x.cantidad <= 0)) {
            setServerError("Hay productos inválidos en el carrito. Regresa y vuelve a agregarlos.");
            return;
        }

        const idCiudad = Number(form.city);

        const payload = {
            cliente: {
                nombre: form.fullName.trim(),
                documento: form.documento.trim(),
                email: form.email.trim(),
                telefono: form.phone.trim(),
                direccion: form.address.trim(),
                idCiudad, // ✅ nuevo
                barrio: form.neighborhood.trim(),
                nota: String(form.note || "").trim(),
            },
            pago: { metodo: "CONTRA_ENTREGA" },
            resumen: { subtotal: subtotalAntesDescuento, descuento: descuentoTotal, iva, bolsa: bolsaTotal, envio, total },
            items: itemsApi,
        };

        try {
            setSending(true);

            const r = await sendToApi(payload);

            // ✅ armamos un snapshot PARA EL MODAL con las mismas claves que el modal lee:
            // cliente / pago / resumen
            const confirmData = {
                ...r,
                cliente: {
                    nombre: payload?.cliente?.nombre || form.fullName.trim(),
                    documento: payload?.cliente?.documento || form.documento.trim(),
                    email: payload?.cliente?.email || form.email.trim(),
                    telefono: payload?.cliente?.telefono || form.phone.trim(),
                    direccion: payload?.cliente?.direccion || form.address.trim(),
                    barrio: payload?.cliente?.barrio || form.neighborhood.trim(),
                    idCiudad: Number(payload?.cliente?.idCiudad ?? form.city ?? 0),
                    nota: payload?.cliente?.nota || String(form.note || "").trim(),
                },
                pago: { ...(payload?.pago || { metodo: "CONTRA_ENTREGA" }) },
                resumen: { ...(payload?.resumen || { subtotal: subtotalAntesDescuento, descuento: descuentoTotal, iva, bolsa: bolsaTotal, envio, total }) },
                saved_at: new Date().toISOString(),
            };

            // ✅ guarda confirmación (por si recarga o cierra)
            localStorage.setItem("tv_last_order", JSON.stringify(confirmData));

            // ✅ borrar lo que “usaste para enviar” (draft) ANTES de abrir modal
            // (solo si realmente lo usas; si no existe, no pasa nada)
            localStorage.removeItem("pedido_draft");

            // ✅ limpiar carrito
            clearCart();
            window.dispatchEvent(new Event("cart_updated"));

            // ✅ abrir modal (state)
            setServerOk(confirmData);
            onConfirm?.(confirmData);

        } catch (err) {
            setServerError(String(err?.message || "Error enviando el pedido."));
        } finally {
            setSending(false);
        }
    };

    const FieldError = ({ name }) => {
        if (!touched?.[name] || !errors?.[name]) return null;
        return <p className="mt-1 text-xs text-red-600 font-semibold">{errors[name]}</p>;
    };

    return (
        <section className="bg-white py-5 antialiased">
            <div className="mx-auto max-w-7xl px-1 2xl:px-0">
                <div className="flex justify-center items-center pb-2">
                    <h2 className="text-4xl font-semibold" style={{ color: TITLE }}>
                        Finalizar pedido
                    </h2>
                </div>

                <div className="mt-6 sm:mt-8 md:gap-6 lg:flex lg:items-start xl:gap-8">
                    {/* FORM */}
                    <form onSubmit={onSubmit} className="mx-auto w-full flex-none rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:max-w-2xl xl:max-w-4xl">
                        <p className="text-xl font-semibold text-slate-900">Datos de entrega</p>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            {/* NOMBRE */}
                            <div className="col-span-2 sm:col-span-1">
                                <label htmlFor="full_name" className="mb-2 block text-sm font-semibold text-slate-700">
                                    Nombre completo*
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    placeholder="Nombre y apellido"
                                    required
                                    className={`block w-full rounded-lg border bg-slate-50 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${touched.fullName && errors.fullName ? "border-red-400" : "border-slate-300"}`}
                                />
                                <FieldError name="fullName" />
                            </div>

                            {/* DOCUMENTO */}
                            <div className="col-span-2 sm:col-span-1">
                                <label htmlFor="documento" className="mb-2 block text-sm font-semibold text-slate-700">
                                    Documento de identidad*
                                </label>
                                <input
                                    type="text"
                                    id="documento"
                                    name="documento"
                                    value={form.documento}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    placeholder="Documento para factura electrónica"
                                    required
                                    inputMode="numeric"
                                    className={`block w-full rounded-lg border bg-slate-50 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${touched.documento && errors.documento ? "border-red-400" : "border-slate-300"}`}
                                />
                                <FieldError name="documento" />
                            </div>

                            {/* EMAIL */}
                            <div className="col-span-2 sm:col-span-1">
                                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                                    Correo electrónico*
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={form.email}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    placeholder="correo@ejemplo.com"
                                    required
                                    className={`block w-full rounded-lg border bg-slate-50 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${touched.email && errors.email ? "border-red-400" : "border-slate-300"}`}
                                />
                                <FieldError name="email" />
                            </div>

                            {/* PHONE */}
                            <div className="col-span-2 sm:col-span-1">
                                <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-slate-700">
                                    Número de teléfono*
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={form.phone}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    placeholder="Ej: 3001234567"
                                    required
                                    inputMode="numeric"
                                    className={`block w-full rounded-lg border bg-slate-50 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${touched.phone && errors.phone ? "border-red-400" : "border-slate-300"}`}
                                />
                                <FieldError name="phone" />
                            </div>

                            {/* CITY */}
                            <div className="col-span-2 sm:col-span-1 ">
                                <label htmlFor="city" className="mb-2 block text-sm font-semibold text-slate-700 ">
                                    Ciudad*
                                </label>
                                <select
                                    id="city"
                                    name="city"
                                    value={form.city}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    disabled={loadingCiudades}
                                    className={`block w-full rounded-lg border bg-slate-50 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${touched.city && errors.city ? "border-red-400" : "border-slate-300"} ${loadingCiudades ? "opacity-60 cursor-not-allowed" : ""}`}
                                >
                                    <option value="" disabled>
                                        {loadingCiudades ? "Cargando ciudades..." : "Seleccionar Ciudad"}
                                    </option>
                                    {ciudades.map((c) => (
                                        <option key={c.id} value={String(c.id)}>
                                            {c.nombre}
                                        </option>
                                    ))}
                                </select>
                                <FieldError name="city" />
                            </div>

                            {/* BARRIO */}
                            <div className="col-span-2 sm:col-span-1">
                                <label htmlFor="neighborhood" className="mb-2 block text-sm font-semibold text-slate-700">
                                    Barrio*
                                </label>
                                <input
                                    type="text"
                                    id="neighborhood"
                                    name="neighborhood"
                                    value={form.neighborhood}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    placeholder="Ej: San Fernando"
                                    required
                                    className={`block w-full rounded-lg border bg-slate-50 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${touched.neighborhood && errors.neighborhood ? "border-red-400" : "border-slate-300"}`}
                                />
                                <FieldError name="neighborhood" />
                            </div>

                            {/* DIRECCIÓN FULL */}
                            <div className="col-span-2">
                                <label htmlFor="address" className="mb-2 block text-sm font-semibold text-slate-700">
                                    Dirección*
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={form.address}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    placeholder="Ej: Cra 12 # 34-56 Apto 301"
                                    required
                                    className={`block w-full rounded-lg border bg-slate-50 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${touched.address && errors.address ? "border-red-400" : "border-slate-300"}`}
                                />
                                <FieldError name="address" />
                            </div>

                            {/* NOTE */}
                            <div className="col-span-2">
                                <label htmlFor="note" className="mb-2 block text-sm font-semibold text-slate-700">
                                    Nota (opcional)
                                </label>
                                <textarea
                                    id="note"
                                    name="note"
                                    value={form.note}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    rows={3}
                                    placeholder="Ej: Dejar en portería / llamar al llegar"
                                    className="block w-full resize-none rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-800">Método de pago</p>
                            <div className="mt-3 flex items-center gap-3">
                                <input
                                    id="contra_entrega"
                                    type="radio"
                                    name="paymentMethod"
                                    value="CONTRA_ENTREGA"
                                    checked={form.paymentMethod === "CONTRA_ENTREGA"}
                                    onChange={onChange}
                                    className="h-4 w-4 accent-[#c43728]"
                                />
                                <label htmlFor="contra_entrega" className="text-sm font-semibold text-slate-700">
                                    Contra entrega
                                </label>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Pagarás al recibir tu pedido.</p>
                        </div>

                        {serverError ? (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
                                {serverError}
                            </div>
                        ) : null}

                        {serverOk?.pedido?.codigo ? (
                            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 font-semibold">
                                Pedido creado: <span className="font-extrabold">{serverOk.pedido.codigo}</span>
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={`mt-5 w-full py-3 rounded-lg text-white font-semibold transition transform-gpu will-change-transform duration-150 ease-out hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 appearance-none ${!canSubmit ? "opacity-60 cursor-not-allowed" : ""}`}
                            style={{ background: PRIMARY }}
                        >
                            {sending ? "Enviando..." : "Confirmar pedido"}
                        </button>

                        {items.length === 0 ? <p className="mt-3 text-center text-sm text-slate-500">Tu carrito está vacío. Regresa a seleccionar productos.</p> : null}

                        <button
                            type="button"
                            onClick={() => setPagina("Carrito")}
                            className="mt-3 w-full py-3 rounded-lg border border-[#AB2121] text-[#AB2121] font-semibold hover:bg-[#AB2121] hover:text-white transition transform-gpu will-change-transform duration-150 ease-out hover:scale-[1.01] active:scale-[0.98] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 appearance-none"
                        >
                            Volver al carrito
                        </button>
                    </form>

                    {/* RESUMEN */}
                    <div className="mx-auto mt-6 max-w-4xl flex-1 space-y-6 lg:mt-0 lg:w-full">
                        <div className="rounded-lg border border-[#c43728] bg-white p-4 shadow-sm sm:p-6">
                            <p className="text-xl font-semibold text-slate-900">Total del pedido</p>

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
                                    <p className="mt-1 text-xs text-slate-500">El valor del domicilio será informado en la confirmación del pedido o despacho.</p>
                                </div>

                                <dl className="flex items-center justify-between gap-4 py-4">
                                    <dt className="text-lg font-extrabold text-[#c43728]">Total</dt>
                                    <dd className="text-lg font-extrabold text-[#c43728]">{moneyCOP(total)}</dd>
                                </dl>
                            </div>

                            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-800">Método de pago</p>
                                <p className="mt-1 text-sm text-slate-700">Contra entrega</p>
                                <p className="mt-1 text-xs text-slate-500">{`Productos: ${cartCount}`}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="mt-6 text-center text-slate-500 sm:mt-8 lg:text-left">
                    Al confirmar, nos comunicaremos para validar disponibilidad y costo de envío.
                </p>
            </div>
        </section>
    );
};
