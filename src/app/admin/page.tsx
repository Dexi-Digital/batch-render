'use client';

import { useState, useRef } from 'react';

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    total?: number;
    disponiveis?: number;
    vendidas?: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Erro no upload' });
      } else {
        setResult({
          success: true,
          message: data.message,
          total: data.total,
          disponiveis: data.disponiveis,
          vendidas: data.vendidas,
        });
      }
    } catch {
      setResult({ success: false, message: 'Falha na conexão com o servidor' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f4f4f4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32,
        boxShadow: '0 4px 24px rgba(0,0,0,.08)', width: 420, maxWidth: '90vw',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#161616', marginTop: 0 }}>
          Admin — Jardim das Acácias II
        </h1>
        <p style={{ fontSize: 13, color: '#525252', marginBottom: 24 }}>
          Faça o upload de um novo CSV para atualizar os dados do mapa.
        </p>

        <label style={{
          display: 'block', border: '2px dashed #c6c6c6', borderRadius: 8,
          padding: 24, textAlign: 'center', cursor: 'pointer',
          background: '#fafafa', marginBottom: 16, transition: 'border-color .15s',
        }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={() => setResult(null)}
          />
          <div style={{ fontSize: 28, marginBottom: 8 }}>
            <i className="fas fa-file-csv" style={{ color: '#0043ce' }}></i>
          </div>
          <div style={{ fontSize: 13, color: '#525252' }}>
            Clique para selecionar o arquivo CSV
          </div>
          <div style={{ fontSize: 11, color: '#8d8d8d', marginTop: 4 }}>
            Formato: RelatorioUnidades.csv (separado por ponto-e-vírgula)
          </div>
        </label>

        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 8,
            background: uploading ? '#a8a8a8' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
            color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
            cursor: uploading ? 'not-allowed' : 'pointer', transition: 'opacity .15s',
          }}
        >
          {uploading ? 'Enviando...' : 'Enviar CSV e Atualizar Mapa'}
        </button>

        {result && (
          <div style={{
            marginTop: 16, padding: 14, borderRadius: 8,
            background: result.success ? '#defbe6' : '#fff1f1',
            border: `1px solid ${result.success ? '#198038' : '#da1e28'}`,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: result.success ? '#198038' : '#da1e28',
              marginBottom: result.success ? 8 : 0,
            }}>
              {result.success ? '✓ ' : '✕ '}{result.message}
            </div>
            {result.success && (
              <div style={{ fontSize: 12, color: '#161616' }}>
                <div>Total de lotes: <b>{result.total}</b></div>
                <div>Disponíveis: <b style={{ color: '#198038' }}>{result.disponiveis}</b></div>
                <div>Vendidas: <b style={{ color: '#da1e28' }}>{result.vendidas}</b></div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <a href="/" style={{ fontSize: 12, color: '#0043ce', textDecoration: 'none' }}>
            ← Voltar ao mapa
          </a>
        </div>
      </div>
    </div>
  );
}
