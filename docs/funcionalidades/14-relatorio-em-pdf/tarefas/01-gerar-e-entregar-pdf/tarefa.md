# F14-T01 Gerar e entregar PDF

Status: a fazer

Dependência: fundamentos de autorização, consulta e entrega da F13-T01 implementados e verificados nesta branch. Não exige merge para desenvolver a continuação.

- CA1: pedido autorizado enfileira, avisa início, permite seguir conversando e entrega PDF legível com dados fictícios e lastro.
- CA2: Worker não chama o modelo, usa leitura restrita e credencial própria; tentativas não duplicam arquivo ou Mensagem; erro final é informado.
- CA3: participação e permissão atual são conferidas no download; quem não tem acesso não recebe conteúdo, metadados sensíveis ou URL; assinatura vence.
- CA4: armazenamento, fila, retomada e retenção têm instruções e testes; estado real da entrega e limites são registrados.
