import { prisma } from '@omni/database';
import crypto from 'crypto';

export interface TokenBalanceCheck {
  allowed: boolean;
  balance: number;
  subscriptionId?: string;
}

export function toValidUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(id).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export class BillingService {
  private static readonly DEFAULT_TRIAL_TOKENS = 50000;

  /**
   * Checks if tenant has sufficient token balance to perform AI actions.
   * If TenantSubscription doesn't exist yet, provisions a trial subscription with initial tokens.
   */
  public static async checkTokenBalance(rawTenantId: string): Promise<TokenBalanceCheck> {
    const tenantId = toValidUuid(rawTenantId);
    try {
      // Ensure tenant exists in DB
      await prisma.tenant.upsert({
        where: { id: tenantId },
        update: {},
        create: { id: tenantId, name: rawTenantId },
      }).catch(() => {});

      let sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      // Auto-provision trial subscription if none exists
      if (!sub) {
        let plan = await prisma.subscriptionPlan.findFirst();
        if (!plan) {
          plan = await prisma.subscriptionPlan.create({
            data: {
              name: 'Enterprise Starter',
              maxAgents: 10,
              maxMessages: 100000,
            },
          });
        }

        sub = await prisma.tenantSubscription.create({
          data: {
            tenantId,
            planId: plan.id,
            status: 'ACTIVE',
            tokenBalance: this.DEFAULT_TRIAL_TOKENS,
          },
        });

        // Log initial credit
        await prisma.tokenTransaction.create({
          data: {
            tenantId,
            amount: -this.DEFAULT_TRIAL_TOKENS,
            balanceAfter: this.DEFAULT_TRIAL_TOKENS,
            type: 'BONUS',
            description: 'Complimentary welcome token credit',
          },
        }).catch(() => {});
      }

      const balance = sub.tokenBalance ?? 0;
      if (balance <= 0) {
        return {
          allowed: false,
          balance: 0,
          subscriptionId: sub.id,
        };
      }

      return {
        allowed: true,
        balance,
        subscriptionId: sub.id,
      };
    } catch (err: any) {
      console.warn('[BillingService] Warning checking token balance, defaulting to allow:', err.message);
      return { allowed: true, balance: 999999 };
    }
  }

  /**
   * Deducts tokens used by OpenRouter / LLM from tenant's balance and records transaction.
   */
  public static async deductTokens(
    rawTenantId: string,
    tokensUsed: number,
    description: string = 'AI completion token usage',
    metadata: any = {}
  ): Promise<{ newBalance: number; transactionId?: string }> {
    if (tokensUsed <= 0) return { newBalance: 0 };
    const tenantId = toValidUuid(rawTenantId);

    try {
      const sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      if (!sub) {
        console.warn(`[BillingService] No subscription found for tenant ${tenantId} during deduction`);
        return { newBalance: 0 };
      }

      const currentBalance = sub.tokenBalance ?? 0;
      const newBalance = Math.max(0, currentBalance - tokensUsed);

      const [updatedSub, tx] = await prisma.$transaction([
        prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { tokenBalance: newBalance },
        }),
        prisma.tokenTransaction.create({
          data: {
            tenantId,
            amount: tokensUsed,
            balanceAfter: newBalance,
            type: 'USAGE',
            description,
            metadata: metadata || {},
          },
        }),
      ]);

      console.log(
        `[BillingService] 💳 Deducted ${tokensUsed} tokens for tenant ${tenantId}. New Balance: ${newBalance}`
      );

      return { newBalance: updatedSub.tokenBalance, transactionId: tx.id };
    } catch (err: any) {
      console.error('[BillingService] Failed to deduct tokens:', err.message);
      return { newBalance: 0 };
    }
  }

  /**
   * Recharges or adds tokens to tenant's balance.
   */
  public static async rechargeTokens(
    rawTenantId: string,
    amount: number,
    description: string = 'Token refill / recharge',
    metadata: any = {}
  ): Promise<{ newBalance: number; transactionId?: string }> {
    const tenantId = toValidUuid(rawTenantId);
    try {
      const sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      if (!sub) throw new Error(`Subscription not found for tenant: ${tenantId}`);

      const newBalance = (sub.tokenBalance ?? 0) + amount;

      const [updatedSub, tx] = await prisma.$transaction([
        prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { tokenBalance: newBalance },
        }),
        prisma.tokenTransaction.create({
          data: {
            tenantId,
            amount: -amount,
            balanceAfter: newBalance,
            type: 'RECHARGE',
            description,
            metadata,
          },
        }),
      ]);

      return { newBalance: updatedSub.tokenBalance, transactionId: tx.id };
    } catch (err: any) {
      console.error('[BillingService] Failed to recharge tokens:', err.message);
      throw err;
    }
  }

  /**
   * Retrieves current token balance and recent transactions for tenant.
   */
  public static async getTenantBillingSummary(rawTenantId: string) {
    const tenantId = toValidUuid(rawTenantId);
    const sub = await prisma.tenantSubscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    const transactions = await prisma.tokenTransaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const totalConsumed = await prisma.tokenTransaction.aggregate({
      where: { tenantId, type: 'USAGE' },
      _sum: { amount: true },
    });

    return {
      balance: sub?.tokenBalance ?? 0,
      status: sub?.status ?? 'ACTIVE',
      planName: sub?.plan?.name ?? 'Standard',
      totalConsumedTokens: totalConsumed._sum.amount ?? 0,
      recentTransactions: transactions,
    };
  }
}
