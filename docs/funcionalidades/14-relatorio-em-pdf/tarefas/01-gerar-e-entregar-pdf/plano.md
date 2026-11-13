# Plano da F14-T01

Tarefa: [tarefa.md](tarefa.md) · Spec: [spec.md](../../spec.md)

Continuação autorizada por “executar”. Fundamentos da F13 verificados em PostgreSQL, HTTP, Socket.IO e uma consulta real antes da cota gratuita do Gemini esgotar. A regressão completa com modelo permanece pendente; não impede construir fila/Worker/PDF com dados fictícios. Sem merge nem atualização automática do piloto público.

## Contratos e ordem

1. API: módulo de Relatórios por Pedido, estado queued/ready/failed, uma Mensagem protegida atualizada no lugar e prazo próprio. Iniciar pelo bot confere Pedido e permissão. Credencial de Worker distinta permite validar elegibilidade e finalizar/falhar registros existentes, sem aceitar texto de resposta, SQL, chave de objeto ou delegação.
2. Metadados opcionais na Mensagem e no contrato compartilhado; projeção remove a referência para quem não tem acesso. Download autentica Pessoa, participação, estado e prazo antes de assinar. Nenhuma URL assinada em Mensagem, evento ou Notificação.
3. Ferramenta reutiliza consulta isolada, lastro e orçamento da F13. Plano mínimo na fila privada com serialização JSON e chave do job derivada do Pedido. Falha na fila encerra o relatório; expiração na API cobre interrupção entre registro e fila.
4. Worker Python separado, ARQ/Redis, sem importar/chamar modelo. Reconfere elegibilidade, reexecuta SQL read-only, verifica o rascunho, gera PDF ReportLab e grava S3 privado na chave estável `digitaly/<pedido>.pdf`. Mesma Mensagem/objeto em reentregas. Limites seguem a spec; limpeza só no prefixo próprio.
5. UI reusa componentes/tokens aprovados, mantém AgentText como texto e oferece ação tipada de download e estados fila/pronto/falha. Validar claro/escuro e teclado. PDF azul Digitaly, em português e marcado fictício; texto escapado e tabelas com quebra de linhas/páginas.

## Verificação

- CA1: Redis/S3 reais, entrega HTTP/navegador, extração e renderização do PDF de exemplo.
- CA2: reentrega, retentativas e erro final, com uma Mensagem/objeto; Worker funciona sem chave de IA.
- CA3: não Membro, falta/revogação de permissão, prazo vencido, S3 anônimo negado e assinatura vencida; replay protegido.
- CA4: fila persistente, expiração, limpeza restrita e guia. Verificações dos apps tocados. Testes reais dependentes da cota ficam pendentes, nunca substituídos por resposta simulada em produção.

Schema/rotas na API; metadados em `packages/chat-events`; fila/Worker/PDF/auditoria em agentes; ambiente no Compose e guia; HLD/LLD apontam para os donos. Plano congelado neste commit.
