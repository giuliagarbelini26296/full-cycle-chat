# Validação da F13-T01

Ambiente isolado `digitaly-features`, sem portas publicadas e sem modificar o piloto ativo.

- API: 508 testes e2e, 85 unitários e 73 de integração passaram; TypeScript e build passaram.
- Serviço de agentes: parser/lastro passaram, inclusive escrita, CTE com escrita, funções de arquivo, catálogos, múltiplas instruções e números sem resultado. Papel real PostgreSQL recusou escrita, CREATE/TEMP e conexão aos bancos do chat/agentes.
- Modelo real: uma execução completa passou com faturamento de novembro da base fictícia, resposta marcada e orçamento global respeitado. A citação maliciosa não desviou a consulta. Há conferência de lastro e possibilidade de nova redação dentro do mesmo teto, sem preenchimento de números por código.
- Regressão completa de agentes: interrompida ao identificar HTTP 429 `RESOURCE_EXHAUSTED`, cota diária gratuita do Gemini. Uma pergunta de Recorte passou isoladamente; nova execução após a recusa confirmou a cota. Não considerar a suíte completa aprovada.
- Build web, TypeScript e 276 testes unitários passaram. Validação de navegador segue em execução.

Limites: a conferência de numerais não prova a interpretação semântica da pergunta. A avaliação completa do agente e os testes reais pendentes precisam da cota disponível. Retenção da auditoria para operação corporativa permanece pendente. Integrações Microsoft não foram implementadas nem usadas.
