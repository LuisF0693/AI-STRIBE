/**
 * useSoapDraftWeb — versão web do useSoapDraft
 * Story 3.1 — AC: 3, 4, 9
 * Usa localStorage no lugar de AsyncStorage (web).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { SoapJson, CidSugestao } from '@aiscribe/shared';

type SoapField = keyof SoapJson;

const AUTOSAVE_DELAY_MS = 5000;

function storageKey(notaId: string) {
  return `soap_draft_${notaId}`;
}

export function useSoapDraftWeb(notaId: string | null, initialSoap: SoapJson, initialCids: CidSugestao[]) {
  const [soap, setSoap] = useState<SoapJson>(initialSoap);
  const [cids, setCids] = useState<CidSugestao[]>(initialCids);
  const [editedFields, setEditedFields] = useState<Set<SoapField>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!notaId) return;
    const raw = localStorage.getItem(storageKey(notaId));
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { soap: SoapJson; cids: CidSugestao[]; editedFields: SoapField[] };
      setSoap(saved.soap);
      setCids(saved.cids);
      setEditedFields(new Set(saved.editedFields));
    } catch { /* rascunho corrompido */ }
  }, [notaId]);

  const scheduleSave = useCallback(
    (nextSoap: SoapJson, nextCids: CidSugestao[], nextEdited: Set<SoapField>) => {
      if (!notaId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        localStorage.setItem(
          storageKey(notaId),
          JSON.stringify({ soap: nextSoap, cids: nextCids, editedFields: Array.from(nextEdited) }),
        );
      }, AUTOSAVE_DELAY_MS);
    },
    [notaId],
  );

  const updateSoapField = useCallback(
    (field: SoapField, value: string) => {
      setSoap((prev) => {
        const next = { ...prev, [field]: value };
        const nextEdited = new Set(editedFields).add(field);
        setEditedFields(nextEdited);
        scheduleSave(next, cids, nextEdited);
        return next;
      });
    },
    [cids, editedFields, scheduleSave],
  );

  const removeCid = useCallback(
    (codigo: string) => {
      setCids((prev) => {
        const next = prev.filter((c) => c.codigo !== codigo);
        scheduleSave(soap, next, editedFields);
        return next;
      });
    },
    [soap, editedFields, scheduleSave],
  );

  const clearDraft = useCallback(() => {
    if (!notaId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    localStorage.removeItem(storageKey(notaId));
  }, [notaId]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return { soap, cids, editedFields, updateSoapField, removeCid, clearDraft };
}
