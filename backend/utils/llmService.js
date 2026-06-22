import { generateWithOpenRouter } from '../config/openrouter.js';

const SUMMARY_SYSTEM =
  'You are an expert study assistant. Write clear, structured summaries in markdown with short headings and bullet points when helpful.';

const EXPLAIN_SYSTEM =
  'You are a patient tutor. Explain concepts clearly for students using simple language, examples, and short sections.';

const QUIZ_SYSTEM =
  'You are an expert quiz writer. Create accurate multiple-choice questions strictly in the requested format. Every question must have exactly 4 options and one correct answer.';

export const MAX_QUIZ_QUESTIONS = 50;
const QUIZ_BATCH_SIZE = 10;

function truncateForPrompt(text, maxChars = 12000) {
  const cleaned = text.trim();
  if (cleaned.length <= maxChars) return cleaned;

  const headSize = Math.floor(maxChars * 0.7);
  const tailSize = maxChars - headSize;
  const head = cleaned.slice(0, headSize);
  const tail = cleaned.slice(-tailSize);

  return `${head}\n\n[... middle section omitted for length ...]\n\n${tail}`;
}

export const generateFlashcards = async (text, count = 10) => {
  const prompt = `
Generate exactly ${count} educational flashcards from the following text.

Format each flashcard as:
Q: [Clear, specific question]
A: [Concise, accurate answer]
D: [Difficulty level: easy, medium, or hard]

Separate each flashcard with "----"

Text:
${text.substring(0, 15000)}
`;

  try {
    const generatedText = await generateWithOpenRouter(prompt);
    const flashcards = [];
    const cards = generatedText.split('----').filter((c) => c.trim());

    for (const card of cards) {
      const lines = card.trim().split('\n');
      let question = '';
      let answer = '';
      let difficulty = 'medium';

      for (const line of lines) {
        if (line.startsWith('Q:')) {
          question = line.substring(2).trim();
        } else if (line.startsWith('A:')) {
          answer = line.substring(2).trim();
        } else if (line.startsWith('D:')) {
          const diff = line.substring(2).trim().toLowerCase();
          if (['easy', 'medium', 'hard'].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && answer) {
        flashcards.push({ question, answer, difficulty });
      }
    }

    return flashcards.slice(0, count);
  } catch (error) {
    console.error('OpenRouter API error:', error.message);
    throw error;
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const generateQuiz = async (text, numQuestions = 5) => {
  const target = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 1), MAX_QUIZ_QUESTIONS);
  const sourceText = truncateForPrompt(text, 12000);
  const allQuestions = [];
  let attempts = 0;
  const maxAttempts = Math.ceil(target / QUIZ_BATCH_SIZE) + 3;

  try {
    while (allQuestions.length < target && attempts < maxAttempts) {
      attempts += 1;
      const remaining = target - allQuestions.length;
      const batchCount = Math.min(QUIZ_BATCH_SIZE, remaining);

      let batch = [];
      try {
        batch = await generateQuizBatch(sourceText, batchCount, allQuestions);
      } catch (error) {
        if (allQuestions.length > 0) {
          break;
        }
        if (attempts < maxAttempts) {
          await sleep(3000);
          continue;
        }
        throw error;
      }

      if (batch.length === 0) {
        if (allQuestions.length > 0) break;
        if (attempts < maxAttempts) {
          await sleep(3000);
          continue;
        }
        break;
      }

      for (const question of batch) {
        const duplicate = allQuestions.some(
          (existing) => existing.question.toLowerCase() === question.question.toLowerCase()
        );
        if (!duplicate) {
          allQuestions.push(question);
        }
        if (allQuestions.length >= target) break;
      }

      if (allQuestions.length < target) {
        await sleep(2000);
      }
    }

    if (allQuestions.length === 0) {
      throw new Error('Could not parse quiz questions from the AI response. Please try again.');
    }

    return allQuestions.slice(0, target);
  } catch (error) {
    console.error('OpenRouter API error:', error.message);
    throw error;
  }
};

function parseQuizBlock(block) {
  const lines = block.trim().split('\n');
  let question = '';
  let options = [];
  let correctAnswer = '';
  let explanation = '';
  let difficulty = 'medium';

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^Q:/i.test(trimmed)) {
      question = trimmed.replace(/^Q:\s*/i, '').trim();
    } else if (/^O\d+:/i.test(trimmed)) {
      options.push(trimmed.replace(/^O\d+:\s*/i, '').trim());
    } else if (/^C:/i.test(trimmed)) {
      correctAnswer = trimmed.replace(/^C:\s*/i, '').trim();
    } else if (/^E:/i.test(trimmed)) {
      explanation = trimmed.replace(/^E:\s*/i, '').trim();
    } else if (/^D:/i.test(trimmed)) {
      const diff = trimmed.replace(/^D:\s*/i, '').trim().toLowerCase();
      if (['easy', 'medium', 'hard'].includes(diff)) {
        difficulty = diff;
      }
    }
  }

  if (!question || options.length !== 4 || !correctAnswer) {
    return null;
  }

  return { question, options, correctAnswer, explanation, difficulty };
}

function parseQuizResponse(generatedText) {
  const questions = [];
  const questionBlocks = generatedText.split('----').filter((q) => q.trim());

  for (const block of questionBlocks) {
    const parsed = parseQuizBlock(block);
    if (parsed) {
      questions.push(parsed);
    }
  }

  return questions;
}

async function generateQuizBatch(sourceText, count, existingQuestions = []) {
  const avoidList = existingQuestions.map((q) => q.question).slice(-15);
  const avoidSection =
    avoidList.length > 0
      ? `\nDo NOT repeat or closely rephrase these existing questions:\n${avoidList.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
      : '';

  const prompt = `Generate exactly ${count} unique multiple choice questions from the following text.
${avoidSection}
Format each question exactly as:
Q: [Question]
O1: [Option 1]
O2: [Option 2]
O3: [Option 3]
O4: [Option 4]
C: [Correct option - must match one option above exactly]
E: [Brief explanation]
D: [Difficulty: easy, medium, or hard]

Separate each question with a line containing only "----"

Text:
${sourceText}`;

  const generatedText = await generateWithOpenRouter(prompt, {
    system: QUIZ_SYSTEM,
    maxTokens: Math.min(4096, count * 400),
    temperature: 0.5,
  });

  return parseQuizResponse(generatedText);
}

export const generateSummary = async (text) => {
  const prompt = `Summarize the following document text. Highlight the key concepts, main ideas, and important takeaways.

Text:
${truncateForPrompt(text, 12000)}`;

  try {
    return await generateWithOpenRouter(prompt, {
      system: SUMMARY_SYSTEM,
      maxTokens: 2048,
      temperature: 0.3,
    });
  } catch (error) {
    console.error('OpenRouter API error:', error.message);
    throw error;
  }
};

export const chatWithContext = async (question, chunks) => {
  const context = chunks.map((c, i) => `Chunk ${i + 1}: ${c.content}`).join('\n');

  const prompt = `Based on the following context from a document, analyze the context and answer the user's question.
If the answer is not in the context, say so.

Context:
${context}

Question: ${question}
Answer:`;

  try {
    return await generateWithOpenRouter(prompt);
  } catch (error) {
    console.error('OpenRouter API error:', error.message);
    throw error;
  }
};

export const explainConcept = async (concept, context) => {
  const prompt = `Explain the concept "${concept}" for a student studying this document.

Use the document context below when it is relevant. If the context does not mention the concept directly, still provide a helpful explanation and briefly note what the document does cover instead.

Document context:
${truncateForPrompt(context, 10000)}

Write a clear, structured explanation with examples where helpful.`;

  try {
    return await generateWithOpenRouter(prompt, {
      system: EXPLAIN_SYSTEM,
      maxTokens: 2048,
      temperature: 0.4,
    });
  } catch (error) {
    console.error('OpenRouter API error:', error.message);
    throw error;
  }
};
