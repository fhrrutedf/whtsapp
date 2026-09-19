import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';
import { prisma } from '@omni/database';
import { localStore } from '../../services/store.service';
import { toValidUuid } from '../../services/billing.service';

export interface LeadGenArgs {
  providedName?: string;
  providedPhone?: string;
  notes?: string;
}

export class LeadGenSkill extends BaseSkill {
  readonly name = 'lead_gen_collector';
  readonly displayName = 'صياد بيانات العميل واستكمال الـ CRM (Lead Generator)';
  readonly category: SkillCategory = 'lead_gen';

  readonly description =
    'تُستدعى عندما يظهر المستخدم اهتماماً بالخدمة ولكن نحتاج لجمع بيانات التواصل الخاصة به (الاسم ورقم الهاتف) قبل المتابعة.';

  readonly parameters: SkillParameterSchema = {
    type: 'object',
    properties: {
      providedName: {
        type: 'string',
        description: 'اسم العميل الذي تم التقاطه من سياق الحديث إن وُجد',
      },
      providedPhone: {
        type: 'string',
        description: 'رقم هاتف العميل إذا صرّح به في الرسالة',
      },
      notes: {
        type: 'string',
        description: 'أي تفاصيل إضافية عن رغبة العميل أو استفساره',
      },
    },
  };

  readonly systemPrompt = `
هدفك جمع بيانات العميل (الاسم ورقم الهاتف) بأسلوب طبيعي ومحادثة سلسة، وليس كاستمارة تحقيق. اطلب معلومة واحدة فقط في كل رسالة. مثال: 'يا هلا فيك.. حتى أقدر أخدمك وأعطيك التفاصيل الصح، ممكن أتشرف بالاسم الكريم؟'. لا تقدم تفاصيل المنتج قبل أخذ البيانات.
`.trim();

  async execute(context: SkillExecutionContext, args: LeadGenArgs): Promise<SkillResult> {
    // Initialize extractedVariables container on context if not present
    if (!context.extractedVariables) {
      context.extractedVariables = {};
    }

    // 1. Ingest newly provided arguments into context.extractedVariables
    if (args.providedName && args.providedName.trim().length > 0) {
      context.extractedVariables['name'] = args.providedName.trim();
    }
    if (args.providedPhone && args.providedPhone.trim().length > 0) {
      context.extractedVariables['phone'] = args.providedPhone.trim();
    }

    const currentName = context.extractedVariables['name'] || context.customerName;
    const currentPhone = context.extractedVariables['phone'] || (context.contactPhone !== 'unknown' ? context.contactPhone : undefined);

    console.error(
      `[LeadGenSkill] 🔍 Evaluating Lead Qualification | Current Name: ${currentName || 'MISSING'} | Current Phone: ${currentPhone || 'MISSING'}`
    );

    // 2. Determine next required field and prompt
    let nextStep = '';
    let promptQuestion = '';

    if (!currentName) {
      nextStep = 'ASK_NAME';
      promptQuestion = 'يا هلا فيك.. حتى أقدر أخدمك وأعطيك التفاصيل الصح، ممكن أتشرف بالاسم الكريم؟';
    } else if (!currentPhone) {
      nextStep = 'ASK_PHONE';
      promptQuestion = `والنعم منك يا ${currentName}.. يا ريت رقم جوالك الكريم حتى نرسل لك التفاصيل أو يتواصل معك مسؤول المتابعة؟`;
    } else {
      nextStep = 'ALL_DATA_COLLECTED';
      promptQuestion = `أهلاً بك يا ${currentName}، تم تسجيل بياناتك بنجاح وسنتابع معك كل التفاصيل المطلوبة فوراً!`;
    }

    // 3. Persist captured details to Database & localStore if available
    try {
      if (context.tenantId && (currentName || currentPhone)) {
        const tenantId = toValidUuid(context.tenantId);
        const searchPhone = (currentPhone || context.contactPhone || '').replace(/\D/g, '');

        if (searchPhone.length >= 6) {
          const contact = await prisma.contact.findFirst({
            where: {
              tenantId,
              phoneNumber: { contains: searchPhone.slice(-8) },
            },
          });

          if (contact) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: {
                ...(currentName ? { name: currentName } : {}),
                ...(currentPhone ? { phoneNumber: currentPhone } : {}),
              },
            });
          }
        }

        if (currentName) {
          localStore.upsertContact(context.tenantId, context.contactPhone, currentName);
        }
      }
    } catch (dbErr: any) {
      console.warn('[LeadGenSkill] DB sync note:', dbErr.message);
    }

    return {
      success: true,
      actionTaken: nextStep,
      data: {
        extractedVariables: context.extractedVariables,
        hasName: Boolean(currentName),
        hasPhone: Boolean(currentPhone),
        nextStep,
      },
      suggestedMessage: promptQuestion,
    };
  }
}
