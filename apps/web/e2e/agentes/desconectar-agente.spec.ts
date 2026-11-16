// spec: e2e/plano-de-testes-f10.md
// seed: e2e/seed.spec.ts
import { expect, logIn, test } from "../fixtures";
import { isConnected, setConnected } from "../support/agents";
import { agentsDialog, agentsSection } from "../support/agents-dialog";
import { readyHistory } from "../support/conversation-page";
import { insertMessages, setAdminOf, setThemeOf } from "../support/database";
import { routeServerAction } from "../support/server-action";

const CONFIRM = "Desconectar Assistente?";

test.describe("Desconectar um Agente", () => {
  test.afterEach(async () => {
    await setConnected("assistente", false);
  });

  test("cancelar repetidamente devolve o foco sem desconectar nos dois temas", async ({
    page, person, makeAdmin, agentsLock,
  }, testInfo) => {
    void agentsLock;
    test.setTimeout(90_000);
    await setConnected("assistente", true);
    await makeAdmin(person);
    await logIn(page, person);
    for (const theme of ["light", "dark"] as const) {
      await setThemeOf(person.id, theme);
      await page.reload();
      await agentsSection(page).getByRole("button", { name: "Gerenciar agentes" }).click();
      const dialog = agentsDialog(page);
      const trigger = dialog.getByRole("button", { name: "Desconectar", exact: true });
      const confirmation = page.getByRole("alertdialog", { name: CONFIRM });
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const action of ["Escape", "Cancelar"] as const) {
          await trigger.press("Enter");
          const cancel = confirmation.getByRole("button", { name: "Cancelar", exact: true });
          await expect(cancel).toBeFocused();
          if (action === "Escape") await page.keyboard.press("Escape");
          else await cancel.press("Enter");
          await expect(confirmation).toHaveCount(0);
          await expect(dialog).toBeVisible();
          await expect(trigger).toBeFocused();
          expect(await isConnected("assistente")).toBe(true);
        }
      }
      await testInfo.attach(`Cancelamento preserva agente e foco ${theme}`, {
        body: await page.screenshot(), contentType: "image/png",
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
  });

  test("o administrador desconecta pelo teclado", async ({
    page,
    person,
    otherPage,
    sharedChannel,
    makeAdmin,
    agentsLock,
  }) => {
    void agentsLock;
    // 1. O assistente conectado e uma Mensagem antiga que o menciona; a Ana administra
    await setConnected("assistente", true);
    await insertMessages(sharedChannel, [
      { author: person, body: "Pergunta antiga para @assistente", at: new Date(Date.now() - 3_600_000) },
    ]);
    await makeAdmin(person);
    await logIn(page, person);
    await page.goto(`/conversas/${sharedChannel.id}`);
    await readyHistory(page, sharedChannel.name);

    // 2. "Desconectar" abre a confirmação com o foco em Cancelar; Esc e Cancelar não mudam nada
    await agentsSection(page).getByRole("button", { name: "Gerenciar agentes" }).focus();
    await page.keyboard.press("Enter");
    const dialog = agentsDialog(page);
    await dialog.getByRole("button", { name: "Desconectar" }).focus();
    await page.keyboard.press("Enter");
    const confirm = page.getByRole("alertdialog", { name: CONFIRM });
    await expect(confirm).toContainText(
      "Ninguém mais vai conseguir mencionar @assistente nas conversas. As mensagens que ele já escreveu continuam lá, e você pode conectar de novo quando quiser.",
    );
    await expect(confirm.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(confirm).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Desconectar" })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(confirm).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Desconectar" })).toBeFocused();
    expect(await isConnected("assistente")).toBe(true);

    // 3. Confirmar mostra Enviando, fecha e mostra o Agente desconectado
    let releaseDisconnect!: () => void;
    const pendingDisconnect = new Promise<void>((resolve) => { releaseDisconnect = resolve; });
    await routeServerAction(page, async (route) => {
      await pendingDisconnect;
      await route.fallback();
    });
    await dialog.getByRole("button", { name: "Desconectar" }).focus();
    await page.keyboard.press("Enter");
    await confirm.getByRole("button", { name: "Desconectar" }).focus();
    await page.keyboard.press("Enter");
    try {
      await expect(confirm.getByRole("button", { name: "Cancelar" })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(confirm).toBeVisible();
    } finally {
      releaseDisconnect();
    }
    await expect(confirm).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Conectar" })).toBeFocused();
    expect(await isConnected("assistente")).toBe(false);

    // 4. Fora da barra lateral; a Mensagem antiga continua; a outra Pessoa não vê a linha ao recarregar
    await page.keyboard.press("Escape");
    await expect(agentsSection(page).getByRole("button", { name: "Assistente", exact: true })).toHaveCount(0);
    await expect(page.getByRole("main").getByText("Pergunta antiga para @assistente")).toBeVisible();
    await otherPage.reload();
    await expect(agentsSection(otherPage).getByRole("button", { name: /agentes/ })).toBeVisible();
    await expect(
      agentsSection(otherPage).getByRole("button", { name: "Assistente", exact: true }),
    ).toHaveCount(0);
  });

  test("a falha mantém o Agente conectado", async ({ page, person, makeAdmin, agentsLock }) => {
    void agentsLock;
    await setConnected("assistente", true);
    await makeAdmin(person);
    await logIn(page, person);
    await agentsSection(page).getByRole("button", { name: "Gerenciar agentes" }).click();
    const dialog = agentsDialog(page);
    await dialog.getByRole("button", { name: "Desconectar" }).click();

    await routeServerAction(page, (route) => route.fulfill({ status: 500, body: "" }));
    await page.getByRole("alertdialog", { name: CONFIRM }).getByRole("button", { name: "Desconectar" }).click();
    await expect(page.getByText("Não foi possível desconectar o agente")).toBeVisible();
    await expect(page.getByRole("alertdialog", { name: CONFIRM })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Desconectar" })).toBeVisible();
    expect(await isConnected("assistente")).toBe(true);
  });

  test("quem perdeu o papel recebe o erro", async ({ page, person, makeAdmin, agentsLock }) => {
    void agentsLock;
    await setConnected("assistente", true);
    await makeAdmin(person);
    await logIn(page, person);
    await agentsSection(page).getByRole("button", { name: "Gerenciar agentes" }).click();
    await agentsDialog(page).getByRole("button", { name: "Desconectar" }).click();
    await setAdminOf(person.id, false);

    await page.getByRole("alertdialog", { name: CONFIRM }).getByRole("button", { name: "Desconectar" }).click();
    await expect(page.getByText("Só administradores desconectam agentes")).toBeVisible();
    expect(await isConnected("assistente")).toBe(true);
  });
});
