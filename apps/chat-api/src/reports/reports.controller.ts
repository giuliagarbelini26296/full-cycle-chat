import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { BotTokenGuard } from '../bot/bot-token.guard';
import { AuthGuard } from '../sessions/auth.guard';
import { CurrentPerson } from '../sessions/current-person.decorator';
import { Person } from '../people/person.entity';
import { ReportsService } from './reports.service';
import { WorkerTokenGuard } from './worker-token.guard';

class CompletionDto {
  @IsIn(['ready', 'failed']) status!: 'ready' | 'failed';
}

@Controller('bot/requests/:requestId/report')
@UseGuards(BotTokenGuard)
export class ReportsBotController {
  constructor(private readonly reports: ReportsService) {}
  @Post() start(@Param('requestId') id: string) {
    return this.reports.start(id);
  }
  @Post('fail') fail(@Param('requestId') id: string) {
    return this.reports.finish(id, 'failed');
  }
}

@Controller('worker/reports')
@UseGuards(WorkerTokenGuard)
export class ReportsWorkerController {
  constructor(private readonly reports: ReportsService) {}
  @Get(':id') eligibility(@Param('id') id: string) {
    return this.reports.eligibility(id);
  }
  @Post(':id/complete') complete(
    @Param('id') id: string,
    @Body() body: CompletionDto,
  ) {
    return this.reports.finish(id, body.status);
  }
  @Post('expire') @HttpCode(204) expire() {
    return this.reports.expire();
  }
}

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get(':id/download') async download(
    @CurrentPerson() person: Person,
    @Param('id') id: string,
  ) {
    return { url: await this.reports.download(person.id, id) };
  }
}
