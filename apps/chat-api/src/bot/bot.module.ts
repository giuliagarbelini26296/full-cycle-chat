import { Module } from '@nestjs/common';
import { AgentRequestsModule } from '../agent-requests/agent-requests.module';
import { BotsModule } from '../bots/bots.module';
import { MessagesModule } from '../messages/messages.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { BotActionsService } from './bot-actions.service';
import { BotController } from './bot.controller';
import { BotTokenGuard } from './bot-token.guard';
import { PeopleModule } from '../people/people.module';

@Module({
  imports: [
    AgentRequestsModule,
    BotsModule,
    MessagesModule,
    RealtimeModule,
    TasksModule,
    NotificationsModule,
    PeopleModule,
  ],
  controllers: [BotController],
  providers: [BotActionsService, BotTokenGuard],
})
export class BotModule {}
