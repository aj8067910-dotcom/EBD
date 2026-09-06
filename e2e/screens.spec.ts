import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const DIR = 'screenshots';
mkdirSync(DIR, { recursive: true });

async function dismissTour(page: Page) {
  const skip = page.getByRole('button', { name: 'Pular' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

// Single flow so the room code stays consistent across the actors.
test('capturas da identidade El Shaday', async ({ browser }) => {
  const phone = { width: 402, height: 850 };
  const wide = { width: 1366, height: 820 };

  // --- Landing (phone) ------------------------------------------------------
  const visitorCtx = await browser.newContext({ viewport: phone });
  const visitor = await visitorCtx.newPage();
  await visitor.goto('/');
  await expect(visitor.getByRole('heading', { name: /el shaday/i })).toBeVisible();
  await visitor.waitForTimeout(400);
  await visitor.screenshot({ path: `${DIR}/01-landing.png` });

  // --- Teacher login (wide) -------------------------------------------------
  const teacherCtx = await browser.newContext({ viewport: wide });
  const teacher = await teacherCtx.newPage();
  await teacher.goto('/teacher/login');
  await teacher.waitForTimeout(300);
  await teacher.screenshot({ path: `${DIR}/02-login.png` });

  await teacher.getByLabel('E-mail').fill('professor@koinonia.dev');
  await teacher.getByLabel('Senha').fill('demo1234');
  await teacher.getByRole('button', { name: 'Entrar' }).click();
  await expect(teacher).toHaveURL(/\/teacher$/);
  await teacher.waitForTimeout(300);
  await teacher.screenshot({ path: `${DIR}/03-dashboard-tour.png` });
  await dismissTour(teacher);
  await teacher.waitForTimeout(200);

  // --- Lesson editor --------------------------------------------------------
  await teacher.getByRole('button', { name: 'Editar' }).first().click();
  await expect(teacher).toHaveURL(/\/teacher\/lessons\//);
  await teacher.waitForTimeout(400);
  await teacher.screenshot({ path: `${DIR}/04-editor.png`, fullPage: true });

  // --- Start a class --------------------------------------------------------
  await teacher.getByRole('button', { name: 'Iniciar aula' }).first().click();
  await expect(teacher).toHaveURL(/\/teacher\/live\//);
  const code = teacher.url().split('/live/')[1]!;
  await teacher.waitForTimeout(500);

  // --- Student joins (phone) ------------------------------------------------
  const studentCtx = await browser.newContext({ viewport: phone });
  const student = await studentCtx.newPage();
  await student.goto(`/join/${code}`);
  await student.getByLabel('Seu apelido').fill('Ana');
  await expect(student.getByRole('button', { name: /entrar/i })).toBeEnabled();
  await student.waitForTimeout(300);
  await student.screenshot({ path: `${DIR}/05-join.png` });
  await student.getByRole('button', { name: /entrar/i }).click();
  await expect(
    student.getByText(/aguardando o professor iniciar/i),
  ).toBeVisible();
  await student.waitForTimeout(300);
  await student.screenshot({ path: `${DIR}/06-student-waiting.png` });

  // --- Projector (wide) -----------------------------------------------------
  const screenCtx = await browser.newContext({ viewport: wide });
  const screenPage = await screenCtx.newPage();
  await screenPage.goto(`/screen/${code}`);
  await expect(screenPage.getByText(code).first()).toBeVisible();
  await screenPage.waitForTimeout(600);
  await screenPage.screenshot({ path: `${DIR}/07-projector-waiting.png` });

  // --- Teacher starts the word-cloud moment; student answers ---------------
  await teacher
    .locator('li', { hasText: 'Abertura' })
    .getByRole('button', { name: 'Iniciar' })
    .click();
  await teacher.waitForTimeout(500);
  await teacher.screenshot({ path: `${DIR}/08-live-panel.png` });

  await student.getByLabel('Uma palavra').fill('graca');
  await student.getByRole('button', { name: /enviar palavra/i }).click();
  await expect(student.getByText(/resposta enviada/i)).toBeVisible();
  await student.waitForTimeout(300);
  await student.screenshot({ path: `${DIR}/09-student-answered.png` });

  // A second word so the projector cloud has more to show.
  const student2Ctx = await browser.newContext({ viewport: phone });
  const student2 = await student2Ctx.newPage();
  await student2.goto(`/join/${code}`);
  await student2.getByLabel('Seu apelido').fill('Beto');
  await expect(student2.getByRole('button', { name: /entrar/i })).toBeEnabled();
  await student2.getByRole('button', { name: /entrar/i }).click();
  await student2.getByLabel('Uma palavra').fill('amor');
  await student2.getByRole('button', { name: /enviar palavra/i }).click();

  await expect(screenPage.getByText('graca')).toBeVisible({ timeout: 10_000 });
  await screenPage.waitForTimeout(600);
  await screenPage.screenshot({ path: `${DIR}/10-projector-wordcloud.png` });

  for (const c of [visitorCtx, teacherCtx, studentCtx, screenCtx, student2Ctx]) {
    await c.close();
  }
});
