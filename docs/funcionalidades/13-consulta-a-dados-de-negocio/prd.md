# F13 Consulta a dados de negócio

2026-11-13 · Escopo autorizado: executar as pendências do MVP da aula, com dados fictícios

## 1. Resumo executivo

**Problema:** a Pessoa precisa consultar números de vendas sem escrever SQL; o assistente ainda só resume e delega. **Solução:** responder à pergunta na própria Conversa, consultando uma base demonstrativa somente para leitura. **Critérios de sucesso:** os do brief, em Objetivos e métricas e Requisitos não funcionais: confidencialidade, lastro dos números, auditoria, custo e isolamento.

## 2. Experiência do usuário e funcionamento

Pessoa com permissão de dados pergunta ao Assistente sobre faturamento, pedidos, vendedores ou clientes. Recebe resposta em português com dados conferidos. Pessoa sem permissão não dispara consulta; membros sem essa permissão veem conteúdo bloqueado, inclusive em histórico, citação, notificação e reconexão. Quem opera concede e retira a permissão pelo comando de contas, separado do papel de Administrador. A base é identificada como fictícia.

Não são objetivos: dados corporativos, Microsoft 365, escrita no banco de negócio, novas fontes, gráficos ou tela de gestão de permissões.

## 3. Requisitos do sistema de IA

Usar o modelo real configurado. O planejador de dados recebe somente a pergunta do Pedido e o esquema permitido, nunca histórico, citações ou usuários do chat. Consulta é conferida pelo código e executada com papel do banco sem escrita e sem acesso aos bancos do chat/agentes. Cada número da resposta precisa aparecer no resultado. Consultas inválidas, sem lastro ou com falha geram recusa clara; não há resposta simulada. Avaliar com perguntas de referência e tentativas de injeção, incluindo contextos de Conversa maliciosos.

## 4. Riscos de produto

Vazamento por saídas secundárias: conferir a versão por destinatário em todos os caminhos. Números inventados: comparar com resultados antes de entregar. Consulta excessiva: limites e tempo no banco. Confundir a base fictícia com informação da empresa: identificação explícita na resposta e no material do piloto.
