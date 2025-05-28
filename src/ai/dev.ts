// Temporarily disabled for build
// import { configureGenkit, defineFlow } from '@genkit-ai/core';
// import { generate } from '@genkit-ai/ai';
// import { googleAI } from '@genkit-ai/googleai';
// import { z } from 'zod';

// export default configureGenkit({
//   plugins: [
//     googleAI({
//       apiKey: process.env.GOOGLE_GENAI_API_KEY
//     })
//   ],
//   enableTracing: true,
//   logLevel: 'debug'
// });

// // Example AI flow for testing integration
// export const exampleFlow = defineFlow({
//   name: 'exampleFlow',
//   inputSchema: z.string(),
//   outputSchema: z.string(),
// }, async (input) => {
//   const llmResponse = await generate({
//     model: 'googleai/gemini-2.0-flash',
//     prompt: input
//   });
//   return llmResponse.text();
// });