'use client';
/**
 * Página de revisão da nota SOAP — Web
 * Story 3.1 — AC: 9 (layout desktop 2 colunas)
 * Next.js 16+ App Router — Client Component (interatividade)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '../../../lib/supabase';
import { useSoapDraftWeb } from '../../../hooks/useSoapDraftWeb';
import type { Nota, SoapJson } from '@aiscribe/shared';

type SoapField = keyof SoapJson;

const SECOES: { campo: SoapField; label: string; descricao: string }[] = [
  { campo: 'subjetivo', label: 'S — Subjetivo', descricao: 'Queixas e histórico relatado pelo paciente' },
  { campo: 'objetivo', label: 'O — Objetivo', descricao: 'Dados observados e exame físico' },
  { campo: 'avaliacao', label: 'A — Avaliação', descricao: 'Hipótese diagnóstica' },
  { campo: 'plano', label: 'P — Plano', descricao: 'Conduta, prescrições e retorno' },
];

const TODAS_SECOES: SoapField[] = ['subjetivo', 'objetivo', 'avaliacao', 'plano'];

interface PageProps {
  params: { id: string };
}

export default function RevisaoNotaPage({ params }: PageProps) {
  const { id: consultaId } = params;
  const router = useRouter();

  const [nota, setNota] = useState<Nota | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [secoesVistas, setSecoesVistas] = useState<Set<SoapField>>(new Set());

  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    supabase
      .from('notas')
      .select('id, consulta_id, transcricao_id, soap_json, cids_sugeridos, status, baixa_confianca, versao, created_at, updated_at')
      .eq('consulta_id', consultaId)
      .order('versao', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        setCarregando(false);
        if (error) { setErro('Não foi possível carregar a nota.'); return; }
        if (data) setNota(data as Nota);
        else setErro('Nota não encontrada para esta consulta.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaId]);

  const draft = useSoapDraftWeb(
    nota?.id ?? null,
    nota?.soap_json ?? { subjetivo: '', objetivo: '', avaliacao: '', plano: '' },
    nota?.cids_sugeridos ?? [],
  );

  const handleSectionViewed = useCallback((field: SoapField) => {
    setSecoesVistas((prev) => { const n = new Set(prev); n.add(field); return n; });
  }, []);

  const todasVistas = TODAS_SECOES.every((s) => secoesVistas.has(s));

  const handleAprovar = useCallback(() => {
    if (!nota || !todasVistas) return;
    router.push(`/consulta/aprovar/${consultaId}?nota_id=${nota.id}`);
  }, [nota, todasVistas, consultaId, router]);

  if (carregando) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (erro || !nota) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
        <p className="text-red-400">{erro ?? 'Nota não encontrada.'}</p>
        <button onClick={() => router.back()} className="text-blue-400 underline">
          Voltar
        </button>
      </div>
    );
  }

  // Layout 2 colunas — S+O esquerda / A+P direita (AC: 9)
  const colEsquerda: SoapField[] = ['subjetivo', 'objetivo'];
  const colDireita: SoapField[] = ['avaliacao', 'plano'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
        <button
          onClick={() => router.back()}
          className="text-blue-400 hover:text-blue-300 transition-colors"
          aria-label="Voltar"
        >
          ← Voltar
        </button>
        <h1 className="text-lg font-bold">Revisão da Nota Clínica</h1>
        <button
          onClick={handleAprovar}
          disabled={!todasVistas}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            todasVistas
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'cursor-not-allowed bg-slate-800 text-slate-500'
          }`}
          aria-label={todasVistas ? 'Prosseguir para aprovação' : 'Revise todas as seções antes de aprovar'}
          aria-disabled={!todasVistas}
        >
          {todasVistas ? 'Aprovar Nota →' : `${secoesVistas.size}/4 revisadas`}
        </button>
      </header>

      {/* Aviso baixa confiança */}
      {nota.baixa_confianca && (
        <div className="bg-amber-900/50 px-6 py-3 text-center text-sm text-amber-200" role="alert">
          ⚠️ Transcrição curta — revise a nota com atenção antes de aprovar
        </div>
      )}

      {/* Grid 2 colunas */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Coluna esquerda: S + O */}
          <div className="flex flex-col gap-6">
            {colEsquerda.map((campo) => {
              const secao = SECOES.find((s) => s.campo === campo)!;
              return (
                <SecaoEditor
                  key={campo}
                  campo={campo}
                  label={secao.label}
                  descricao={secao.descricao}
                  value={draft.soap[campo]}
                  isEdited={draft.editedFields.has(campo)}
                  onChange={draft.updateSoapField}
                  onFocus={() => handleSectionViewed(campo)}
                />
              );
            })}
          </div>

          {/* Coluna direita: A + P */}
          <div className="flex flex-col gap-6">
            {colDireita.map((campo) => {
              const secao = SECOES.find((s) => s.campo === campo)!;
              return (
                <SecaoEditor
                  key={campo}
                  campo={campo}
                  label={secao.label}
                  descricao={secao.descricao}
                  value={draft.soap[campo]}
                  isEdited={draft.editedFields.has(campo)}
                  onChange={draft.updateSoapField}
                  onFocus={() => handleSectionViewed(campo)}
                />
              );
            })}

            {/* Chips de CID */}
            {draft.cids.length > 0 && (
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  CIDs sugeridos pela IA
                </p>
                <div className="flex flex-wrap gap-2">
                  {draft.cids.map((cid) => (
                    <span
                      key={cid.codigo}
                      className="flex items-center gap-2 rounded-full bg-blue-950 px-3 py-1.5 text-xs text-blue-300"
                      aria-label={`CID ${cid.codigo}: ${cid.descricao}`}
                    >
                      <span>{cid.codigo} · {cid.descricao}</span>
                      <button
                        onClick={() => draft.removeCid(cid.codigo)}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-800 text-blue-200 hover:bg-blue-700 transition-colors"
                        aria-label={`Remover CID ${cid.codigo}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Indicador de progresso */}
        {!todasVistas && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Clique em cada seção para marcar como revisada antes de aprovar
          </p>
        )}
      </main>
    </div>
  );
}

interface SecaoEditorProps {
  campo: SoapField;
  label: string;
  descricao: string;
  value: string;
  isEdited: boolean;
  onChange: (field: SoapField, value: string) => void;
  onFocus: () => void;
}

function SecaoEditor({ campo, label, descricao, value, isEdited, onChange, onFocus }: SecaoEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label
          htmlFor={`soap-${campo}`}
          className={`text-xs font-bold uppercase tracking-widest ${isEdited ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          {label}
        </label>
        {isEdited && (
          <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            editado
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">{descricao}</p>
      <textarea
        id={`soap-${campo}`}
        value={value}
        onChange={(e) => onChange(campo, e.target.value)}
        onFocus={onFocus}
        rows={6}
        placeholder={`Digite ${label.toLowerCase()}...`}
        aria-label={`${label}: ${descricao}`}
        className={`w-full resize-y rounded-xl border bg-slate-900 p-4 text-sm leading-relaxed text-slate-100 placeholder-slate-600 outline-none transition-colors focus:ring-2 focus:ring-blue-600 ${
          isEdited ? 'border-emerald-700' : 'border-slate-700'
        }`}
      />
    </div>
  );
}
