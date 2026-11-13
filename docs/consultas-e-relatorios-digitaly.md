# Consultas e relatórios do piloto Digitaly

Este ambiente usa exclusivamente vendas fictícias. Não conecta Teams/Outlook e não recebe dados corporativos enquanto a autorização estiver pendente. O projeto `digitaly-features` tem bancos, Redis e arquivos próprios; não altera os dados nem os processos do piloto público.

## Preparar o ambiente isolado

Execute os comandos a partir da raiz desta cópia de trabalho. As senhas nos endereços abaixo são fixas de desenvolvimento.

```sh
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml --profile reports --profile e2e up -d --build --wait
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec chat-api pnpm migration:run
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec agents uv run alembic upgrade head
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec -e BUSINESS_SEED_DATABASE_URL=postgresql://business:business@postgres:5432/business agents uv run python scripts/seed_business_demo.py
```

Espere as instalações terminarem nos logs antes de rodar os servidores. Os comandos de criação de Pessoas, Canal e bot estão no `AGENTS.md` da API. Liberar dados exige uma ação própria, independente do papel de administrador:

```sh
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec chat-api pnpm accounts set-data-access <e-mail> on
```

Use `off` para revogar. A operação encerra as Sessões e exige novo login. Quem não tem acesso recebe a versão bloqueada também em histórico, citações, Atividade e reconexão. O BFF nunca encaminha uma citação marcada como negócio ao modelo principal.

Os contêineres de desenvolvimento ficam parados após instalar dependências; iniciar cada servidor em um terminal:

```sh
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec chat-api pnpm start:dev
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec web pnpm dev --hostname 0.0.0.0
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec agents uv run python /home/app/repo/scripts/iniciar-agentes-piloto.py
```

O Worker inicia pelo profile `reports`, sem chave de IA ou importação do ADK. Este Compose não publica portas. O navegador de validação roda no serviço `e2e`, que encaminha seus próprios endereços locais.

## Experimentar quando houver cota de IA

Mencione o Assistente conectado no Canal:

- `@assistente qual foi o faturamento pago de novembro de 2026?` — referência da carga fictícia: R$ 7.751,00.
- `@assistente quantos clientes ativos temos?` — referência: 3.
- `@assistente gere um PDF do faturamento pago de novembro de 2026.`

A chave continua no arquivo local `apps/agents/.env`, ignorado pelo Git; nunca deve ser colocada na Mensagem. Esgotada a cota do provedor, os testes reais e os pedidos novos dependem de ela voltar a ficar disponível. O sistema não substitui a IA por uma resposta simulada.

No PDF, o resumo numérico é conferido antes de enfileirar e novamente contra o resultado atual no Worker. Se a base mudou e o rascunho perdeu lastro, a geração tenta de novo e termina com falha ao esgotar o limite. O texto do pedido e a paginação aparecem como metadados, não como afirmações de negócio.

## Recuperação, arquivos e limites

As decisões e os valores pertencem à [spec da F14](funcionalidades/14-relatorio-em-pdf/spec.md); os schemas de configuração estão em `app/config.py`, `app/reports/config.py` e `src/config/env.schema.ts` nos respectivos apps.

O Redis recebe somente um identificador de job, em JSON. SQL, pergunta e rascunho ficam na base privada dos agentes; os resultados SQL não são persistidos. A fila tem nome próprio e volume persistente. Recriar o Worker preserva o job; a mesma chave de objeto e a mesma Mensagem evitam duplicações. `housekeeping` verifica expiração e limpeza a cada minuto, inclusive na subida. Caso a API esteja fora, o próximo ciclo repete a rotina.

O prazo da geração é conferido na API. Uma interrupção entre registrar o relatório e enfileirar não deixa uma Mensagem eternamente na fila: a rotina de expiração a encerra quando o Worker/API estiverem disponíveis. O estado final atualiza a Mensagem original do relatório.

Arquivos e rascunhos expiram pelo período de retenção; a limpeza só remove objetos do prefixo `digitaly/` com nome de UUID e extensão PDF. A auditoria de consultas e tentativas permanece separada; a política de retenção corporativa dela continua pendente. Reiniciar não exige apagar volumes.

O download pede uma nova assinatura à API e reconfere participação e permissão. Um link já emitido funciona até vencer sua validade curta, inclusive se o acesso for revogado nesse intervalo. A URL assinada não é gravada no chat ou no Redis. O S3 recusa leitura e listagem anônimas.

Para usar o PDF no domínio público, será necessário configurar o endpoint público de assinatura e encaminhar o caminho do bucket sem reescrever caminho/Host, conforme a spec. Essa alteração não foi aplicada ao piloto ativo. Credenciais e dados do ambiente isolado não devem ser reaproveitados como credenciais corporativas.

## Conferir sem gastar cota de IA

```sh
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec agents uv run pytest tests/unit
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec agents uv run pytest tests/integration/test_report_worker.py tests/integration/test_business.py -k 'not modelo'
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec chat-api pnpm test:e2e --runInBand reports business-data
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec e2e npm run test:e2e -- --project=chromium agentes/relatorio-pdf.spec.ts
```

Não rode duas suítes da API simultaneamente: ambas recriam `chat_test`. Também não rode dois Playwrights no mesmo diretório de resultados. A suíte real do agente e o projeto `modelo-real` do navegador precisam da cota disponível.

O exemplo exportável é criado pelo comando abaixo, usando uma referência fictícia conferida contra o banco. Ele serve como artefato/fixture de validação, não como resposta de IA em produção:

```sh
docker compose -p digitaly-features -f compose.yaml -f compose.mac.yaml -f compose.features.yaml exec agents uv run python scripts/generate_demo_report.py
```

Resultado em `output/pdf/relatorio-digitaly-demonstracao.pdf`. Para testar a rotina de Operações e Delivery, veja [o roteiro fictício](piloto-operacoes-delivery.md).
