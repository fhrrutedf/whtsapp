const fs = require('fs');
const path = require('path');

async function testUpload() {
  const filePath = path.resolve('apps/api/uploads/brochures/omni_packages.png');
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', blob, 'omni_packages.png');
  formData.append('category', 'product');
  formData.append('name', 'ساعة ذكية فاخرة');
  formData.append('price', '250');
  formData.append('description', 'ساعة ذكية مقاومة للماء مع تتبع نبضات القلب');

  console.log('Sending upload request to http://localhost:4000/api/settings/media/upload...');
  const res = await fetch('http://localhost:4000/api/settings/media/upload', {
    method: 'POST',
    headers: { 'x-tenant-id': 'demo-tenant-1' },
    body: formData,
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

testUpload().catch(console.error);
