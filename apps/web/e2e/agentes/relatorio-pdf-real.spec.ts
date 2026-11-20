// F14-T01: pedido pelo navegador, IA real, fila, Worker, armazenamento e download.
import { readFile } from "node:fs/promises";
import { test, expect, logIn } from "../fixtures";
import { insertBot, setDataAccessOf } from "../support/database";
import { isConnected, setConnected } from "../support/agents";
import { composer, messageList, readyHistory } from "../support/conversation-page";

test("gera e baixa PDF com IA e Worker reais sem expor a outra Pessoa", async ({
  page, person, otherPage, sharedChannel, agentsLock,
}, testInfo) => {
  void agentsLock;
  test.setTimeout(240_000);
  const wasConnected = await isConnected("assistente");
  await insertBot("Assistente", "assistente");
  await setConnected("assistente", true);
  await setDataAccessOf(person.id, true);
  try {
    await logIn(page, person);
    await page.goto(`/conversas/${sharedChannel.id}`);
    await otherPage.goto(`/conversas/${sharedChannel.id}`);
    await readyHistory(page, sharedChannel.name);
    await readyHistory(otherPage, sharedChannel.name);
    const box = composer(page, sharedChannel.name);
    await box.fill("@assistente gere um PDF do faturamento pago de novembro de 2026.");
    await box.press("Escape");
    await box.press("Enter");

    const downloadButton = page.getByRole("button", { name: "Baixar relatório PDF" });
    // Se o provedor recusar o Pedido, falhe assim que a resposta chegar, sem gastar
    // três minutos esperando um download que não será criado.
    const failure = messageList(page, sharedChannel.name).getByText("Não consegui atender o seu pedido agora. Tente de novo em instantes.", { exact: true });
    await expect(downloadButton.or(failure)).toBeVisible({ timeout: 180_000 });
    await expect(downloadButton).toBeEnabled();
    await expect(messageList(otherPage, sharedChannel.name).getByText("Conteúdo de negócio restrito. Solicite acesso ao administrador.", { exact: true })).toBeVisible();
    await expect(otherPage.getByRole("button", { name: "Baixar relatório PDF" })).toHaveCount(0);
    await page.reload();
    await expect(downloadButton).toBeEnabled();
    const pendingDownload = page.waitForEvent("download");
    await downloadButton.click();
    const download = await pendingDownload;
    expect(download.suggestedFilename()).toBe("relatorio.pdf");
    const path = await download.path();
    expect(path).not.toBeNull();
    const content = await readFile(path!);
    expect(content.subarray(0, 5).toString()).toBe("%PDF-");
    expect(content.length).toBeGreaterThan(1000);
    await testInfo.attach("PDF gerado com IA real", { body: content, contentType: "application/pdf" });
    await testInfo.attach("PDF pronto no portal", { body: await page.screenshot(), contentType: "image/png" });
  } finally {
    await setConnected("assistente", wasConnected);
  }
});
