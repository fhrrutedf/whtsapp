import { BaseSkill } from './base.skill';
import { SkillCategory, SkillExecutionContext, SkillResult } from './types';
import { ObjectionHandlerSkill } from './sales/objectionHandler.skill';
import { SalesCloserSkill } from './sales/salesCloser.skill';
import { LeadGenSkill } from './sales/leadGen.skill';
import { UpsellCrossSellSkill } from './sales/upsellCrossSell.skill';
import { CartRecoverySkill } from './sales/cartRecovery.skill';
import { ChurnRiskDetectorSkill } from './operations/churnRiskDetector.skill';
import { MeetingSchedulerSkill } from './operations/meetingScheduler.skill';
import { CustomerSuccessSkill } from './growth/customerSuccess.skill';
import { RevenueOperationsSkill } from './growth/revenueOperations.skill';
import { SalesEngineerSkill } from './growth/salesEngineer.skill';
import { BusinessGrowthRouterSkill } from './growth/businessGrowthRouter.skill';

export class SkillRegistry {
  private skills = new Map<string, BaseSkill>();

  constructor() {
    // Auto-register built-in core sales and operations skills
    this.register(new ObjectionHandlerSkill());
    this.register(new SalesCloserSkill());
    this.register(new LeadGenSkill());
    this.register(new UpsellCrossSellSkill());
    this.register(new CartRecoverySkill());
    this.register(new ChurnRiskDetectorSkill());
    this.register(new MeetingSchedulerSkill());
    // Strategic Growth & RevOps skills
    this.register(new CustomerSuccessSkill());
    this.register(new RevenueOperationsSkill());
    this.register(new SalesEngineerSkill());
    this.register(new BusinessGrowthRouterSkill());
  }

  /**
   * Registers a new skill into the catalog
   */
  public register(skill: BaseSkill): void {
    if (this.skills.has(skill.name)) {
      console.warn(`[SkillRegistry] Overwriting existing skill: ${skill.name}`);
    }
    this.skills.set(skill.name, skill);
    console.error(`[SkillRegistry] 🧩 Registered skill: [${skill.category.toUpperCase()}] ${skill.displayName}`);
  }

  /**
   * Retrieves a skill by name
   */
  public get(name: string): BaseSkill | undefined {
    return this.skills.get(name);
  }

  public getSkill(name: string): BaseSkill | undefined {
    return this.get(name);
  }

  /**
   * Returns all registered skills
   */
  public getAll(): BaseSkill[] {
    return Array.from(this.skills.values());
  }

  public getAllSkills(): BaseSkill[] {
    return this.getAll();
  }

  /**
   * Returns skills filtered by category (e.g., 'sales', 'support')
   */
  public getByCategory(category: SkillCategory): BaseSkill[] {
    return this.getAll().filter((s) => s.category === category);
  }

  /**
   * Formats registered skills into Google Gemini / OpenAI function declarations
   */
  public getToolsForLLM(category?: SkillCategory): Array<{
    name: string;
    description: string;
    parameters: any;
  }> {
    const list = category ? this.getByCategory(category) : this.getAll();
    return list.map((s) => s.toToolDeclaration());
  }

  /**
   * Combines all specialized system prompts for active skills
   */
  public getCombinedSystemPrompts(category?: SkillCategory): string {
    const list = category ? this.getByCategory(category) : this.getAll();
    if (list.length === 0) return '';
    return list.map((s) => s.getFormattedInstruction()).join('\n\n');
  }

  /**
   * Executes a skill dynamically when an LLM requests a function call
   */
  public async execute(
    name: string,
    context: SkillExecutionContext,
    args: any
  ): Promise<SkillResult> {
    const skill = this.skills.get(name);
    if (!skill) {
      console.error(`[SkillRegistry] ❌ Attempted to execute unknown skill: ${name}`);
      return {
        success: false,
        actionTaken: 'UNKNOWN_SKILL',
        error: `Skill "${name}" is not registered in this system.`,
      };
    }

    try {
      console.error(`[SkillRegistry] ⚡ Executing skill "${name}" for tenant "${context.tenantId}"...`);
      return await skill.execute(context, args);
    } catch (err: any) {
      console.error(`[SkillRegistry] 💥 Skill "${name}" execution failed:`, err);
      return {
        success: false,
        actionTaken: 'EXECUTION_FAILED',
        error: err.message || 'Unknown skill error occurred',
      };
    }
  }
}

// Global Singleton Registry
export const skillRegistry = new SkillRegistry();
