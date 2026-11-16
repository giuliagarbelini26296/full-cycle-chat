# Validação da F13-T01

Ambiente isolado `digitaly-features`, sem portas publicadas e sem modificar o piloto ativo.

- API: revisão de 15/11/2026 com 512 testes e2e, 85 unitários e 73 de integração aprovados; lint, TypeScript e build passaram. O caso anteriormente intermitente do cursor passou na execução completa.
- Serviço de agentes: parser/lastro passaram, inclusive escrita, CTE com escrita, funções de arquivo, catálogos, múltiplas instruções e números sem resultado. Papel real PostgreSQL recusou escrita, CREATE/TEMP e conexão aos bancos do chat/agentes.
- Modelo real: uma execução completa passou com faturamento de novembro da base fictícia, resposta marcada e orçamento global respeitado. A citação maliciosa não desviou a consulta. Há conferência de lastro e possibilidade de nova redação dentro do mesmo teto, sem preenchimento de números por código.
- Revisão de 15/11/2026 do Serviço de agentes: lint e 112 testes unitários passaram. Integração completa com credencial: 58 passaram e 7 falharam com HTTP 429 `RESOURCE_EXHAUSTED` (limite gratuito por minuto e depois por dia). O caso real de consulta de negócio passou nessa execução e também isoladamente. Não considerar a suíte completa aprovada.
- Proteções sem modelo: os 7 casos de consulta real, permissões, auditoria, fila, lastro e limpeza passaram (6 juntos; o caso de recusa sem permissão foi conferido separadamente porque seu nome contém `modelo`).
- Web: lint, TypeScript, build e 277 testes unitários passaram. A regressão do navegador não está aprovada: a revisão detectou falhas de sincronização/seletores e duas instabilidades em fluxos existentes, detalhadas na validação da F14-T01. Os casos corrigidos de PDF/citação passaram 15/15 em três repetições; os sete casos de Canais públicos passaram separadamente.

Limites: a conferência de numerais não prova a interpretação semântica da pergunta. A avaliação completa do agente e os testes reais pendentes precisam da cota disponível. Retenção da auditoria para operação corporativa permanece pendente. Integrações Microsoft não foram implementadas nem usadas.
