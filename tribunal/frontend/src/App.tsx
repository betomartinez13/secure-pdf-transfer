import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

interface Case {
  id: number;
  caseName: string;
  fileName: string;
  receivedAt: string;
  hashVerified: boolean;
}

const API_BASE_URL = 'http://localhost:4001';

function App() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<Case[]>(`${API_BASE_URL}/cases`);
      setCases(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener los expedientes';
      setError(message);
      console.error('Error fetching cases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleDownload = async (caseId: number, fileName: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cases/${caseId}/download`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Error al descargar el archivo. Por favor intente nuevamente.');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Servidor del Tribunal - Expedientes Recibidos</h1>
      </header>

      <main className="main-content">
        <div className="controls">
          <button
            className="refresh-button"
            onClick={fetchCases}
            disabled={loading}
          >
            {loading ? 'Cargando...' : 'Actualizar Lista'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchCases}>Reintentar</button>
          </div>
        )}

        {!loading && !error && cases.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h2>No se encontraron expedientes</h2>
            <p>Aún no se han recibido casos de la Fiscalía. Los documentos aparecerán aquí automáticamente.</p>
          </div>
        )}

        {cases.length > 0 && (
          <div className="table-container">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre del Caso</th>
                  <th>Archivo</th>
                  <th>Fecha de Recepción</th>
                  <th>Integridad (Hash)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caseItem) => (
                  <tr key={caseItem.id}>
                    <td className="id-cell">{caseItem.id}</td>
                    <td className="case-name-cell">{caseItem.caseName}</td>
                    <td className="file-name-cell">{caseItem.fileName}</td>
                    <td className="date-cell">{formatDate(caseItem.receivedAt)}</td>
                    <td className="verification-cell">
                      {caseItem.hashVerified ? (
                        <span className="verified" title="Verificado Correctamente">✅</span>
                      ) : (
                        <span className="not-verified" title="Error de Integridad">❌</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button
                        className="download-button"
                        onClick={() => handleDownload(caseItem.id, caseItem.fileName)}
                      >
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && cases.length === 0 && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando expedientes...</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Sistema de Transferencia Segura - Portal del Tribunal</p>
      </footer>
    </div>
  );
}

export default App;