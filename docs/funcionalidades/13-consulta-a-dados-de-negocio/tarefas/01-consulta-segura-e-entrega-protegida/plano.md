# Plano da F13-T01

Tarefa: [tarefa.md](tarefa.md) · Spec: [spec.md](../../spec.md) · PRD: [prd.md](../../prd.md)

O comando “executar” autoriza implementar a proposta anterior usando a arquitetura já decidida e dados fictícios. Valores e bibliotecas abaixo concretizam essa entrega e não autorizam dados corporativos nem merge. A implementação ocorre em cópia de trabalho separada do piloto ativo.

## Critérios e pontos de verificação

- CA1 — integração: executar perguntas de referência sobre vendas fictícias com modelo real; comparar números e conferência do papel read-only em PostgreSQL. Primeiro provar as recusas com testes adversariais.
- CA2 — e2e HTTP/Socket.IO: dois Membros com permissões diferentes; resposta de negócio, histórico, citação, Atividade e replay. Revogar e repetir as leituras. Nenhum texto sensível pode sair para o Membro sem acesso.
- CA3 — unidade/integração: SELECT permitido, escrita/CTE com escrita, instruções múltiplas, funções de arquivo, catálogos e SQL inválido recusados; planner recebe pergunta original sem histórico/citação; rascunho com número inventado não é entregue.
- CA4 — integração: auditoria de permitido/negado/erro, limites do banco e orçamento compartilhado de chamadas. Nenhum resultado em logs e falha de auditoria fecha a execução.
- CA5 — Playwright e verificações completas dos apps tocados, com dados isolados; captura claro/escuro dos estados protegido e autorizado.

## Contrato

Expandir Pessoa e identidade de sessão com `has_data_access` falso por padrão. Expandir Mensagem/eventos com marca de negócio e estado bloqueado, mantendo compatibilidade de Mensagens comuns. Ação de resposta do bot aceita marca de negócio validada; o BFF inclui permissão atual no Pedido. A forma exata é implementada nos donos do contrato, não em snapshots manuais. Novas tabelas: auditoria no Banco dos agentes; carga de demonstração no Banco de negócio. Não há nova rota pública de escrita de dados.

## Decisões e arquivos

- Projeção única por destinatário em Mensagens, incluindo conteúdo citado e prévias; replay reconfere permissão. Código de autorização fica na API.
- Ferramenta própria de consulta e planejador isolado no Serviço de agentes. SQLGlot e asyncpg; Decimal para lastro. Nenhum MCP como ferramenta do agente, conforme ADR 0012.
- Seed no projeto dos agentes, migração de permissão/marca na API e auditoria Alembic nos agentes. Parser e dados de teste ficam com seus respectivos apps.
- Inicialmente 3 s e 100 linhas, configuráveis e testados. Quatro chamadas totais ao modelo por Pedido, somando o planejador e a redação.
- Conferir documentação ADK pelo MCP `adk-docs` configurado; usar adaptador de protocolo para esse mesmo servidor quando não exposto como ferramenta da sessão. Não consultar ADK por outra fonte.

## Ordem

1. Permissão, marca e projeção protegida pelos pontos HTTP/tempo real existentes.
2. Base fictícia, papel read-only, parser, lastro e auditoria.
3. Integrar a ferramenta ao agente e o BFF ao contexto autenticado; testar o modelo real.
4. Completar apresentação, avaliação e regressões; registrar limites antes de atualizar o piloto.

## Documentos atualizados

PRD/spec e roadmap da F13. LLD passa a apontar para a spec dos contratos/limites novos; o HLD mantém as ADRs e recebe a localização da auditoria e o isolamento já exigido. Planos anteriores não mudam.
