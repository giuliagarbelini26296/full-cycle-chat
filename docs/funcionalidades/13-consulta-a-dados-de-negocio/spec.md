# Spec da F13

## Problema e solução

Implementar a consulta prevista no brief e no HLD 6.4, preservando as ADRs 0012, 0013, 0014, 0015 e 0020. Nenhuma alteração em resumos e delegações existentes além de acrescentar a capacidade de dados.

## Histórias

1. Pessoa autorizada pergunta sobre vendas e recebe resposta conferida na Conversa.
2. Pessoa sem permissão recebe recusa sem executar SQL.
3. Membro não autorizado vê a Mensagem bloqueada em qualquer saída e após reconectar.
4. Operador concede ou revoga permissão sem confundi-la com administração.
5. Operador inspeciona a auditoria sem guardar resultados das consultas nos logs.

## Decisões de implementação

- `has_data_access`, booleano falso por padrão nas Pessoas. Sessão lê a permissão atual. Comando de contas específico para conceder/revogar. Administrador não implica acesso a dados.
- Mensagem de negócio marcada explicitamente, sem novas categorias de autor. Uma projeção por destinatário retira corpo, prévias, menções, respostas prontas, citações de conteúdo de negócio e anexos de quem não tem permissão. O padrão da projeção é negar. REST, WebSocket, replay e Atividade usam a mesma regra; a reconexão reaplica a permissão atual sobre eventos já guardados. Revogação invalida o cache do cliente antes de novas entregas.
- O BFF envia a permissão autenticada no Pedido, conforme ADR 0015. A ferramenta de dados lê a pergunta original do estado do Pedido; não aceita a pergunta reescrita pelo agente principal. Contexto de citação e histórico não é encaminhado ao planejador.
- Duas chamadas isoladas ao modelo: produzir SQL estruturado a partir da pergunta/esquema e redigir a resposta usando o resultado. Sem ferramentas de chat ou acesso a outros bancos. Ferramenta publica a resposta protegida e encerra sem resumo adicional do agente principal. O orçamento de quatro chamadas do Pedido é compartilhado com essas chamadas; o teto de tokens existente permanece.
- SQLGlot, dialeto PostgreSQL: uma consulta SELECT, relações permitidas e funções de uma lista explícita; recusar escrita, múltiplas instruções, catálogos, arquivos e funções não aprovadas. Defesa adicional no banco: papel `business_readonly`, transação read-only, sem CONNECT aos bancos do chat/agentes, sem CREATE/TEMP.
- Base demonstrativa idempotente de vendas: clientes, vendedores e pedidos, com valores monetários decimais. Não importar planilhas ou documentos da empresa. A carga usa o dono da base; o agente não tem essa credencial.
- Limites iniciais configuráveis: consulta de 3 s, 100 linhas entregues, pergunta até o limite original da Mensagem, saída dentro do teto da Mensagem. Truncamento é explícito; sem interpolar SQL fornecido fora do parser.
- Conferência numérica com Decimal, formatos brasileiros e datas, usando os valores retornados. Percentuais derivados precisam vir da consulta, conforme ADR 0014. Se falhar, não entregar o rascunho.
- Se houver orçamento restante, uma redação sem lastro pode ser refeita uma vez em sessão isolada somente com as células, sem a pergunta. A nova redação passa pela mesma conferência; não há interpolação ou correção determinística de números. Todas as chamadas continuam dentro do teto global.
- Auditoria no Banco dos agentes: Pedido, Pessoa, Conversa, pergunta, SQL conferido, desfecho e tempos; nenhum resultado nem histórico. Uma falha ao registrar auditoria impede execução da consulta. Os logs operacionais não repetem pergunta, SQL ou resultado.

## Decisões de teste

HTTP e banco real para permissões e projeções; Socket.IO com duas Pessoas para entrega e replay; testes de parser/lastro para entradas adversariais; integração com papel PostgreSQL real para negar escrita e outros bancos; caso real pelo modelo para consulta demonstrativa. Reaproveitar testes de Mensagens, Citações, Atividade e bot; nenhuma proteção depende só da UI.

## Fora de escopo

PDF é F14. Microsoft e dados reais dependem da autorização corporativa. Tela de permissões e mudanças no contrato das Tarefas não entram.
