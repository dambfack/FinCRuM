import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Check for GOOGLE_GENAI_API_KEY
if (!process.env.GOOGLE_GENAI_API_KEY) {
  // This warning will appear in the server console during development and at build time or server start in production.
  console.warn(
    '\n======================================================================================\n' +
    'WARNING: GOOGLE_GENAI_API_KEY is not set.\n' +
    'AI features relying on this key will not function correctly.\n' +
    'Please set this environment variable in your .env.local file (for development) \n' +
    'or in your hosting environment settings (for production).\n' +
    '======================================================================================\n'
  );
}

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY, // Genkit will handle errors if the key is missing/invalid at runtime
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
