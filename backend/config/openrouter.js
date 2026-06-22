import 'dotenv/config';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemma-4-26b-a4b-it:free';
const FALLBACK_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'cohere/north-mini-code:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'openrouter/free',
];

function getApiKeys() {
  const raw = process.env.OPENROUTER_API_KEY || '';
  return raw
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key && !key.includes('your_openrouter') && !key.includes('PASTE_'));
}

function getModelList() {
  const preferred = process.env.OPENROUTER_MODEL;
  const models = preferred ? [preferred, ...FALLBACK_MODELS] : FALLBACK_MODELS;
  return [...new Set(models)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error) {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown OpenRouter API error';
  }
}

function isQuotaError(error) {
  const msg = getErrorMessage(error).toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('quota');
}

function isPaymentError(error) {
  const msg = getErrorMessage(error).toLowerCase();
  return msg.includes('402') || msg.includes('insufficient') || msg.includes('credit');
}

function isBusyError(error) {
  const msg = getErrorMessage(error).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('empty response')
  );
}

function isModelUnavailableError(error) {
  const msg = getErrorMessage(error).toLowerCase();
  return msg.includes('404') || msg.includes('no endpoints') || msg.includes('not found');
}

function createOpenRouterError(message, statusCode = 500) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function extractMessageText(message) {
  if (!message) return '';

  if (typeof message.content === 'string' && message.content.trim()) {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    const parts = message.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' && part.text) return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();

    if (parts) return parts;
  }

  return '';
}

function mapOpenRouterFailure(lastError) {
  const message = getErrorMessage(lastError);

  if (isPaymentError(lastError)) {
    throw createOpenRouterError(
      'OpenRouter credits exhausted. Add credits at https://openrouter.ai/credits or switch to a free model in OPENROUTER_MODEL.',
      402
    );
  }

  if (isQuotaError(lastError)) {
    throw createOpenRouterError(
      'OpenRouter rate limit reached. Please wait a moment and try again.',
      429
    );
  }

  if (isBusyError(lastError)) {
    throw createOpenRouterError('AI model is temporarily busy. Please try again in a moment.', 503);
  }

  throw createOpenRouterError('Failed to get a response from OpenRouter. Please try again.', 502);
}

async function requestCompletion(apiKey, model, prompt, options = {}) {
  const messages = [];

  if (options.system) {
    messages.push({ role: 'system', content: options.system });
  }

  messages.push({ role: 'user', content: prompt });

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'Learning Assistant',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.4,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = data?.error?.message || data?.message || response.statusText;
    throw new Error(`${response.status} ${apiMessage}`);
  }

  const text = extractMessageText(data?.choices?.[0]?.message);
  if (!text) {
    throw new Error('Empty response from OpenRouter');
  }

  return text;
}

export async function generateWithOpenRouter(prompt, options = {}) {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw createOpenRouterError(
      'OPENROUTER_API_KEY is not configured. Get a key at https://openrouter.ai/keys and add it to backend/.env',
      500
    );
  }

  const models = getModelList();
  let lastError = null;
  let sawQuotaError = false;

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    let keyPaymentBlocked = false;

    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          return await requestCompletion(apiKey, model, prompt, options);
        } catch (error) {
          lastError = error;
          const message = getErrorMessage(error);
          console.error(
            `OpenRouter error (key ${keyIndex + 1}/${apiKeys.length}, model: ${model}, attempt ${attempt}):`,
            message
          );

          if (isPaymentError(error)) {
            keyPaymentBlocked = true;
            break;
          }

          if (isQuotaError(error)) {
            sawQuotaError = true;
            break;
          }

          if (isModelUnavailableError(error) || isBusyError(error)) {
            break;
          }

          if (!isBusyError(error) || attempt === 2) {
            break;
          }

          await sleep(1500 * attempt);
        }
      }

      if (keyPaymentBlocked) break;
    }

    if (!keyPaymentBlocked && lastError && !isQuotaError(lastError) && !isPaymentError(lastError)) {
      mapOpenRouterFailure(lastError);
    }

    if (keyIndex < apiKeys.length - 1) {
      console.warn('Switching to next OpenRouter API key...');
    }
  }

  if (sawQuotaError && !isPaymentError(lastError)) {
    throw createOpenRouterError(
      'OpenRouter rate limit reached. Please wait a moment and try again.',
      429
    );
  }

  mapOpenRouterFailure(lastError);
}

export function assertOpenRouterConfigured() {
  if (getApiKeys().length === 0) {
    console.error('FATAL ERROR: OPENROUTER_API_KEY is not set in backend/.env');
    console.error('Get a key at https://openrouter.ai/keys');
    process.exit(1);
  }
}
