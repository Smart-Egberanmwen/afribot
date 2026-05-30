import { Module } from '@nestjs/common';
import { AiAgentService } from './agents/ai-agent.service';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AiModule {}
