import React, { useState } from 'react'
import { Categorias } from '../Categorias/Categorias';
import { PrincipalLayout } from '../Layouts/PrincipalLayout';
import { ToastContainer } from 'react-toastify';
import { Carrito } from '../Productos/Carrito';

export const Main = () => {
    // const obtenerPaginaDesdeHash = () => {
    //     const hash = window.location.hash.replace("#", "").replace("Main", "");
    //     return hash || "PrincipalLayout";
    // };
    // const [pagina, setPagina] = useState(() => obtenerPaginaDesdeHash());

    return (
        <>
            <ToastContainer theme="dark" position="top-center" autoClose={3000} />
            <div style={{ height: "100vh", width: "100vw" }}>
                {/* {pagina === "Categorias" && <Categorias />} */}
                <PrincipalLayout  />
                {/* {pagina === "PrincipalLayout" && <PrincipalLayout  />} */}
                {/* {pagina === "Carrito" && <Carrito setPagina={setPagina} />} */}

            </div>
        </>
    );

}
