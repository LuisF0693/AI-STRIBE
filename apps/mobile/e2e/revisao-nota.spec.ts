/**
 * E2E — Revisão de Nota SOAP
 * Story 3.1 — AC: 1, 2, 4, 5, 6, 10
 * Playwright + Expo Web (ou Detox no futuro)
 *
 * Pré-condição: pipeline Epic 2 executado, nota na tabela `notas` com status='draft'
 * Variáveis: CONSULTA_ID deve existir no banco de testes
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const CONSULTA_ID = process.env.E2E_CONSULTA_ID ?? 'test-consulta-uuid';

test.describe('Revisão de Nota SOAP (Story 3.1)', () => {
  test.beforeEach(async ({ page }) => {
    // Navega para a tela de revisão
    await page.goto(`${BASE_URL}/consulta/revisao/${CONSULTA_ID}`);
  });

  test('AC1: exibe as 4 seções SOAP da nota gerada', async ({ page }) => {
    await expect(page.getByText('S — Subjetivo')).toBeVisible();
    await expect(page.getByText('O — Objetivo')).toBeVisible();
    await expect(page.getByText('A — Avaliação')).toBeVisible();
    await expect(page.getByText('P — Plano')).toBeVisible();
  });

  test('AC2: edição inline atualiza o campo corretamente', async ({ page }) => {
    const inputSubjetivo = page.getByLabel(/S — Subjetivo/);
    await inputSubjetivo.click();
    await inputSubjetivo.fill('Paciente com dor de cabeça intensa há 2 dias.');
    await expect(inputSubjetivo).toHaveValue('Paciente com dor de cabeça intensa há 2 dias.');
  });

  test('AC4: badge "editado" aparece após modificar uma seção', async ({ page }) => {
    const inputObjetivo = page.getByLabel(/O — Objetivo/);
    await expect(page.getByText('editado')).not.toBeVisible();

    await inputObjetivo.click();
    await inputObjetivo.press('End');
    await inputObjetivo.type(' Pressão arterial 130/85 mmHg.');

    await expect(page.getByText('editado')).toBeVisible();
  });

  test('AC5: chip de CID pode ser removido', async ({ page }) => {
    // Verifica que há ao menos um chip de CID
    const primeiroCid = page.locator('[aria-label^="CID "]').first();
    const cidText = await primeiroCid.textContent();

    // Clica no botão de remover do primeiro CID
    const removeBtn = primeiroCid.locator('button[aria-label^="Remover CID"]');
    await removeBtn.click();

    // Verifica que o chip sumiu
    if (cidText) {
      await expect(page.getByText(cidText.trim())).not.toBeVisible();
    }
  });

  test('AC6: botão "Aprovar" fica desabilitado até revisar todas as seções', async ({ page }) => {
    // Botão desabilitado inicialmente
    const btnAprovar = page.getByRole('button', { name: /revisadas|Aprovar/ });
    await expect(btnAprovar).toBeDisabled();

    // Toca/clica em cada seção para marcá-la como vista
    for (const campo of ['S — Subjetivo', 'O — Objetivo', 'A — Avaliação', 'P — Plano']) {
      const input = page.getByLabel(new RegExp(campo));
      await input.click();
    }

    // Botão deve estar habilitado agora
    await expect(page.getByRole('button', { name: /Aprovar Nota/ })).toBeEnabled();
  });

  test('AC7: exibe skeleton quando nota ainda está sendo gerada', async ({ page }) => {
    // Navegar para consulta onde pipeline ainda está rodando
    await page.goto(`${BASE_URL}/consulta/revisao/consulta-sem-nota`);
    await expect(page.getByText('Gerando nota clínica...')).toBeVisible();
  });
});
