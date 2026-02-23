import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TopBar } from "../../Components/TopBar";
import { VistaProductos } from "../Productos/VistaProductos";

export const PrincipalLayout = () => {
    const topbarRef = useRef(null);
    const [topbarH, setTopbarH] = useState(0);
    const [idCategoria, setIdCategoria] = useState(null);

    const [busqueda, setBusqueda] = useState("");
    const [query, setQuery] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

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

    return (
        <div className="relative flex flex-col overflow-x-hidden">
            <TopBar
                ref={topbarRef}
                value={busqueda}
                onChange={setBusqueda}
                onReload={onReload}
                onSelectCategoria={setIdCategoria}
            />

            <div style={{ height: topbarH }} />

            <VistaProductos
                q={query}
                idCategoria={idCategoria}
                reloadKey={reloadKey}
                topbarH={topbarH}
            />
        </div>
    );
};
