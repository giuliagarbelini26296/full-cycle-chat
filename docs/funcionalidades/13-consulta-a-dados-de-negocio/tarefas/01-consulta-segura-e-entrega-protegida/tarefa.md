# F13-T01 Consulta segura e entrega protegida

Status: em andamento · Autorização: “executar”, após a proposta de concluir consulta e PDF da aula

- CA1: consulta real à base fictícia responde em português com números conferidos e sem escrita.
- CA2: sem permissão não executa consulta; dados não aparecem em corpo, citação, Atividade, tempo real ou replay de Pessoa sem permissão, incluindo após revogação.
- CA3: conteúdo da Conversa e citação não entra no planejador SQL; consulta maliciosa, múltiplas instruções e números sem lastro são recusados.
- CA4: auditoria registra tentativa e desfecho sem guardar resultado ou histórico nos logs; orçamento do modelo e limites da consulta são aplicados.
- CA5: resumos e delegações preservados, componentes consistentes com o design system e testes de regressão aprovados.
