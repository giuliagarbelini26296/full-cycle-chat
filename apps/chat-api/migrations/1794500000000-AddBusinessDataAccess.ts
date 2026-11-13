import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessDataAccess1794500000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE people ADD has_data_access boolean NOT NULL DEFAULT false');
    await runner.query('ALTER TABLE messages ADD business_data boolean NOT NULL DEFAULT false');
    await runner.query('ALTER TABLE messages ADD CONSTRAINT messages_business_bot_check CHECK (NOT business_data OR author_bot_id IS NOT NULL)');
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE messages DROP CONSTRAINT messages_business_bot_check');
    await runner.query('ALTER TABLE messages DROP COLUMN business_data');
    await runner.query('ALTER TABLE people DROP COLUMN has_data_access');
  }
}
