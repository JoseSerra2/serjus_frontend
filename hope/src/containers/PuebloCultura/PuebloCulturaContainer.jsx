﻿import React, { useState, useEffect } from "react";
import axios from "axios";

import Layout from "../../layouts";
import Header from "../../layouts/header";
import Footer from "../../layouts/footer";
import ScrollToTop from "../../components/scroll-to-top";
import SEO from "../../components/seo";
import { showToast } from "../../utils/toast.js";
import {  } from "react-toastify";import PuebloCulturaForm from "./PuebloCulturaForm";
import ConfirmModal from "./ConfirmModal";
import PuebloCulturaTable from "./PuebloCulturaTable";

const API = "http://127.0.0.1:8000/api/pueblocultura/";

const PuebloCulturaContainer = () => {
    const [nombrePueblo, setNombrePueblo] = useState("");
    const [items, setItems] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [activoEditando, setActivoEditando] = useState(true);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
    const [seleccionado, setSeleccionado] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [paginaActual, setPaginaActual] = useState(1);
    const [elementosPorPagina, setElementosPorPagina] = useState(5);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const res = await axios.get(API);
            const raw = Array.isArray(res.data) ? res.data : Array.isArray(res.data.results) ? res.data.results : [];
            // Normaliza a camelCase para la UI
            const data = raw.map(r => ({
                idPuebloCultura: r.idPuebloCultura ?? r.idpueblocultura ?? r.id,
                nombrePueblo: r.nombrePueblo ?? r.nombrepueblo,
                estado: r.estado
            }));
            setItems(data);
        } catch (e) {
            console.error(e);
            showToast("Error al cargar Pueblo/Cultura", "error");
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            // validar duplicado (case-insensitive)
            const yaExiste = items.some(
                i =>
                    (i.nombrePueblo || "").trim().toLowerCase() === nombrePueblo.trim().toLowerCase() &&
                    i.idPuebloCultura !== editingId
            );
            if (yaExiste) {
                showToast("Ya existe un registro con ese nombre", "warning");
                return;
            }

            const idUsuario = Number(sessionStorage.getItem("idUsuario"));
            const payload = {
                // payload en snake_case para DRF
                nombrepueblo: nombrePueblo,
                estado: Boolean(activoEditando),
                idusuario: idUsuario
            };

            if (editingId) {
                await axios.put(`${API}${editingId}/`, payload);
            } else {
                await axios.post(API, payload);
            }

            showToast(editingId ? "Actualizado correctamente" : "Registrado correctamente");
            setNombrePueblo("");
            setEditingId(null);
            setActivoEditando(true);
            setMostrarFormulario(false);
            fetchAll();
        } catch (error) {
            const apiErr = error.response?.data;
            const detalle =
                (apiErr && (apiErr.nombrepueblo?.[0] || apiErr.detail || JSON.stringify(apiErr))) || "desconocido";
            console.error("POST/PUT pueblocultura error:", apiErr || error);
            showToast(`Error al guardar: ${detalle}`, "error");
        }
    };

    const handleEdit = row => {
        if (!row.estado) {
            showToast("No se puede editar un registro inactivo");
            return;
        }
        setNombrePueblo(row.nombrePueblo);
        setEditingId(row.idPuebloCultura);
        setActivoEditando(row.estado);
        setMostrarFormulario(true);
    };

    const handleDelete = row => {
        setSeleccionado(row);
        setMostrarConfirmacion(true);
    };

    const confirmarDesactivacion = async () => {
        if (!seleccionado) return;
        try {
            const idUsuario = Number(sessionStorage.getItem("idUsuario"));
            await axios.put(`${API}${seleccionado.idPuebloCultura}/`, {
                nombrepueblo: seleccionado.nombrePueblo,
                estado: false,
                idusuario: idUsuario
            });
            showToast("Desactivado correctamente");
            fetchAll();
        } catch (e) {
            console.error(e);
            showToast("Error al desactivar", "error");
        } finally {
            setMostrarConfirmacion(false);
            setSeleccionado(null);
        }
    };

    const handleActivate = async id => {
        try {
            const row = items.find(i => i.idPuebloCultura === id);
            if (!row) return;
            const idUsuario = Number(sessionStorage.getItem("idUsuario"));
            await axios.put(`${API}${id}/`, {
                nombrepueblo: row.nombrePueblo,
                estado: true,
                idusuario: idUsuario
            });
            showToast("Activado correctamente");
            fetchAll();
        } catch (e) {
            console.error(e);
            showToast("Error al activar", "error");
        }
    };

    const filtrados = items
        // Ordenar alfabéticamente por nombre (A-Z)
        .sort((a, b) => {
            const nombreA = (a.nombrePueblo || "").toLowerCase();
            const nombreB = (b.nombrePueblo || "").toLowerCase();
            return nombreA.localeCompare(nombreB);
        })
        .filter(i => {
            const t = busqueda.toLowerCase().trim();
            const n = i.nombrePueblo?.toLowerCase() || "";
            const e = i.estado ? "activo" : "inactivo";
            return n.includes(t) || e.startsWith(t);
        });

    const indexLast = paginaActual * elementosPorPagina;
    const indexFirst = indexLast - elementosPorPagina;
    const paginados = filtrados.slice(indexFirst, indexLast);
    const totalPaginas = Math.ceil(filtrados.length / elementosPorPagina);

    return (
        <Layout>
            <SEO title="Pueblo / Cultura" />
            <div style={{ display: "flex", minHeight: "100vh" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <Header />
                    <main
                        className="main-content site-wrapper-reveal"
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#EEF2F7",
                            padding: "48px 20px 8rem"
                        }}
                    >
                        <div style={{ width: "min(1100px, 96vw)" }}>
                            <h2 style={{ marginBottom: "20px", textAlign: "center" }}>Pueblo / Cultura</h2>

                            {/* Buscador + Nuevo */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "15px",
                                    alignItems: "center"
                                }}
                            >
                                <input
                                    type="text"
                                    placeholder="Buscar nombre / estado..."
                                    value={busqueda}
                                    onChange={e => {
                                        setBusqueda(e.target.value);
                                        setPaginaActual(1);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: "10px",
                                        borderRadius: "6px",
                                        border: "1px solid #ccc",
                                        marginRight: "10px"
                                    }}
                                />
                                <button
                                    onClick={() => setMostrarFormulario(true)}
                                    style={{
                                        padding: "10px 20px",
                                        background: "#219ebc",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontWeight: "600",
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    Nuevo Registro
                                </button>
                            </div>

                            <PuebloCulturaTable
                                items={paginados}
                                handleEdit={handleEdit}
                                handleDelete={handleDelete}
                                handleActivate={handleActivate}
                                paginaActual={paginaActual}
                                totalPaginas={totalPaginas}
                                setPaginaActual={setPaginaActual}
                            />

                            <div style={{ marginTop: "20px", textAlign: "center" }}>
                                <label style={{ marginRight: "10px", fontWeight: "600" }}>Mostrar:</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={elementosPorPagina}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        const n = val === "" ? "" : Number(val);
                                        setElementosPorPagina(n > 0 ? n : 1);
                                        setPaginaActual(1);
                                    }}
                                    onFocus={e => e.target.select()}
                                    style={{
                                        width: "80px",
                                        padding: "10px",
                                        borderRadius: "6px",
                                        border: "1px solid #ccc",
                                        textAlign: "center"
                                    }}
                                />
                            </div>
                        </div>
                    </main>
                    <Footer />
                </div>

                {mostrarFormulario && (
                    <PuebloCulturaForm
                        nombrePueblo={nombrePueblo}
                        setNombrePueblo={setNombrePueblo}
                        activoEditando={activoEditando}
                        editingId={editingId}
                        handleSubmit={handleSubmit}
                        onClose={() => setMostrarFormulario(false)}
                    />
                )}

                {mostrarConfirmacion && (
                    <ConfirmModal
                        registro={seleccionado}
                        onConfirm={confirmarDesactivacion}
                        onCancel={() => setMostrarConfirmacion(false)}
                        tipo="pueblo/cultura"
                    />
                )}

                <ScrollToTop />
            </div>
        </Layout>
    );
};

export default PuebloCulturaContainer;

