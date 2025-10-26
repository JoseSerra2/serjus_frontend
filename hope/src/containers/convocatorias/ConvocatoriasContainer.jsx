﻿import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../../layouts/index.jsx";
import Header from "../../layouts/header/index.jsx";
import Footer from "../../layouts/footer/index.jsx";
import ScrollToTop from "../../components/scroll-to-top/index.jsx";
import SEO from "../../components/seo/index.jsx";
import ConvocatoriasTable from "./ConvocatoriasTable.jsx";
import ConvocatoriasForm from "./ConvocatoriasForm.jsx";
import { showToast } from "../../utils/toast.js";

const API = "http://127.0.0.1:8000/api";

const ConvocatoriasContainer = () => {
    const [form, setForm] = useState({
        nombreconvocatoria: "",
        descripcion: "",
        fechainicio: "",
        fechafin: "",
        idpuesto: "",
        estado: true,
        idusuario: Number(sessionStorage.getItem("idUsuario")) || 1
    });
    const [mensaje, setMensaje] = useState("");
    const [rows, setRows] = useState([]);
    const [puestos, setPuestos] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    const [paginaActual, setPaginaActual] = useState(1);
    const [elementosPorPagina, setElementosPorPagina] = useState(5);
    const [busqueda, setBusqueda] = useState("");

    useEffect(() => {
        fetchList();
        fetchPuestos();
    }, []);

    const fetchList = async () => {
        try {
            const r = await axios.get(`${API}/convocatorias/`);
            const data = Array.isArray(r.data) ? r.data : Array.isArray(r.data?.results) ? r.data.results : [];
            setRows(data);
        } catch (e) {
            showToast("Error al cargar las convocatorias", "error");
            setRows([]);
        }
    };

    const fetchPuestos = async () => {
        try {
            const r = await axios.get(`${API}/puestos/`);
            const data = Array.isArray(r.data?.results) ? r.data.results : [];
            setPuestos(data.filter(p => p.estado));
        } catch (e) {
            setPuestos([]);
        }
    };

    const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();

        // Validaciones básicas
        if (!form.nombreconvocatoria.trim()) {
            setMensaje("El nombre de la convocatoria es obligatorio");
            return;
        }
        if (!form.descripcion.trim()) {
            setMensaje("La descripción es obligatoria");
            return;
        }
        if (!form.fechainicio) {
            setMensaje("La fecha de inicio es obligatoria");
            return;
        }
        if (!form.fechafin){
            setMensaje("La fecha fin es obligatoria");
            return;
        }
        if (!form.idpuesto || Number(form.idpuesto) <= 0) {
            setMensaje("Debes seleccionar un puesto válido");
            return;
        }

        // Preparar payload
        const payload = {
            nombreconvocatoria: form.nombreconvocatoria.trim(),
            descripcion: form.descripcion.trim(),
            fechainicio: form.fechainicio,
            fechafin: form.fechafin || null,  // permitimos que sea null
            estado: true,
            idusuario: Number(sessionStorage.getItem("idUsuario")) || 1,
            idpuesto: Number(form.idpuesto)
        };

        try {
            if (editingId) {
                await axios.put(`${API}/convocatorias/${editingId}/`, payload);
                showToast("Convocatoria actualizada correctamente", "success");
            } else {
                await axios.post(`${API}/convocatorias/`, payload);
                showToast("Convocatoria registrada correctamente", "success");
            }

            fetchList();
            setMostrarFormulario(false);
            setEditingId(null);
            // resetForm(); // opcional, si quieres limpiar el formulario
        } catch (error) {
            console.error(error);

            // Si la API devuelve mensajes de validación, podemos mostrarlos
            if (error.response?.data) {
                const errores = Object.entries(error.response.data)
                    .map(([campo, msgs]) => `${campo}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
                    .join(" | ");
                showToast("Error al registrar/actualizar: ${errores}", "error");
            } else {
                showToast("Error al registrar/actualizar. Revisa la información enviada.", "error");
            }
        }
    };

    const handleEdit = row => {
        setForm({ ...row });
        setEditingId(row.idconvocatoria);
        setMostrarFormulario(true);
    };

    const handleNuevo = () => {
        setForm({
            nombreconvocatoria: "",
            descripcion: "",
            fechainicio: "",
            fechafin: "",
            idpuesto: "",
            estado: true,
            idusuario: Number(sessionStorage.getItem("idUsuario")) || 1
        });
        setEditingId(null);
        setMostrarFormulario(true);
    };

    const handleCerrarFormulario = () => {
        setMostrarFormulario(false); 
        setForm({
            nombreconvocatoria: "",
            descripcion: "",
            fechainicio: "",
            fechafin: "",
            idpuesto: "",
            estado: true,
            idusuario: Number(sessionStorage.getItem("idUsuario")) || 1
        });
        setEditingId(null);
    };

    const toggleEstado = async (row, nuevo) => {
        try {
            await axios.put(`${API}/convocatorias/${row.idconvocatoria}/`, {
                ...row,
                estado: nuevo
            });
            fetchList();
        } catch { }
    };

    const textoBusqueda = busqueda.toLowerCase().trim();

    const filtradas = rows.filter((r) => {
        const nombre = (r.nombreconvocatoria || "").toLowerCase();
        const puesto = (r.nombrepuesto || "").toLowerCase();
        const descripcion = (r.descripcion || "").toLowerCase();
        const estadoTexto = r.estado ? "activo" : "inactivo";
        const fechaInicio = r.fechainicio ? new Date(r.fechainicio).toLocaleDateString("es-ES") : "";
        const fechaFin = r.fechafin ? new Date(r.fechafin).toLocaleDateString("es-ES") : "";

        const nombreCoincide = nombre.includes(textoBusqueda);
        const puestoCoincide = puesto.includes(textoBusqueda);
        const descripcionCoincide = descripcion.includes(textoBusqueda);
        const estadoCoincide = estadoTexto.startsWith(textoBusqueda);
        const fechaInicioCoincide = fechaInicio.includes(textoBusqueda);
        const fechaFinCoincide = fechaFin.includes(textoBusqueda);

        return nombreCoincide || puestoCoincide || descripcionCoincide || estadoCoincide || fechaInicioCoincide || fechaFinCoincide;
    });

    const indexOfLast = paginaActual * elementosPorPagina;
    const paginadas = filtradas.slice(indexOfLast - elementosPorPagina, indexOfLast);
    const totalPaginas = Math.ceil(filtradas.length / elementosPorPagina);

    return (
        <Layout>
            <SEO title="Convocatorias" />
            <div className="wrapper" style={{ display: "flex", minHeight: "100vh" }}>
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
                            <h2 style={{ marginBottom: "20px", textAlign: "center" }}>Convocatorias</h2>

                            <ConvocatoriasTable
                                mensaje={mensaje}
                                paginadas={paginadas}
                                busqueda={busqueda}
                                setBusqueda={setBusqueda}
                                paginaActual={paginaActual}
                                setPaginaActual={setPaginaActual}
                                elementosPorPagina={elementosPorPagina}
                                setElementosPorPagina={setElementosPorPagina}
                                totalPaginas={totalPaginas}
                                handleEdit={handleEdit}
                                toggleEstado={toggleEstado}
                                setMostrarFormulario={handleNuevo}
                            />
                        </div>
                    </main>
                    <Footer />
                    <ScrollToTop />
                </div>

                {mostrarFormulario && (
                    <ConvocatoriasForm
                        form={form}
                        puestos={puestos}
                        onChange={onChange}
                        handleSubmit={handleSubmit}
                        setMostrarFormulario={handleCerrarFormulario}
                        editingId={editingId}
                    />
                )}

            </div>
        </Layout>
    );
};

export default ConvocatoriasContainer;

