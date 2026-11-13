import { DomainError } from '../common/errors/domain.error';

export class ReportNotFoundError extends DomainError {
  readonly code = 'report_not_found';
}
export class ReportNotReadyError extends DomainError {
  readonly code = 'report_not_ready';
}
export class ReportsUnavailableError extends DomainError {
  readonly code = 'reports_unavailable';
}
export class InvalidWorkerTokenError extends DomainError {
  readonly code = 'invalid_worker_token';
}
