import React, { useState } from 'react'
import { Categorias } from '../Categorias/Categorias';
import { PrincipalLayout } from '../Layouts/PrincipalLayout';

export const Main = () => {
    const obtenerPaginaDesdeHash = () => {
        const hash = window.location.hash.replace("#", "").replace("Main", "");
        return hash || "PrincipalLayout";
    };
    const [pagina, setPagina] = useState(() => obtenerPaginaDesdeHash());

    return (
        <div style={{ height: "100vh", width: "100vw" }}>
            {/* {pagina === "Categorias" && <Categorias />} */}
            {pagina === "PrincipalLayout" && <PrincipalLayout />}

        </div>
    );

}
