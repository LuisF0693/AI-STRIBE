/**
 * useSoapDraft
 * Story 3.1 — AC: 3, 4, 8
 * Gerencia rascunho local da nota SOAP:
 * - Auto-save para AsyncStorage a cada 5s (debounce)
 * - Rastreia quais seções foram editadas vs geradas por IA
 * - Persistência offline: salva localmente, sincroniza ao reconectar
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SoapJson, CidSugestao } from '@aiscribe/shared';

type SoapField = keyof SoapJson;

interface SoapDraftState {
  soap: SoapJson;
  cids: CidSugestao[];
  editedFields: Set<SoapField>;
}

const AUTOSAVE_DELAY_MS = 5000;

function storageKey(notaId: string) {
  return `soap_draft_${notaId}`;
}

export function useSoapDraft(notaId: string | null, initialSoap: SoapJson, initialCids: CidSugestao[]) {
  const [soap, setSoap] = useState<SoapJson>(initialSoap);
  const [cids, setCids] = useState<CidSugestao[]>(initialCids);
  const [editedFields, setEditedFields] = useState<Set<SoapField>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega rascunho salvo localmente ao montar (AC: 8 — offline)
  useEffect(() => {
    if (!notaId) return;
    AsyncStorage.getItem(storageKey(notaId)).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as { soap: SoapJson; cids: CidSugestao[]; editedFields: SoapField[] };
        setSoap(saved.soap);
        setCids(saved.cids);
        setEditedFields(new Set(saved.editedFields));
      } catch {
        // rascunho corrompido — ignora silenciosamente
      }
    });
  }, [notaId]);

  // Persiste rascunho no AsyncStorage com debounce 5s (AC: 3)
  const scheduleSave = useCallback(
    (nextSoap: SoapJson, nextCids: CidSugestao[], nextEdited: Set<SoapField>) => {
      if (!notaId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        AsyncStorage.setItem(
          storageKey(notaId),
          JSON.stringify({ soap: nextSoap, cids: nextCids, editedFields: Array.from(nextEdited) }),
        );
      }, AUTOSAVE_DELAY_MS);
    },
    [notaId],
  );

  // Atualiza uma seção SOAP e marca como editada (AC: 4)
  // Usa refs para evitar stale closure — SoapEditor não re-renderiza desnecessariamente
  const cidsRef = useRef(cids);
  cidsRef.current = cids;

  const updateSoapField = useCallback(
    (field: SoapField, value: string) => {
      setSoap((prevSoap) => {
        const next = { ...prevSoap, [field]: value };
        setEditedFields((prevEdited) => {
          const nextEdited = new Set(prevEdited).add(field);
          scheduleSave(next, cidsRef.current, nextEdited);
          return nextEdited;
        });
        return next;
      });
    },
    [scheduleSave],
  );

  // Remove um CID sugerido (AC: 5)
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

  // Limpa rascunho local após aprovação (Story 3.2)
  const clearDraft = useCallback(() => {
    if (!notaId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    AsyncStorage.removeItem(storageKey(notaId));
  }, [notaId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    soap,
    cids,
    editedFields,
    updateSoapField,
    removeCid,
    clearDraft,
  };
}
