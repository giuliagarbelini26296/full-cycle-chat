# Correção do cancelamento — 16/11/2026

Executada no ambiente isolado `digitaly-features`, sem acessar o modelo ou alterar o piloto público.

## Comportamento

Esc ou Cancelar fecham somente a confirmação. A janela Agentes permanece aberta, o foco retorna ao botão Desconectar que abriu a confirmação e o Agente continua conectado. Depois de confirmar a desconexão, o foco continua voltando para Conectar. Enquanto a operação está sendo enviada, Esc não fecha a confirmação.

## Correção

O estado da confirmação passou para o componente que controla a janela Agentes. Enquanto a confirmação está aberta, a janela por baixo não aceita a mesma tecla Esc ou uma interação externa como pedido para fechar. A confirmação trata Esc pelo evento de teclado do próprio conteúdo, inclusive antes de registrar o listener global da camada. Como a confirmação controlada não usa um Trigger do Radix, o botão que a abriu é guardado para restaurar o foco explicitamente ao cancelar.

Os tokens, textos, dimensões e cores foram preservados. A única mudança visual durante a confirmação é o botão de fechar da janela por baixo ficar desabilitado; a confirmação continua sendo a janela ativa.

## Verificação

- O teste novo, com cancelamentos sucessivos, reproduziu o fechamento indevido antes da correção completa.
- Quatro cenários de desconexão repetidos cinco vezes: **20 aprovados**, incluindo **60 cancelamentos** (Esc e Cancelar, temas claro e escuro), sucesso, erro de envio e perda de permissão administrativa.
- O cenário de envio usa uma barreira controlada para conferir que Esc não interrompe a operação, sem depender de uma espera fixa.
- Diálogos de apagar Mensagem e acessibilidade: **8 aprovados**.
- Lint, TypeScript, **277 testes unitários** e compilação para produção aprovados.
- Capturas finais dos dois temas registradas e conferidas separadamente.

[Retorno do foco no tema claro](capturas/cancelamento-foco-claro.png) · [Retorno do foco no tema escuro](capturas/cancelamento-foco-escuro.png).

Logs locais ignorados: `.local/disconnect-final.log`, `.local/disconnect-visual.log`, `.local/disconnect-web-checks.log` e `.local/disconnect-last-checks.log`.

Esta correção não comprova a resolução do contador de notificações de Tarefas nem do teste completo de PDF com IA, que são pendências distintas.
