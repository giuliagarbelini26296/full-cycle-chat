import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { LessThan, Repository } from 'typeorm';
import { AgentRequestsService } from '../agent-requests/agent-requests.service';
import { RequestClosedError } from '../agent-requests/request-closed.error';
import { PeopleService } from '../people/people.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService, MessageView } from '../messages/messages.service';
import { RealtimePublisher } from '../realtime/realtime.publisher';
import { DataAccessDeniedError } from '../bot/data-access-denied.error';
import { Env } from '../config/env.schema';
import { Report } from './report.entity';
import { ReportNotFoundError, ReportNotReadyError } from './report-errors';
import { ReportsStorage } from './reports.storage';

const reference = (report: Report) => ({
  id: report.id,
  status: report.status,
});

@Injectable()
export class ReportsService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly requests: AgentRequestsService,
    private readonly people: PeopleService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly publisher: RealtimePublisher,
    private readonly storage: ReportsStorage,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get reports(): Repository<Report> {
    return this.txHost.tx.getRepository(Report);
  }

  async start(requestId: string) {
    const { report, message } = await this.create(requestId);
    if (message) {
      this.messages.publishBotMessage(message);
      this.publisher.botTyping(
        'typing.stop',
        message.conversationId,
        message.author,
      );
    }
    return reference(report);
  }

  @Transactional()
  private async create(
    requestId: string,
  ): Promise<{ report: Report; message: MessageView | null }> {
    const request = await this.requests.lockForAction(requestId);
    await this.assertAccess(request.requesterId, request.conversationId);
    const existing = await this.reports.findOneBy({ id: requestId });
    if (existing) return { report: existing, message: null };
    if (await this.requests.hasAnswer(requestId))
      throw new RequestClosedError();
    const expiresAt = new Date(
      Date.now() +
        this.config.get('REPORT_REQUEST_TTL_SECONDS', { infer: true }) * 1000,
    );
    await this.requests.extendForReport(requestId, expiresAt);
    const message = await this.messages.insertBotMessage(
      request.botId,
      request.conversationId,
      'Seu relatório com dados fictícios está na fila.',
      null,
      true,
      { id: requestId, status: 'queued' },
    );
    const report = await this.reports.save(
      this.reports.create({
        id: requestId,
        conversationId: request.conversationId,
        requesterId: request.requesterId,
        messageId: message.id,
        status: 'queued',
        expiresAt,
      }),
    );
    await this.requests.recordAction(requestId, 'reply', message.id);
    return { report, message };
  }

  async eligibility(id: string) {
    const report = await this.find(id);
    if (report.status === 'queued') {
      if (
        report.expiresAt.getTime() <= Date.now() ||
        !(await this.requests.isOpenForReport(report.id))
      )
        throw new ReportNotReadyError();
      await this.assertAccess(report.requesterId, report.conversationId);
    }
    return reference(report);
  }

  async finish(id: string, status: 'ready' | 'failed') {
    const changed = await this.update(id, status);
    if (changed.message)
      this.messages.publishBotMessageUpdated(changed.message);
    return reference(changed.report);
  }

  @Transactional()
  private async update(id: string, status: 'ready' | 'failed') {
    await this.find(id);
    const report = await this.reports.findOneOrFail({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (report.status !== 'queued') return { report, message: null };
    if (
      report.expiresAt.getTime() <= Date.now() ||
      !(await this.requests.isOpenForReport(report.id))
    )
      status = 'failed';
    if (status === 'ready') {
      try {
        await this.assertAccess(report.requesterId, report.conversationId);
      } catch {
        status = 'failed';
      }
    }
    if (status === 'ready') await this.storage.assertReady(id);
    report.status = status;
    await this.reports.save(report);
    const message = await this.messages.updateReportMessage(
      report.messageId,
      status,
    );
    return { report, message };
  }

  async expire(): Promise<void> {
    const expired = await this.reports.find({
      where: { status: 'queued', expiresAt: LessThan(new Date()) },
      take: 100,
    });
    for (const report of expired) await this.finish(report.id, 'failed');
  }

  async download(personId: string, id: string): Promise<string> {
    const report = await this.find(id);
    await this.assertAccess(personId, report.conversationId);
    if (
      report.status !== 'ready' ||
      Date.now() >=
        report.createdAt.getTime() +
          this.config.get('REPORT_RETENTION_SECONDS', { infer: true }) * 1000
    )
      throw new ReportNotReadyError();
    await this.storage.assertReady(id);
    return this.storage.signedDownload(id);
  }

  private async assertAccess(
    personId: string,
    conversationId: string,
  ): Promise<void> {
    await this.conversations.getForMember(personId, conversationId);
    if (!(await this.people.findById(personId))?.hasDataAccess)
      throw new DataAccessDeniedError();
  }

  private async find(id: string): Promise<Report> {
    const report = isUUID(id) ? await this.reports.findOneBy({ id }) : null;
    if (!report) throw new ReportNotFoundError();
    return report;
  }
}
