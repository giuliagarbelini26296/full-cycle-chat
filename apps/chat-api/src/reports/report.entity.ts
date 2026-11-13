import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../database/base.entity';
import { Message } from '../messages/message.entity';

export type ReportStatus = 'queued' | 'ready' | 'failed';

@Entity('reports')
@Check('reports_status_check', `status IN ('queued', 'ready', 'failed')`)
export class Report extends BaseEntity {
  // id é o Pedido; chave idempotente compartilhada com job e objeto.
  @Column({ type: 'uuid' })
  conversationId!: string;

  @Column({ type: 'uuid' })
  requesterId!: string;

  @Index('reports_message_key', { unique: true })
  @Column({ type: 'uuid' })
  messageId!: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message?: Message;

  @Column({ type: 'text' })
  status!: ReportStatus;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}
