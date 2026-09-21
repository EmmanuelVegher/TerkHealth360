import { prisma } from '../prisma.js';

export interface ChatTurnRecord {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  intent?: string | null;
  toolsExecuted: string[];
  cardPayload?: any;
  createdAt: Date;
}

export interface ConversationContext {
  conversationId: string;
  recentTurns: ChatTurnRecord[];
  activePatientContext?: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Get or create an active chat conversation for a user.
 * Each user has one "active" session; completed sessions are archived.
 */
export async function getOrCreateConversation(
  userId: string,
  userRole: string
): Promise<string> {
  // Try to find existing active conversation
  const existing = await prisma.aiChatConversation.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) return existing.id;

  // Create new conversation
  const created = await prisma.aiChatConversation.create({
    data: {
      userId,
      userRole,
      title: `Chat session — ${new Date().toLocaleDateString()}`,
      isActive: true,
    },
  });

  return created.id;
}

/**
 * Load the last N turns of a conversation to inject as context.
 * Also extracts the most recent patient context from agent turns.
 */
export async function loadConversationContext(
  conversationId: string,
  lastN = 12
): Promise<ConversationContext> {
  const turns = await prisma.aiChatTurn.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: lastN,
  });

  // Find most recent patient context mentioned in agent turns
  let activePatientContext: ConversationContext['activePatientContext'] = null;
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    if (t.patientContext && typeof t.patientContext === 'object') {
      const pc = t.patientContext as any;
      if (pc.id && pc.firstName) {
        activePatientContext = {
          id: pc.id,
          patientNumber: pc.patientNumber || '',
          firstName: pc.firstName,
          lastName: pc.lastName || '',
        };
        break;
      }
    }
  }

  return {
    conversationId,
    recentTurns: turns.map((t) => ({
      id: t.id,
      sender: t.sender as 'user' | 'agent',
      text: t.text,
      intent: t.intent,
      toolsExecuted: t.toolsExecuted,
      cardPayload: t.cardPayload,
      createdAt: t.createdAt,
    })),
    activePatientContext,
  };
}

/**
 * Persist a single chat turn (user message or agent response) to the database.
 */
export async function saveChatTurn(
  conversationId: string,
  sender: 'user' | 'agent',
  text: string,
  extras?: {
    intent?: string;
    toolsExecuted?: string[];
    cardPayload?: any;
    patientContext?: any;
  }
): Promise<void> {
  await prisma.aiChatTurn.create({
    data: {
      conversationId,
      sender,
      text,
      intent: extras?.intent || null,
      toolsExecuted: extras?.toolsExecuted || [],
      cardPayload: extras?.cardPayload || undefined,
      patientContext: extras?.patientContext || undefined,
    },
  });

  // Update conversation updatedAt
  await prisma.aiChatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

/**
 * Load full conversation history for the chat widget to display on open.
 */
export async function getFullChatHistory(userId: string, limit = 60): Promise<ChatTurnRecord[]> {
  const conversation = await prisma.aiChatConversation.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!conversation) return [];

  const turns = await prisma.aiChatTurn.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  return turns.map((t) => ({
    id: t.id,
    sender: t.sender as 'user' | 'agent',
    text: t.text,
    intent: t.intent,
    toolsExecuted: t.toolsExecuted,
    cardPayload: t.cardPayload,
    createdAt: t.createdAt,
  }));
}

/**
 * Clear (archive) the active conversation for a user, starting a fresh session.
 */
export async function clearConversation(userId: string): Promise<void> {
  await prisma.aiChatConversation.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });
}

/**
 * Format recent turns as context string for intent resolution.
 * This is injected into the Agentic RAG query as "memory context".
 */
export function formatContextWindow(recentTurns: ChatTurnRecord[]): string {
  if (!recentTurns.length) return '';
  const lines = recentTurns
    .slice(-8) // last 8 turns for context
    .map((t) => `[${t.sender.toUpperCase()}]: ${t.text}`)
    .join('\n');
  return `\n\n=== Conversation History ===\n${lines}\n=== End Context ===`;
}
