import { useState, FormEvent, ChangeEvent } from 'react';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_FISCALIA_API_URL || 'http://localhost:3001';

// Types
type Status = 'idle' | 'loading' | 'success' | 'error';

interface SuccessResponse {
  success: boolean;
  message: string;
  hash: string;
  hashVerified: boolean;
}

interface FormState {
  caseName: string;
  file: File | null;
}

interface ValidationErrors {
  caseName?: string;
  file?: string;
}

function App() {
  const [formState, setFormState] = useState<FormState>({
    caseName: '',
    file: null,
  });
  const [status, setStatus] = useState<Status>('idle');
  const [successData, setSuccessData] = useState<SuccessResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formState.caseName || formState.caseName.trim().length < 2) {
      errors.caseName = 'Case name must be at least 2 characters';
    }

    if (!formState.file) {
      errors.file = 'Please select a PDF file';
    } else if (!formState.file.name.toLowerCase().endsWith('.pdf')) {
      errors.file = 'Only PDF files are allowed';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCaseNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({ ...prev, caseName: e.target.value }));
    if (validationErrors.caseName) {
      setValidationErrors(prev => ({ ...prev, caseName: undefined }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFormState(prev => ({ ...prev, file: selectedFile }));
    if (validationErrors.file) {
      setValidationErrors(prev => ({ ...prev, file: undefined }));
    }
  };

  const resetForm = () => {
    setFormState({ caseName: '', file: null });
    setStatus('idle');
    setSuccessData(null);
    setErrorMessage('');
    setValidationErrors({});
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setSuccessData(null);

    try {
      const formData = new FormData();
      formData.append('caseName', formState.caseName.trim());
      formData.append('file', formState.file as File);

      const response = await fetch(`${API_BASE_URL}/cases/send`, {
        method: 'POST',
        body: formData,
        // NOTE: Do NOT set Content-Type header manually with FormData
      });

      if (!response.ok) {
        let errorMsg = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMsg = typeof errorData.message === 'string'
              ? errorData.message
              : JSON.stringify(errorData.message);
          }
        } catch {
          // Response is not JSON, use status text
          errorMsg = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data: SuccessResponse = await response.json();
      setSuccessData(data);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setErrorMessage('Network error: Unable to connect to the server. Please ensure the backend is running.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred');
      }
    }
  };

  const isFormDisabled = status === 'loading';

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="currentColor" className="logo-icon">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" stroke="currentColor" fill="none"/>
          </svg>
          <h1>Fiscalia</h1>
        </div>
        <p className="subtitle">Secure Document Transfer System</p>
      </header>

      <main className="main">
        <div className="card">
          <h2 className="card-title">Send Case to Court</h2>

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="case-name" className="label">
                Case Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="case-name"
                value={formState.caseName}
                onChange={handleCaseNameChange}
                disabled={isFormDisabled}
                placeholder="Enter case identifier"
                className={`input ${validationErrors.caseName ? 'input-error' : ''}`}
                minLength={2}
                required
              />
              {validationErrors.caseName && (
                <span className="error-text">{validationErrors.caseName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="file-input" className="label">
                PDF Document <span className="required">*</span>
              </label>
              <input
                type="file"
                id="file-input"
                onChange={handleFileChange}
                disabled={isFormDisabled}
                accept=".pdf,application/pdf"
                className={`input-file ${validationErrors.file ? 'input-error' : ''}`}
                required
              />
              {formState.file && (
                <span className="file-info">
                  Selected: {formState.file.name} ({(formState.file.size / 1024).toFixed(1)} KB)
                </span>
              )}
              {validationErrors.file && (
                <span className="error-text">{validationErrors.file}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isFormDisabled}
              className="button"
            >
              {status === 'loading' ? (
                <>
                  <span className="spinner"></span>
                  Sending...
                </>
              ) : (
                'Send to Court'
              )}
            </button>
          </form>

          {status === 'success' && successData && (
            <div className="panel panel-success">
              <h3 className="panel-title">
                <svg viewBox="0 0 24 24" fill="currentColor" className="panel-icon success-icon">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                Submission Successful
              </h3>
              <p className="panel-message">{successData.message}</p>
              <div className="panel-details">
                <div className="detail-row">
                  <span className="detail-label">SHA-256 Hash:</span>
                  <code className="detail-value hash-value">{successData.hash}</code>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Hash Verified:</span>
                  <span className={`verification-badge ${successData.hashVerified ? 'verified' : 'not-verified'}`}>
                    {successData.hashVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
              </div>
              <button onClick={resetForm} className="button button-secondary">
                Send Another Case
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="panel panel-error">
              <h3 className="panel-title">
                <svg viewBox="0 0 24 24" fill="currentColor" className="panel-icon error-icon">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                Submission Failed
              </h3>
              <p className="panel-message">{errorMessage}</p>
              <button onClick={resetForm} className="button button-secondary">
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Secure PDF Transfer System - Fiscalia Module</p>
      </footer>
    </div>
  );
}

export default App;
