// spec: F14-T01, fila/pronto e download protegido; F13-T01, projeção bloqueada.
import { test, expect, logIn } from '../fixtures';
import { insertBot, setDataAccessOf, setThemeOf } from '../support/database';
import { requestByApi } from '../support/bot';
import { messageList, readyHistory } from '../support/conversation-page';
import { readyReport, removeReportFile, startReport } from '../support/reports';

for (const theme of ['light','dark'] as const) {
  test(`relatório PDF com acesso por Pessoa no tema ${theme}`,async ({page,person,otherPage,otherPerson,sharedChannel},testInfo)=>{
    test.setTimeout(90000);
    await setDataAccessOf(person.id,true);
    await setThemeOf(person.id,theme);
    await setThemeOf(otherPerson.id,theme);
    await insertBot('Assistente','assistente');
    await logIn(page,person);
    await page.goto(`/conversas/${sharedChannel.id}`);
    await otherPage.goto(`/conversas/${sharedChannel.id}`);
    await readyHistory(page,sharedChannel.name);
    await readyHistory(otherPage,sharedChannel.name);
    const blocked = messageList(otherPage,sharedChannel.name).getByText('Conteúdo de negócio restrito. Solicite acesso ao administrador.',{exact:true});
    const id = await requestByApi(page,sharedChannel.id,'assistente','@assistente gere um PDF do faturamento pago de novembro de 2026.');
    try {
      await startReport(id);
      await expect(page.getByRole('button',{name:'PDF na fila'})).toBeDisabled();
      await expect(blocked).toBeVisible();
      await expect(otherPage.getByRole('button',{name:'PDF na fila'})).toHaveCount(0);
      await readyReport(id);
      const button = page.getByRole('button',{name:'Baixar relatório PDF'});
      await expect(button).toBeEnabled();
      await expect(otherPage.getByRole('button',{name:'Baixar relatório PDF'})).toHaveCount(0);
      await page.reload();
      await expect(button).toBeEnabled();
      const download = page.waitForEvent('download');
      await button.focus();
      await page.keyboard.press('Enter');
      expect((await download).suggestedFilename()).toBe('relatorio-digitaly.pdf');
      await testInfo.attach(`Relatório autorizado ${theme}`,{body:await page.screenshot(),contentType:'image/png'});
      await otherPage.reload();
      await readyHistory(otherPage,sharedChannel.name);
      await expect(blocked).toBeVisible();
      await testInfo.attach(`Relatório protegido ${theme}`,{body:await otherPage.screenshot(),contentType:'image/png'});
    } finally {await removeReportFile(id);}
  });
}
