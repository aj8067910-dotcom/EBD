import { test, expect, type Page } from '@playwright/test';

async function dismissTour(page: Page) {
  const skip = page.getByRole('button', { name: 'Pular' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

test('aula completa: professor + 2 alunos + projetor', async ({ browser }) => {
  // --- Teacher: login, start a class ---------------------------------------
  const teacherCtx = await browser.newContext();
  const teacher = await teacherCtx.newPage();
  await teacher.goto('/teacher/login');
  await teacher.getByLabel('E-mail').fill('professor@koinonia.dev');
  await teacher.getByLabel('Senha').fill('demo1234');
  await teacher.getByRole('button', { name: 'Entrar' }).click();

  await expect(teacher).toHaveURL(/\/teacher$/);
  await dismissTour(teacher);

  await teacher.getByRole('button', { name: 'Iniciar aula' }).first().click();
  await expect(teacher).toHaveURL(/\/teacher\/live\//);
  const code = teacher.url().split('/live/')[1]!;
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  // --- Projector ------------------------------------------------------------
  const screenCtx = await browser.newContext();
  const screen = await screenCtx.newPage();
  await screen.goto(`/screen/${code}`);
  await expect(screen.getByText(code).first()).toBeVisible();

  // --- Two students join ----------------------------------------------------
  async function joinStudent(nickname: string) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/join/${code}`);
    await page.getByLabel('Seu apelido').fill(nickname);
    const enter = page.getByRole('button', { name: /entrar/i });
    await expect(enter).toBeEnabled({ timeout: 10_000 });
    await enter.click();
    await expect(page).toHaveURL(new RegExp(`/room/${code}`));
    await expect(
      page.getByText(/aguardando o professor iniciar/i),
    ).toBeVisible();
    return page;
  }
  const ana = await joinStudent('Ana');
  const beto = await joinStudent('Beto');

  // --- Teacher starts the word-cloud moment --------------------------------
  await teacher
    .locator('li', { hasText: 'Abertura' })
    .getByRole('button', { name: 'Iniciar' })
    .click();

  // --- Students answer ------------------------------------------------------
  await ana.getByLabel('Uma palavra').fill('graca');
  await ana.getByRole('button', { name: /enviar palavra/i }).click();
  await expect(ana.getByText(/resposta enviada/i)).toBeVisible();

  await beto.getByLabel('Uma palavra').fill('amor');
  await beto.getByRole('button', { name: /enviar palavra/i }).click();
  await expect(beto.getByText(/resposta enviada/i)).toBeVisible();

  // --- Projector reflects the aggregated word cloud ------------------------
  await expect(screen.getByText('graca')).toBeVisible({ timeout: 10_000 });
  await expect(screen.getByText('amor')).toBeVisible({ timeout: 10_000 });

  await teacherCtx.close();
  await screenCtx.close();
  await ana.context().close();
  await beto.context().close();
});
