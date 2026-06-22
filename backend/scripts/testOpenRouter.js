import 'dotenv/config';
import { generateWithOpenRouter } from '../config/openrouter.js';

async function testOpenRouter() {
  const model = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';

  console.log('Testing OpenRouter connection...');
  console.log(`Model: ${model}\n`);

  const reply = await generateWithOpenRouter(
    'Reply with exactly: OpenRouter is connected and working.'
  );

  console.log('OpenRouter connected successfully!\n');
  console.log('Response:', reply);
}

testOpenRouter().catch((err) => {
  console.error('OpenRouter test failed:', err.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Sign up at https://openrouter.ai/');
  console.error('  2. Create an API key at https://openrouter.ai/keys');
  console.error('  3. Add credits or use a free model');
  console.error('  4. Add to backend/.env: OPENROUTER_API_KEY=your_key_here\n');
  process.exit(1);
});
