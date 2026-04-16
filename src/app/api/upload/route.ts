import { NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

const CSV_HEADERS: Record<string, string> = {
  NomeEmpreendimento: 'empreendimento',
  NomeGrupo: 'quadra',
  NomeUnidade: 'lote',
  Situacao: 'situacao',
  DimensaoFrente: 'frente',
  DimensaoFundos: 'fundos',
  DimensaoEsquerda: 'esquerda',
  DimensaoDireita: 'direita',
  Descricao: 'descricao',
  Observacoes: 'observacoes',
  AreaTotal: 'area',
  ValorMetroQuadrado: 'valorM2',
  ConfrontacaoFrente: 'confrontFrente',
  ConfrontacaoFundos: 'confrontFundos',
  ConfrontacaoEsquerda: 'confrontEsq',
  ConfrontacaoDireita: 'confrontDir',
  NumeroMatricula: 'matricula',
  DataMatricula: 'dataMatricula',
  ValorUnidade: 'valor',
};

function parseCSV(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV vazio ou sem dados');

  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));

  const colMap: Record<number, string> = {};
  headers.forEach((h, i) => {
    if (CSV_HEADERS[h]) colMap[i] = CSV_HEADERS[h];
  });

  if (Object.keys(colMap).length === 0) {
    throw new Error('Nenhuma coluna reconhecida no CSV. Verifique o formato.');
  }

  const lots = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lot: Record<string, any> = {};
    for (const [idx, field] of Object.entries(colMap)) {
      lot[field] = vals[Number(idx)] || '';
    }
    if (lot.quadra && lot.lote) lots.push(lot);
  }

  return lots;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return Response.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return Response.json({ error: 'O arquivo deve ser um CSV' }, { status: 400 });
    }

    const text = await file.text();
    const lots = parseCSV(text);

    if (lots.length === 0) {
      return Response.json({ error: 'Nenhum lote encontrado no CSV' }, { status: 400 });
    }

    const jsonPath = path.join(process.cwd(), 'public', 'lots_data.json');
    await writeFile(jsonPath, JSON.stringify(lots, null, 2), 'utf-8');

    return Response.json({
      message: 'Upload realizado com sucesso',
      total: lots.length,
      disponiveis: lots.filter(l => l.situacao === 'Disponível').length,
      vendidas: lots.filter(l => l.situacao === 'Vendida' || l.situacao === 'Bloqueada').length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return Response.json({ error: message }, { status: 500 });
  }
}
