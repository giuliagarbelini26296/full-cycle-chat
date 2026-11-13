import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReports1794510000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE messages ADD report jsonb NULL');
    await runner.query('ALTER TABLE messages ADD CONSTRAINT messages_report_protected_check CHECK (report IS NULL OR business_data)');
    await runner.query(`CREATE TABLE reports (
      id uuid PRIMARY KEY REFERENCES agent_requests(id) ON DELETE CASCADE,
      conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      requester_id uuid NOT NULL REFERENCES people(id),
      message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      status text NOT NULL CONSTRAINT reports_status_check CHECK (status IN ('queued','ready','failed')),
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`);
    await runner.query('CREATE UNIQUE INDEX reports_message_key ON reports (message_id)');
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE reports');
    await runner.query('ALTER TABLE messages DROP CONSTRAINT messages_report_protected_check');
    await runner.query('ALTER TABLE messages DROP COLUMN report');
  }
}
