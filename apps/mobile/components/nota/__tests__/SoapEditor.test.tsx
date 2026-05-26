/**
 * SoapEditor tests
 * Story 3.1 — AC: 1, 2, 4, 5, 10
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SoapEditor } from '../SoapEditor';
import type { SoapJson, CidSugestao } from '@aiscribe/shared';

const mockSoap: SoapJson = {
  subjetivo: 'Paciente relata dor de cabeça há 3 dias.',
  objetivo: 'PA 120/80, FC 72bpm. Sem rigidez de nuca.',
  avaliacao: 'Cefaleia tensional provável.',
  plano: 'Dipirona 500mg 8/8h por 3 dias. Retorno se não melhorar.',
};

const mockCids: CidSugestao[] = [
  { codigo: 'G43', descricao: 'Enxaqueca', confianca: 0.82 },
  { codigo: 'G44', descricao: 'Outras síndromes de cefaleia', confianca: 0.65 },
];

describe('SoapEditor', () => {
  it('renderiza as 4 seções SOAP', () => {
    render(
      <SoapEditor
        soap={mockSoap}
        cids={mockCids}
        editedFields={new Set()}
        onChangeField={jest.fn()}
        onRemoveCid={jest.fn()}
      />,
    );

    expect(screen.getByDisplayValue(mockSoap.subjetivo)).toBeTruthy();
    expect(screen.getByDisplayValue(mockSoap.objetivo)).toBeTruthy();
    expect(screen.getByDisplayValue(mockSoap.avaliacao)).toBeTruthy();
    expect(screen.getByDisplayValue(mockSoap.plano)).toBeTruthy();
  });

  it('chama onChangeField ao editar uma seção', () => {
    const onChangeField = jest.fn();
    render(
      <SoapEditor
        soap={mockSoap}
        cids={[]}
        editedFields={new Set()}
        onChangeField={onChangeField}
        onRemoveCid={jest.fn()}
      />,
    );

    const inputSubjetivo = screen.getByDisplayValue(mockSoap.subjetivo);
    fireEvent.changeText(inputSubjetivo, 'Novo texto subjetivo');

    expect(onChangeField).toHaveBeenCalledWith('subjetivo', 'Novo texto subjetivo');
  });

  it('exibe badge "editado" apenas nas seções modificadas — AC: 4', () => {
    const editedFields = new Set<keyof SoapJson>(['subjetivo']);
    render(
      <SoapEditor
        soap={mockSoap}
        cids={[]}
        editedFields={editedFields}
        onChangeField={jest.fn()}
        onRemoveCid={jest.fn()}
      />,
    );

    const badges = screen.getAllByText('editado');
    expect(badges).toHaveLength(1);
  });

  it('renderiza chips de CID removíveis — AC: 5', () => {
    const onRemoveCid = jest.fn();
    render(
      <SoapEditor
        soap={mockSoap}
        cids={mockCids}
        editedFields={new Set()}
        onChangeField={jest.fn()}
        onRemoveCid={onRemoveCid}
      />,
    );

    expect(screen.getByLabelText('CID G43: Enxaqueca')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Remover CID G43'));
    expect(onRemoveCid).toHaveBeenCalledWith('G43');
  });

  it('não exibe seção de CIDs quando lista está vazia', () => {
    render(
      <SoapEditor
        soap={mockSoap}
        cids={[]}
        editedFields={new Set()}
        onChangeField={jest.fn()}
        onRemoveCid={jest.fn()}
      />,
    );

    expect(screen.queryByText('CIDs sugeridos pela IA')).toBeNull();
  });

  it('chama onSectionViewed ao focar em uma seção — AC: 6', () => {
    const onSectionViewed = jest.fn();
    render(
      <SoapEditor
        soap={mockSoap}
        cids={[]}
        editedFields={new Set()}
        onChangeField={jest.fn()}
        onRemoveCid={jest.fn()}
        onSectionViewed={onSectionViewed}
      />,
    );

    const inputPlano = screen.getByDisplayValue(mockSoap.plano);
    fireEvent(inputPlano, 'focus');
    expect(onSectionViewed).toHaveBeenCalledWith('plano');
  });

  it('todos os inputs têm accessibilityLabel — AC: 10', () => {
    render(
      <SoapEditor
        soap={mockSoap}
        cids={[]}
        editedFields={new Set()}
        onChangeField={jest.fn()}
        onRemoveCid={jest.fn()}
      />,
    );

    expect(screen.getByLabelText(/S — Subjetivo/)).toBeTruthy();
    expect(screen.getByLabelText(/O — Objetivo/)).toBeTruthy();
    expect(screen.getByLabelText(/A — Avaliação/)).toBeTruthy();
    expect(screen.getByLabelText(/P — Plano/)).toBeTruthy();
  });
});
