import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../../layouts";
import Header from "../../layouts/header";
import Footer from "../../layouts/footer";
import ScrollToTop from "../../components/scroll-to-top";
import SEO from "../../components/seo";
import { showToast } from "../../utils/toast.js";
import { ToastContainer } from "react-toastify";
import { buttonStyles } from "../../stylesGenerales/buttons.js";

import IdiomaForm from "./IdiomaForm";
import ConfirmModal from "./ConfirmModal";
import IdiomasTable from "./IdiomasTable";

const IdiomasContainer = () => {
  const [nombreIdioma, setNombreIdioma] = useState("");
  const [idiomas, setIdiomas] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [idiomaActivoEditando, setIdiomaActivoEditando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [idiomaSeleccionado, setIdiomaSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(5);

  useEffect(() => {
    fetchIdiomas();
  }, []);

  const fetchIdiomas = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/idiomas/");
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.results)
          ? res.data.results
          : [];
      setIdiomas(data);
    } catch (error) {
      console.error(error);
      showToast("Error al cargar los idiomas", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const yaExiste = idiomas.some(
        (i) =>
          i.nombreidioma?.trim().toLowerCase() ===
          nombreIdioma.trim().toLowerCase() && i.ididioma !== editingId
      );
      if (yaExiste) {
        showToast("Ya existe un idioma con ese nombre", "warning");
        return;
      }

      const idUsuario = Number(sessionStorage.getItem("idUsuario"));
      const payload = {
        nombreidioma: nombreIdioma,
        estado: Boolean(idiomaActivoEditando),
        idusuario: idUsuario,
      };

      if (editingId) {
        await axios.put(
          `http://127.0.0.1:8000/api/idiomas/${editingId}/`,
          payload
        );
      } else {
        await axios.post("http://127.0.0.1:8000/api/idiomas/", payload);
      }

      showToast(
        editingId
          ? "Idioma actualizado correctamente"
          : "Idioma registrado correctamente"
      );

      setNombreIdioma("");
      setEditingId(null);
      setIdiomaActivoEditando(true);
      setMostrarFormulario(false);
      fetchIdiomas();
    } catch (error) {
      const apiErr = error.response?.data;
      const detalle =
        (apiErr &&
          (apiErr.nombreidioma?.[0] ||
            apiErr.detail ||
            JSON.stringify(apiErr))) ||
        "desconocido";
      console.error("POST/PUT /idiomas error:", apiErr || error);
      showToast(`Error al guardar idioma: ${detalle}`, "error");
    }
  };

  const handleEdit = (idioma) => {
    if (!idioma.estado) {
      showToast("No se puede editar un idioma inactivo");
      return;
    }
    setNombreIdioma(idioma.nombreidioma);
    setEditingId(idioma.ididioma);
    setIdiomaActivoEditando(idioma.estado);
    setMostrarFormulario(true);
  };

  const handleDelete = (idioma) => {
    setIdiomaSeleccionado(idioma);
    setMostrarConfirmacion(true);
  };

  const handlePrepareActivate = (idioma) => {
    setIdiomaSeleccionado(idioma);
    setMostrarConfirmacion(true);
  };

  const confirmarDesactivacionIdioma = async () => {
    if (!idiomaSeleccionado) return;
    try {
      const idUsuario = Number(sessionStorage.getItem("idUsuario"));
      await axios.put(
        `http://127.0.0.1:8000/api/idiomas/${idiomaSeleccionado.ididioma}/`,
        {
          nombreidioma: idiomaSeleccionado.nombreidioma,
          estado: false,
          idusuario: idUsuario,
        }
      );
      showToast("Idioma desactivado correctamente");
      fetchIdiomas();
    } catch (error) {
      console.error(error);
      showToast("Error al desactivar el idioma", "error");
    } finally {
      setMostrarConfirmacion(false);
      setIdiomaSeleccionado(null);
    }
  };

  const handleActivate = async (id) => {
    try {
      const idioma = idiomas.find((i) => i.ididioma === id);
      if (!idioma) return;
      const idUsuario = Number(sessionStorage.getItem("idUsuario"));
      await axios.put(`http://127.0.0.1:8000/api/idiomas/${id}/`, {
        nombreidioma: idioma.nombreidioma,
        estado: true,
        idusuario: idUsuario,
      });
      showToast("Idioma activado correctamente");
      fetchIdiomas();
    } catch (error) {
      console.error(error);
      showToast("Error al activar el idioma", "error");
    }
  };

  const idiomasFiltrados = idiomas.filter((i) => {
    const texto = busqueda.toLowerCase().trim();
    const nombreCoincide = i.nombreidioma?.toLowerCase().includes(texto) || false;
    const estadoCoincide = (i.estado ? "activo" : "inactivo").startsWith(texto);
    return nombreCoincide || estadoCoincide;
  });

  const indexOfLast = paginaActual * elementosPorPagina;
  const indexOfFirst = indexOfLast - elementosPorPagina;
  const idiomasPaginados = idiomasFiltrados.slice(indexOfFirst, indexOfLast);
  const totalPaginas = Math.ceil(idiomasFiltrados.length / elementosPorPagina);

  return (
    <Layout>
      <SEO title="Idiomas" />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Header />
          <main style={{ flex: 1, padding: "40px 20px", background: "#f0f2f5" }}>
            <div style={{ maxWidth: "900px", margin: "0 auto", paddingLeft: "250px" }}>
              <h2 style={{ marginBottom: "20px", textAlign: "center" }}>
                Idiomas Registrados
              </h2>

              {/* Buscador y botón nuevo */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "15px",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="Buscar idioma..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPaginaActual(1);
                  }}
                  style={buttonStyles.buscador} 
                />
                <button
                  onClick={() => setMostrarFormulario(true)}
                  style={buttonStyles.nuevo} // <-- Usando styles importados
                >
                  Nuevo Idioma
                </button>
              </div>

              <IdiomasTable
                idiomas={idiomasPaginados}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                handlePrepareActivate={handlePrepareActivate} 
                paginaActual={paginaActual}
                totalPaginas={totalPaginas}
                setPaginaActual={setPaginaActual}
              />

              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <label style={{ marginRight: "10px", fontWeight: "600" }}>
                  Mostrar:
                </label>
                <input
                  type="number"
                  min="1"
                  value={elementosPorPagina}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    const numero = val === "" ? "" : Number(val);
                    setElementosPorPagina(numero > 0 ? numero : 1);
                    setPaginaActual(1);
                  }}
                  onFocus={(e) => e.target.select()}
                  style={{
                    width: "80px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    textAlign: "center",
                  }}
                />
              </div>
            </div>
          </main>
          <Footer />
        </div>

        {mostrarFormulario && (
          <IdiomaForm
            nombreIdioma={nombreIdioma}
            setNombreIdioma={setNombreIdioma}
            idiomaActivoEditando={idiomaActivoEditando}
            editingId={editingId}
            handleSubmit={handleSubmit}
            onClose={() => setMostrarFormulario(false)}
          />
        )}

        {mostrarConfirmacion && (
          <ConfirmModal
            idioma={idiomaSeleccionado}
            modo={idiomaSeleccionado?.estado ? "desactivar" : "activar"}
            onConfirm={() => {
              if (idiomaSeleccionado?.estado) {
                confirmarDesactivacionIdioma();
              } else {
                handleActivate(idiomaSeleccionado.ididioma);
                setMostrarConfirmacion(false);
                setIdiomaSeleccionado(null);
              }
            }}
            onCancel={() => setMostrarConfirmacion(false)}
          />
        )}

        <ToastContainer />
        <ScrollToTop />
      </div>
    </Layout>
  );
};

export default IdiomasContainer;
