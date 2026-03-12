import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TopBar } from "../../Components/TopBar";
import { VistaProductos } from "../Productos/VistaProductos";
import { Carrito } from "../Productos/Carrito";
import { FinalizarPedido } from "../Productos/FinalizarPedido";
import ModalConfirmacionPedido from "../Productos/ModalConfirmacionPedido";

export const PrincipalLayout = () => {
    const topbarRef = useRef(null);
    const [topbarH, setTopbarH] = useState(0);
    const [idCategoria, setIdCategoria] = useState(null);

    const [busqueda, setBusqueda] = useState("");
    const [query, setQuery] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    // ✅ Confirmación pedido
    const [openConfirm, setOpenConfirm] = useState(false);
    const [orderConfirm, setOrderConfirm] = useState(null);

    const obtenerPaginaDesdeHash = () => {
        const hash = window.location.hash.replace("#", "").replace("Main", "");
        return hash || "VistaProductos";
    };
    const [pagina, setPagina] = useState(() => obtenerPaginaDesdeHash());

    // 🔥 DEBOUNCE
    useEffect(() => {
        const timer = setTimeout(() => {
            setQuery(busqueda.trim());
        }, 400); // ← tiempo de espera (puedes ajustar 300-600)

        return () => clearTimeout(timer);
    }, [busqueda]);

    const medir = () => {
        const h = topbarRef.current?.getBoundingClientRect?.().height || 0;
        setTopbarH(Math.ceil(h));
    };

    useLayoutEffect(() => {
        medir();
    }, []);

    useEffect(() => {
        if (!topbarRef.current) return;

        medir();
        const ro = new ResizeObserver(() => medir());
        ro.observe(topbarRef.current);

        const onResize = () => medir();
        window.addEventListener("resize", onResize);

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", onResize);
        };
    }, []);

    const onReload = () => {
        setReloadKey((k) => k + 1);
    };


    // ✅ Cuando el pedido fue exitoso
    const handlePedidoConfirmado = (resp) => {
        if (!resp || resp?.rpta !== "si") return;
        setOrderConfirm(resp);
        setOpenConfirm(true);
    };



    return (
        <>
            <div className="relative flex flex-col overflow-x-hidden">
                <TopBar
                    ref={topbarRef}
                    value={busqueda}
                    onChange={setBusqueda}
                    onReload={onReload}
                    onSelectCategoria={setIdCategoria}
                    setPagina={setPagina}
                    pagina={pagina}

                />

                <div style={{ height: topbarH }} />


                {pagina === "VistaProductos" && <VistaProductos
                    q={query}
                    idCategoria={idCategoria}
                    reloadKey={reloadKey}
                    topbarH={topbarH}
                    setPagina={setPagina}
                    pagina={pagina}
                />}


                {pagina === "Carrito" && <Carrito topbarH={topbarH} setPagina={setPagina} pagina={pagina} />}
                {pagina === "FinalizarPedido" && (
                    <FinalizarPedido
                        setPagina={setPagina}
                        pagina={pagina}
                        topbarH={topbarH}
                        onConfirm={handlePedidoConfirmado} // 🔥 conexión
                    />
                )}



            </div>

            <ModalConfirmacionPedido
                isOpen={openConfirm}
                order={orderConfirm}
                onFinalizar={() => {
                    console.log("Finalizar confirmado");

                    // ✅ borrar confirmación ya mostrada
                    localStorage.removeItem("pedido_confirmado");

                    setOpenConfirm(false);
                    setOrderConfirm(null);

                    setPagina("VistaProductos");
                }}
            />


        </>
    );
};
