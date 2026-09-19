import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

import { GeminiService } from '../apps/api/src/services/gemini.service';

async function testAI() {
  console.log('--- Testing AI Intelligence ---');
  
  // Test 1: Ask about products
  const reply1 = await GeminiService.generateSmartReply('demo-tenant-1', [
    { senderType: 'CUSTOMER', content: 'مرحبا، شو عندكم منتجات وساعات وبكم اسعارها؟' }
  ]);
  console.log('\n[User]: مرحبا، شو عندكم منتجات وساعات وبكم اسعارها؟');
  console.log('[AI Reply 1]:', reply1);

  // Test 2: Ask to pay
  const reply2 = await GeminiService.generateSmartReply('demo-tenant-1', [
    { senderType: 'CUSTOMER', content: 'تمام بدي اشتري الساعة، كيف طريقة الدفع؟' }
  ]);
  console.log('\n[User]: تمام بدي اشتري الساعة، كيف طريقة الدفع؟');
  console.log('[AI Reply 2]:', reply2);
}

testAI().catch(console.error);
