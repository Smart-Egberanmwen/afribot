import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { SupabaseService } from '../../../config/supabase.service';

interface AgentContext {
  tenantId: string;
  conversationId: string;
  contactId: string;
  contactName?: string;
  contactPhone: string;
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentMessage: string;
}

interface AgentResponse {
  text: string;
  actions?: AgentAction[];
  shouldHandoff: boolean;
  provider: string;
  latencyMs: number;
}

interface AgentAction {
  type: 'create_order' | 'generate_payment_link' | 'check_inventory' | 'update_cart' | 'book_appointment' | 'send_catalog';
  payload: any;
}

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private readonly anthropic: Anthropic;
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.anthropic = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async processMessage(ctx: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();

    // 1. Load agent config for this tenant
    const agent = await this.getAgentConfig(ctx.tenantId);
    if (!agent) throw new Error(`No AI agent configured for tenant ${ctx.tenantId}`);

    // 2. Check if handoff is needed
    if (this.shouldTriggerHandoff(ctx.currentMessage, agent.handoff_keywords)) {
      return {
        text: "I'm connecting you with a team member right away. Please hold on! 🙏",
        shouldHandoff: true,
        provider: 'system',
        latencyMs: Date.now() - startTime,
      };
    }

    // 3. RAG: Retrieve relevant knowledge
    const ragContext = await this.retrieveKnowledge(ctx.tenantId, ctx.currentMessage);

    // 4. Build system prompt
    const systemPrompt = this.buildSystemPrompt(agent, ragContext, ctx);

    // 5. Define available tools
    const tools = this.buildTools(agent);

    // 6. Call AI provider
    let response: AgentResponse;
    try {
      response = await this.callClaude(systemPrompt, ctx.messageHistory, ctx.currentMessage, tools, startTime);
    } catch (err) {
      this.logger.warn(`Claude failed, falling back to GPT-4o: ${err.message}`);
      response = await this.callGPT4o(systemPrompt, ctx.messageHistory, ctx.currentMessage, startTime);
    }

    return response;
  }

  private async callClaude(
    systemPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    currentMessage: string,
    tools: any[],
    startTime: number,
  ): Promise<AgentResponse> {
    const messages = [
      ...history.slice(-10), // last 10 turns for context
      { role: 'user' as const, content: currentMessage },
    ];

    const response = await this.anthropic.messages.create({
      model: this.config.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514'),
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    const actions: AgentAction[] = [];
    let textResponse = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        textResponse += block.text;
      } else if (block.type === 'tool_use') {
        actions.push({
          type: block.name as AgentAction['type'],
          payload: block.input,
        });
      }
    }

    return {
      text: textResponse || "I'm processing your request...",
      actions: actions.length > 0 ? actions : undefined,
      shouldHandoff: false,
      provider: 'claude',
      latencyMs: Date.now() - startTime,
    };
  }

  private async callGPT4o(
    systemPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    currentMessage: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const response = await this.openai.chat.completions.create({
      model: this.config.get('OPENAI_MODEL', 'gpt-4o'),
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10),
        { role: 'user', content: currentMessage },
      ],
    });

    return {
      text: response.choices[0]?.message?.content || "I'm here to help!",
      shouldHandoff: false,
      provider: 'gpt4o',
      latencyMs: Date.now() - startTime,
    };
  }

  private async retrieveKnowledge(tenantId: string, query: string): Promise<string> {
    try {
      // Generate embedding for the query
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      const embedding = embeddingResponse.data[0].embedding;

      // Semantic search in Supabase pgvector
      const { data, error } = await this.supabase.client.rpc('match_knowledge_chunks', {
        p_tenant_id: tenantId,
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
      });

      if (error || !data?.length) return '';

      return data
        .map((chunk: any) => chunk.content)
        .join('\n\n---\n\n');
    } catch (err) {
      this.logger.error(`RAG retrieval failed: ${err.message}`);
      return '';
    }
  }

  private buildSystemPrompt(agent: any, ragContext: string, ctx: AgentContext): string {
    const now = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });

    return `${agent.system_prompt}

## Business Assistant Identity
You are ${agent.name}, an intelligent assistant for this business.
Persona: ${agent.persona || 'Professional, friendly, and helpful'}
Current time (Lagos): ${now}
Customer name: ${ctx.contactName || 'Valued Customer'}
Customer phone: ${ctx.contactPhone}

## Communication Guidelines
- Respond in a natural, conversational WhatsApp style
- Keep responses concise (2-4 sentences max unless listing products)
- Use emojis sparingly but warmly 🙂
- Always respond in the customer's language if they write in Pidgin/Yoruba/Igbo/Hausa
- Never reveal you're an AI unless directly asked
- Format prices in Naira: ₦1,500 or N1,500

## Business Knowledge Base
${ragContext ? `Relevant information:\n${ragContext}` : 'Use your training to assist customers.'}

## Capabilities
${agent.enable_order_taking ? '✅ You can take orders and create carts' : ''}
${agent.enable_payment_links ? '✅ You can generate Paystack payment links' : ''}
${agent.enable_appointment_booking ? '✅ You can book appointments' : ''}
${agent.enable_lead_qualification ? '✅ You can qualify leads and collect contact info' : ''}

## Important Rules
- Never share customer data with other customers
- If you don't know something, say so honestly and offer to connect them with staff
- For complaints, always empathize first, then offer solutions
- Handoff trigger words: ${agent.handoff_keywords?.join(', ')}`;
  }

  private buildTools(agent: any): any[] {
    const tools = [];

    if (agent.enable_order_taking) {
      tools.push({
        name: 'create_order',
        description: 'Create a new order or add items to cart when customer wants to buy products',
        input_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product_name: { type: 'string' },
                  quantity: { type: 'number' },
                  variant: { type: 'string' },
                },
                required: ['product_name', 'quantity'],
              },
            },
            delivery_address: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['items'],
        },
      });
    }

    if (agent.enable_order_taking) {
      tools.push({
        name: 'check_inventory',
        description: 'Check if a product is available and its current stock level',
        input_schema: {
          type: 'object',
          properties: {
            product_name: { type: 'string', description: 'Product name to check' },
          },
          required: ['product_name'],
        },
      });
    }

    if (agent.enable_payment_links) {
      tools.push({
        name: 'generate_payment_link',
        description: 'Generate a Paystack payment link for an order',
        input_schema: {
          type: 'object',
          properties: {
            order_id: { type: 'string' },
            amount_ngn: { type: 'number' },
            description: { type: 'string' },
          },
          required: ['amount_ngn'],
        },
      });
    }

    return tools;
  }

  private shouldTriggerHandoff(message: string, keywords: string[]): boolean {
    const lower = message.toLowerCase();
    return keywords.some(kw => lower.includes(kw.toLowerCase()));
  }

  private async getAgentConfig(tenantId: string): Promise<any> {
    const { data } = await this.supabase.client
      .from('ai_agents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();
    return data;
  }
}
