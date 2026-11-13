import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentRequestsModule } from '../agent-requests/agent-requests.module';
import { PeopleModule } from '../people/people.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SessionsModule } from '../sessions/sessions.module';
import { BotTokenGuard } from '../bot/bot-token.guard';
import { Report } from './report.entity';
import { ReportsService } from './reports.service';
import { ReportsStorage } from './reports.storage';
import { WorkerTokenGuard } from './worker-token.guard';
import {
  ReportsBotController,
  ReportsController,
  ReportsWorkerController,
} from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report]),
    AgentRequestsModule,
    PeopleModule,
    ConversationsModule,
    MessagesModule,
    RealtimeModule,
    SessionsModule,
  ],
  controllers: [
    ReportsBotController,
    ReportsController,
    ReportsWorkerController,
  ],
  providers: [ReportsService, ReportsStorage, WorkerTokenGuard, BotTokenGuard],
})
export class ReportsModule {}
