import type {
  MessageAuthorPayload,
  QuickRepliesPayload,
  QuotePayload,
  ReportPayload,
} from 'chat-events';
import { MessageView } from './messages.service';

export interface MessageResponse {
  id: string;
  conversation_id: string;
  client_id: string;
  author: MessageAuthorPayload;
  body: string;
  business_data?: boolean;
  restricted?: boolean;
  report?: ReportPayload | null;
  created_at: string;
  edited_at: string | null;
  mentions: { id: string; username: string }[];
  quote: QuotePayload | null;
  quick_replies: QuickRepliesPayload | null;
}

export function toMessageResponse(
  message: MessageView,
  hasDataAccess = false,
): MessageResponse {
  const { quickReplies } = message;
  return protectMessage(
    {
      id: message.id,
      conversation_id: message.conversationId,
      client_id: message.clientId,
      author: message.author,
      body: message.body,
      ...(message.businessData ? { business_data: true } : {}),
      ...(message.report ? { report: message.report } : {}),
      created_at: message.createdAt.toISOString(),
      edited_at: message.editedAt?.toISOString() ?? null,
      mentions: message.mentions,
      quote: message.quote,
      quick_replies: quickReplies && {
        options: quickReplies.options,
        owner_id: quickReplies.ownerId,
        expires_at: quickReplies.expiresAt.toISOString(),
        closed: quickReplies.closed,
      },
    },
    hasDataAccess,
  );
}

export const RESTRICTED_BODY =
  'Conteúdo de negócio restrito. Solicite acesso ao administrador.';

// A mesma projeção serve REST, citações e eventos antigos do Redis. Nunca perde a marca.
export function protectMessage<
  T extends {
    body: string;
    business_data?: boolean;
    restricted?: boolean;
    report?: unknown;
    quote?: QuotePayload | null;
    mentions?: unknown[];
    quick_replies?: QuickRepliesPayload | null;
  },
>(message: T, hasDataAccess: boolean): T {
  const quote = message.quote;
  const safeQuote =
    quote && !quote.deleted && quote.business_data && !hasDataAccess
      ? { ...quote, body: RESTRICTED_BODY, restricted: true }
      : quote;
  return {
    ...message,
    ...(message.business_data && !hasDataAccess
      ? {
          body: RESTRICTED_BODY,
          restricted: true,
          mentions: [],
          quick_replies: null,
          ...(message.report ? { report: null } : {}),
        }
      : {}),
    ...(quote ? { quote: safeQuote } : {}),
  };
}
