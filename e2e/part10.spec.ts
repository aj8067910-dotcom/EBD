import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const DIR = 'screenshots';
mkdirSync(DIR, { recursive: true });

async function login(page: Page) {
  await page.goto('/teacher/login');
  await page.getByLabel('E-mail').fill('professor@koinonia.dev');
  await page.getByLabel('Senha').fill('demo1234');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  const skip = page.getByRole('button', { name: 'Pular' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

test('leitura diária: criar, gerar arte, enviar e perfil', async ({ page }) => {
  page.on('dialog', (d) => d.accept()); // auto-confirm the send dialog

  await login(page);

  // WhatsApp login option is present.
  await page.goto('/teacher/login');
  await page.getByRole('button', { name: 'WhatsApp' }).click();
  await expect(page.getByLabel(/número de whatsapp/i)).toBeVisible();
  await page.screenshot({ path: `${DIR}/11-whatsapp-login.png` });

  await login(page);

  // Navigate to Daily Reading.
  await page.getByRole('link', { name: 'Leitura Diária' }).click();
  await expect(page).toHaveURL(/\/teacher\/daily-readings/);
  await page.screenshot({ path: `${DIR}/12-daily-empty.png` });

  // Create a reading.
  await page.getByRole('button', { name: '+ Nova leitura' }).click();
  await page.getByText('Título', { exact: true }).locator('input').fill('A Graça que nos Alcança');
  await page.getByText('Versículo', { exact: true }).locator('textarea').fill(
    'Porque pela graça sois salvos, por meio da fé.',
  );
  await page.getByText('Referência', { exact: true }).locator('input').fill('Efésios 2:8');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('A Graça que nos Alcança').first()).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({ path: `${DIR}/13-daily-list.png`, fullPage: true });

  // Preview the generated art.
  await page.getByRole('button', { name: 'Visualizar' }).first().click();
  const art = page.getByRole('img', { name: /Arte:/ });
  await expect(art).toBeVisible();
  // The art image actually loads (natural width > 0).
  await expect
    .poll(async () => art.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  await page.screenshot({ path: `${DIR}/14-daily-preview.png` });

  // Send to everyone.
  await page.getByRole('button', { name: 'Enviar para todos' }).click();

  // Profile page.
  await page.goto('/profile');
  await expect(page.getByText(/receber leitura diária/i)).toBeVisible();
  await page.screenshot({ path: `${DIR}/15-profile.png` });
});
