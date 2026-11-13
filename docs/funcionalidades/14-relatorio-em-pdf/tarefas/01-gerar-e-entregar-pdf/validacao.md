# Validação da F14-T01

Ambiente isolado `digitaly-features`, sem alterar o piloto público.

- Worker real com Redis, PostgreSQL e S3: geração, lastro, leitura anônima negada, reentrega idempotente e três tentativas de rascunho inválido passaram. Limpeza e guardas de negócio foram exercitadas na suíte local; registros detalhados ficam nos logs ignorados em `.local`.
- Processo do Worker conferido sem importação do ADK e sem chave de IA.
- API: assinatura, vencimento, participação, revogação, separação da credencial, prazo e cancelamento exercitados. A suíte completa terminou com 511/512; o caso restante de cursor de reconexão passou ao repetir sua suíte (8/8). Não registrar a execução completa como totalmente aprovada.
- Navegador: 297 testes passaram, incluindo os dois temas e download pelo teclado. Capturas autorizadas foram inspecionadas. As capturas bloqueadas precisaram de espera após recarregar; essa correção e um ajuste de espaçamento aguardam nova captura.
- Web: 277 testes unitários passaram. Agentes: 112 unitários passaram.
- PDF de demonstração gerado, extraído e renderizado; uma página legível com dados fictícios e R$ 7.751,00.

Pendências para fechar a tarefa: concluir verificações da última revisão, refazer capturas bloqueadas e repetir a avaliação com IA quando houver cota. O teste real de consulta passou antes da cota diária gratuita esgotar; o fluxo completo de pedido de PDF pelo modelo não foi validado depois dessas alterações. Não houve merge, push ou atualização do domínio público.
