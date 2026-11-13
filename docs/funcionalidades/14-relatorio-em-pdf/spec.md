# Spec da F14

Reusar a autorização, consulta isolada, auditoria e lastro da F13. Serviço de agentes prepara SQL conferido e rascunho a partir de uma leitura prévia, enfileira job ARQ/Redis e publica início. Worker separado, no mesmo projeto Python, reexecuta SQL read-only, confere o rascunho contra o resultado atual, gera PDF com ReportLab e grava objeto privado S3. Worker não tem modelo nem ferramentas do chat; recebe somente plano conferido e contexto mínimo de entrega.

API mantém referência e estado do relatório; credencial própria de Worker permite somente finalizar/falhar relatórios, nunca responder livremente ou delegar. Chave do objeto deriva do Pedido; repetição da conclusão entrega uma vez. Estados: queued, ready, failed. Três tentativas, prazo de job de 120 s, validade do Pedido demorado de 30 min e de URL assinada de 60 s, configuráveis. Retenção inicial de objeto de 24 h, com rotina de expiração documentada.

GET autenticado para obter download verifica participação, permissão atual e estado; não entrega chave ou URL para quem não tem acesso. Web recebe link interno para solicitar URL na hora; URL assinada não fica na Mensagem, no Redis ou na notificação. API e Worker usam S3 pela rede privada; a assinatura usa endpoint alcançável pelo navegador. No piloto de host único, apenas o caminho do bucket privado de relatórios será encaminhado sem reescrever caminho/Host; acesso sem assinatura deve falhar. A ativação dessa atualização no piloto só ocorre após a validação completa e revisão concreta.

O rascunho pode ficar sem lastro se a base mudar entre a preparação e a execução. Nesse caso o Worker não inventa atualização: tenta novamente até o limite e registra falha. Auditoria acompanha cada execução sem resultados. Conta sem permissão não enfileira. Exemplos, banco e PDF são fictícios e identificados.

Testes: job real em Redis, storage compatível S3, redelivery idempotente, falha/retentativa, bloqueio de download, URL vencida, PDF extraído/renderizado e fluxo pelo navegador com duas Pessoas. Nenhum teste usa dados Microsoft.
