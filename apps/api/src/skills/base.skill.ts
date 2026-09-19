import {
  SkillCategory,
  SkillDefinition,
  SkillExecutionContext,
  SkillParameterSchema,
  SkillResult,
} from './types';

/**
 * Base Abstract Skill Class.
 * Every modular skill (Sales, Support, CRM) inherits from this contract.
 */
export abstract class BaseSkill implements SkillDefinition {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly category: SkillCategory;
  abstract readonly description: string;
  abstract readonly systemPrompt: string;
  abstract readonly parameters: SkillParameterSchema;

  /**
   * Execution logic invoked when LLM triggers this skill function call.
   */
  abstract execute(context: SkillExecutionContext, args: any): Promise<SkillResult>;

  /**
   * Generates a Tool Declaration compatible with Gemini API and OpenAI function specs.
   */
  public toToolDeclaration(): {
    name: string;
    description: string;
    parameters: SkillParameterSchema;
  } {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    };
  }

  /**
   * Formats this skill's specialized Arabic system instructions for prompt injection.
   */
  public getFormattedInstruction(): string {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[مهارة مفعلة: ${this.displayName} (${this.name})]
${this.systemPrompt.trim()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}
