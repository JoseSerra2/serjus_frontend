import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../../layouts";
import Header from "../../layouts/header";
import Footer from "../../layouts/footer";
import ScrollToTop from "../../components/scroll-to-top";
import SEO from "../../components/seo";
import { showToast } from "../../utils/toast.js";
import { buttonStyles } from "../../stylesGenerales/buttons.js";
import PuestoForm from "./PuestoForm";
import PuestosTable from "./PuestosTable";
import ConfirmModal from "./ConfirmModal";

const PuestosContainer = () => {
    const [puestos, setPuestos] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [paginaActual, setPaginaActual] = useState(1);
    const [elementosPorPagina, setElementosPorPagina] = useState(5);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [puestoSeleccionado, setPuestoSeleccionado] = useState(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

    useEffect(() => {
        fetchPuestos();
    }, []);

    const fetchPuestos = async () => {
        try {
            const res = await axios.get("http://127.0.0.1:8000/api/puestos/");
            const data = Array.isArray(res.data) ? res.data : Array.isArray(res.data.results) ? res.data.results : [];
            setPuestos(data);
        } catch (error) {
            console.error(error);
            showToast("Error al cargar los puestos", "error");
        }
    };

    const handleSubmit = async (idpuesto, payload) => {
        try {
            // Obtener datos del puesto antes de actualizarlo para comparar
            const puestoAnterior = puestos.find(p => p.idpuesto === idpuesto);
            const salarioAnterior = Number(puestoAnterior?.salariobase || 0);
            const salarioNuevo = Number(payload.salariobase || 0);

            console.log("🔍 Comparando salarios:", {
                idPuesto: idpuesto,
                salarioAnterior,
                salarioNuevo,
                hayDiferencia: salarioAnterior !== salarioNuevo,
                salarioValido: salarioNuevo > 0
            });

            // Actualizar el puesto
            await axios.put(`http://127.0.0.1:8000/api/puestos/${idpuesto}/`, payload);

            // Si el salario cambió, crear registros de historial para empleados con este puesto
            if (salarioAnterior !== salarioNuevo && salarioNuevo > 0) {
                console.log("   Creando historial por cambio de salario");
                await crearHistorialCambioSalario(idpuesto, salarioNuevo);
            } else {
                console.log("  No se creará historial:", {
                    razon: salarioAnterior === salarioNuevo ? "Salario no cambió" : "Salario nuevo es 0 o inválido"
                });
            }

            showToast("Salario asignado correctamente");
            fetchPuestos();
            setMostrarFormulario(false);
        } catch (error) {
            console.error("Error en handleSubmit:", error);
            showToast("Error al asignar el salario", "error");
        }
    };

    // Función para crear historial cuando cambia el salario de un puesto
    const crearHistorialCambioSalario = async (idPuesto, nuevoSalario) => {
        try {
            console.log("🔄 Iniciando crearHistorialCambioSalario para puesto:", idPuesto, "con salario:", nuevoSalario);

            // Obtener todos los empleados
            const resEmpleados = await axios.get("http://127.0.0.1:8000/api/empleados/");
            const empleados = Array.isArray(resEmpleados.data) ? resEmpleados.data : resEmpleados.data?.results || [];
            console.log("👥 Empleados encontrados:", empleados.length);

            // Obtener historial actual
            const resHistorial = await axios.get("http://127.0.0.1:8000/api/historialpuestos/");
            const historiales = Array.isArray(resHistorial.data) ? resHistorial.data : resHistorial.data?.results || [];
            console.log("📋 Registros de historial encontrados:", historiales.length);

            // Filtrar empleados que actualmente tienen este puesto
            const empleadosConEsePuesto = empleados.filter(emp => {
                const idPuestoEmp = emp.idpuesto || emp.idPuesto;
                const tieneEsePuesto = Number(idPuestoEmp) === Number(idPuesto);
                const estaActivo = emp.estado === true;
                console.log(`👤 Empleado ${emp.nombre} ${emp.apellido}: puesto=${idPuestoEmp}, coincide=${tieneEsePuesto}, activo=${estaActivo}`);
                return tieneEsePuesto && estaActivo;
            });

            console.log("   Empleados con el puesto modificado:", empleadosConEsePuesto.length);

            if (empleadosConEsePuesto.length === 0) {
                console.log("ℹ️ No hay empleados activos con este puesto");
                return;
            }

            const fechaActual = new Date().toISOString().slice(0, 10);
            const idUsuario = Number(sessionStorage.getItem("idUsuario")) || 1;

            for (const empleado of empleadosConEsePuesto) {
                const empleadoId = empleado.id || empleado.idempleado || empleado.idEmpleado;
                console.log(`🔄 Procesando empleado ${empleado.nombre} ${empleado.apellido} (ID: ${empleadoId})`);

                // Buscar el historial activo más reciente (sin fecha fin) de este empleado para este puesto
                const historialesActivos = historiales
                    .filter(h =>
                        h.idempleado === empleadoId &&
                        Number(h.idpuesto) === Number(idPuesto) &&
                        h.estado === true &&
                        (!h.fechafin || h.fechafin === null || h.fechafin === "")
                    )
                    .sort((a, b) => new Date(b.fechainicio) - new Date(a.fechainicio));

                const historialActivo = historialesActivos[0]; // El más reciente

                console.log("📝 Historial activo encontrado:", historialActivo ? `ID: ${historialActivo.idhistorialpuesto}, Salario: ${historialActivo.salario}, Fecha: ${historialActivo.fechainicio}` : "Ninguno");

                // Si ya existe un registro del mismo día con el nuevo salario, no hacer nada
                if (historialActivo && historialActivo.fechainicio === fechaActual && Number(historialActivo.salario) === Number(nuevoSalario)) {
                    console.log("⚠️ Ya existe un registro del mismo día con el mismo salario, saltando...");
                    continue;
                }

                if (historialActivo) {
                    console.log("⏹️ Finalizando historial anterior");
                    // Usar la fecha actual como fecha fin del registro anterior
                    console.log("📅 Fecha fin para registro anterior:", fechaActual);

                    // Finalizar el historial anterior (poner fecha fin)
                    await axios.put(`http://127.0.0.1:8000/api/historialpuestos/${historialActivo.idhistorialpuesto}/`, {
                        ...historialActivo,
                        fechafin: fechaActual,
                        idusuario: idUsuario
                    });
                }

                // Crear nuevo registro con el nuevo salario
                const nuevoHistorial = {
                    idempleado: empleadoId,
                    idpuesto: idPuesto,
                    fechainicio: fechaActual,
                    fechafin: null,
                    salario: nuevoSalario,
                    observacion: "Actualización automática por cambio de salario del puesto",
                    estado: true,
                    idusuario: idUsuario
                };

                console.log("➕ Creando nuevo historial:", nuevoHistorial);
                await axios.post("http://127.0.0.1:8000/api/historialpuestos/", nuevoHistorial);
                console.log("   Historial creado exitosamente para empleado:", empleadoId);
            }

            console.log(`🎉 Historial actualizado para ${empleadosConEsePuesto.length} empleado(s) con el nuevo salario`);
        } catch (error) {
            console.error("  Error al actualizar historial por cambio de salario:", error);
            // No mostramos error al usuario para no interrumpir el flujo principal
        }
    };

    // Cambiar estado (activar/desactivar)
    const handleToggleEstado = async () => {
        if (!registroSeleccionado) return;
        try {
            await axios.put(
                `http://127.0.0.1:8000/api/puestos/${registroSeleccionado.idpuesto}/`,
                { ...registroSeleccionado, estado: false } // solo desactivar desde el modal
            );
            showToast(`Puesto desactivado correctamente`);
            fetchPuestos();
            setConfirmModalVisible(false);
        } catch (error) {
            console.error(error);
            showToast("Error al cambiar el estado del puesto", "error");
        }
    };

    // Al presionar el botón de activar/desactivar
    const handleEstadoClick = async registro => {
        if (registro.estado) {
            // Si está activo → mostrar modal de confirmación para desactivar
            setRegistroSeleccionado(registro);
            setConfirmModalVisible(true);
        } else {
            // Si está inactivo → activar directamente sin modal
            try {
                await axios.put(`http://127.0.0.1:8000/api/puestos/${registro.idpuesto}/`, {
                    ...registro,
                    estado: true
                });
                showToast("Puesto activado correctamente");
                fetchPuestos();
            } catch (error) {
                console.error(error);
                showToast("Error al activar el puesto", "error");
            }
        }
    };

    const puestosFiltrados = puestos
        // Ordenar alfabéticamente por nombre (A-Z)
        .sort((a, b) => {
            const nombreA = (a.nombrepuesto || "").toLowerCase();
            const nombreB = (b.nombrepuesto || "").toLowerCase();
            return nombreA.localeCompare(nombreB);
        })
        .filter(p => {
            const texto = busqueda.toLowerCase().trim();
            const nombreCoincide = p.nombrepuesto?.toLowerCase().includes(texto) || false;
            const descripcionCoincide = p.descripcion?.toLowerCase().includes(texto) || false;
            const salarioCoincide = p.salariobase?.toString().includes(texto) || false;
            return nombreCoincide || descripcionCoincide || salarioCoincide;
        });

    const indexOfLast = paginaActual * elementosPorPagina;
    const indexOfFirst = indexOfLast - elementosPorPagina;
    const puestosPaginados = puestosFiltrados.slice(indexOfFirst, indexOfLast);
    const totalPaginas = Math.max(Math.ceil(puestosFiltrados.length / elementosPorPagina), 1);

    return (
        <Layout>
            <SEO title="Puestos" />
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
                            <h2 style={{ marginBottom: "20px", textAlign: "center" }}>Puestos Registrados</h2>

                            {/* Buscador */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-start",
                                    marginBottom: "15px",
                                    alignItems: "center"
                                }}
                            >
                                <input
                                    type="text"
                                    placeholder="Buscar puesto..."
                                    value={busqueda}
                                    onChange={e => {
                                        setBusqueda(e.target.value);
                                        setPaginaActual(1);
                                    }}
                                    style={buttonStyles.buscador}
                                />
                            </div>                            {/* Tabla de Puestos */}
                            <PuestosTable
                                puestos={puestosPaginados}
                                onAsignarSalario={puesto => {
                                    setPuestoSeleccionado(puesto);
                                    setMostrarFormulario(true);
                                }}
                                onToggleEstado={handleEstadoClick}
                                paginaActual={paginaActual} //   importante
                                setPaginaActual={setPaginaActual} //   importante
                                totalPaginas={totalPaginas}
                            />

                            <div style={{ marginTop: "20px", textAlign: "center" }}>
                                <label style={{ marginRight: "10px", fontWeight: "600" }}>Mostrar:</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={elementosPorPagina}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        const numero = val === "" ? "" : Number(val);
                                        setElementosPorPagina(numero > 0 ? numero : 1);
                                        setPaginaActual(1);
                                    }}
                                    onFocus={e => e.target.select()}
                                    style={{
                                        width: "80px",
                                        padding: "6px",
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

                {/* Modal Asignar Salario */}
                {mostrarFormulario && (
                    <PuestoForm
                        puestoSeleccionado={puestoSeleccionado}
                        handleSubmit={handleSubmit}
                        onClose={() => setMostrarFormulario(false)}
                    />
                )}

                {/* Modal solo para desactivar */}
                {confirmModalVisible && registroSeleccionado && (
                    <ConfirmModal
                        registro={registroSeleccionado}
                        onConfirm={handleToggleEstado}
                        onCancel={() => setConfirmModalVisible(false)}
                    />
                )}

                <ScrollToTop />
            </div>
        </Layout>
    );
};

export default PuestosContainer;
