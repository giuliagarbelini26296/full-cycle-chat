# F14 Relatório em PDF

2026-11-13 · Escopo autorizado: executar as pendências do MVP da aula

## 1. Resumo executivo

**Problema:** a Pessoa precisa compartilhar um relatório sem bloquear o chat durante a geração. **Solução:** pedir PDF ao Assistente, receber o aviso de início e baixar o arquivo quando pronto. **Critérios de sucesso:** confidencialidade, lastro numérico, execução em segundo plano e limites de custo do brief.

## 2. Experiência do usuário e funcionamento

Pessoa com permissão solicita relatório, continua conversando e recebe arquivo na Conversa. Pessoa sem permissão vê a Mensagem bloqueada e não obtém link. Falha terminal é informada; tentativas não duplicam a entrega. O PDF identifica a base fictícia e a pergunta, com texto e tabela legíveis.

Fora de escopo: agenda recorrente, gráficos, envio por e-mail, dados reais e Microsoft 365.

## 3. Requisitos do sistema de IA

Reusar a consulta isolada da F13. O Serviço de agentes resolve consulta e rascunho; o Worker não chama o modelo. Antes de gerar, o Worker executa a consulta conferida e valida novamente cada número. Resultado alterado ou sem lastro não vira relatório.

## 4. Riscos de produto

Download indevido: verificar participação e permissão antes de assinar URL curta; bucket privado. Duplicidade: chave determinística e entrega única por Pedido. Processo interrompido: tentativas limitadas na fila. PDF inválido: extrair e inspecionar renderização nas verificações.
