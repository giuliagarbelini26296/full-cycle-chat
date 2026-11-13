import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Env } from '../config/env.schema';
import { InvalidWorkerTokenError } from './report-errors';

@Injectable()
export class WorkerTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}
  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get('CHAT_WORKER_TOKEN', { infer: true });
    const [scheme, token] = (
      context.switchToHttp().getRequest<Request>().headers.authorization ?? ''
    ).split(' ');
    const digest = (value: string) =>
      createHash('sha256').update(value).digest();
    if (
      !expected ||
      scheme?.toLowerCase() !== 'bearer' ||
      !token ||
      !timingSafeEqual(digest(token), digest(expected))
    )
      throw new InvalidWorkerTokenError();
    return true;
  }
}
