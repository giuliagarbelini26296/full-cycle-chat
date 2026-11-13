import { DomainError } from '../common/errors/domain.error';

export class DataAccessDeniedError extends DomainError {
  readonly code = 'data_access_denied' as const;
  constructor() {
    super('Acesso aos dados de negócio não autorizado.');
  }
}
