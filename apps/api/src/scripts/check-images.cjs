const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from apps/api
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkImages() {
  const { data, error } = await supabase
    .from('products')
    .select('code, name, image_urls')
    .not('image_urls', 'is', null)
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Products com imagens:\n');
  for (const p of data) {
    console.log('─'.repeat(50));
    console.log('Code:', p.code);
    console.log('Name:', p.name);
    console.log('Image URLs:', p.image_urls);

    if (p.image_urls && p.image_urls.length > 0) {
      console.log('\nTesting first URL:', p.image_urls[0]);

      // Try to fetch to see if it's accessible
      try {
        const response = await fetch(p.image_urls[0], { method: 'HEAD' });
        console.log('Status:', response.status, response.ok ? '✓' : '✗');
      } catch (err) {
        console.log('Fetch error:', err.message);
      }
    }
    console.log('');
  }
}

checkImages().catch(console.error);
