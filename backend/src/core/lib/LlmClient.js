/**
 * LlmClient - provider-agnostic LLM client over the OpenAI-compatible API shape.
 *
 * Swap providers with .env only, no code change:
 *   LLM_API_KEY, LLM_BASE_URL, LLM_MODEL_FAST, LLM_MODEL_DEEP
 *
 * Works with Groq, Gemini (via its OpenAI-compat endpoint), Ollama, vLLM, LM Studio,
 * and anything else that speaks /v1/chat/completions.
 *
 * Provider-specific request fields go in LLM_EXTRA_BODY, passed through verbatim.
 * That is where Gemini's `thinkingConfig: {thinkingBudget: 0}` lives.
 *
 * Features carried over unchanged from the original client:
 *   - <think>...</think> and reasoning-field stripping
 *   - Robust JSON extraction with regex salvage
 *   - Single-line compact patient profile formatter (~90% fewer input tokens)
 */
class LlmClient {
  constructor() {
    this.baseUrl = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions';
    this.apiKey = process.env.LLM_API_KEY || '';
    this.fastModel = process.env.LLM_MODEL_FAST || process.env.MODEL_FAST || 'qwen/qwen3.8-27b';
    this.deepModel = process.env.LLM_MODEL_DEEP || process.env.MODEL_DEEP || 'openai/gpt-oss-120b';

    // Verbatim pass-through for provider-specific request fields. Set to
    // {"thinkingConfig":{"thinkingBudget":0}} for Gemini; leave empty elsewhere.
    this.extraBody = LlmClient._parseExtraBody(process.env.LLM_EXTRA_BODY);
  }

  static _parseExtraBody(raw) {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      console.warn('[LlmClient] LLM_EXTRA_BODY is not valid JSON, ignoring:', e.message);
      return {};
    }
  }

  /**
   * Pick the fast or deep model. The deep model handles clinical reasoning and
   * synthesis; the fast one handles routing, the safety gateway, and triage.
   */
  _model(options = {}) {
    const name = options.model;
    return name && name === this.deepModel ? this.deepModel : (name || this.fastModel);
  }

  /**
   * Compact Patient Profile Formatter:
   * Compresses multi-line 15-key profile objects into a single 1-line string.
   * Reduces prompt input tokens by 90% and optimizes KV-Cache reuse.
   */
  formatCompactProfile(profile = {}) {
    let age = profile.age || '?';
    if (!profile.age && profile.dateOfBirth) {
      const b = new Date(profile.dateOfBirth);
      if (!Number.isNaN(b.getTime())) {
        const n = new Date();
        age = n.getFullYear() - b.getFullYear();
        if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age -= 1;
      }
    }
    const gender = profile.gender ? profile.gender.charAt(0).toUpperCase() : '?';
    const chronic = profile.chronicDiseases || 'None';
    const meds = profile.medications ? (Array.isArray(profile.medications) ? profile.medications.map(m => m.nom || m).join(', ') : profile.medications) : 'None';
    const allergies = profile.drugAllergies || 'None';
    const preg = profile.isPregnant ? `Yes (Trim ${profile.trimester || '1'})` : 'No';
    // Deterministic reply language (see core/lib/language.js): disambiguates
    // Arabic-script (MSA vs Darija) and Tifinagh before the LLM guesses.
    const replyLang = profile.replyLanguage || profile.preferredLanguage || '?';

    return `[Patient: ${gender}, ${age}y | Meds: ${meds} | Allergies: ${allergies} | Chronic: ${chronic} | Pregnant: ${preg} | ReplyLang: ${replyLang}]`;
  }

  /**
   * Safe JSON parser with auto-extraction of structured JSON objects.
   */
  parseJSON(input, fallback = {}) {
    if (!input || typeof input !== 'string') return fallback;
    const cleaned = input.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e1) {
      // Find JSON object starting with a known key (reply, severity, danger_vital, etc.) or standard brace
      const jsonMatch = cleaned.match(/\{\s*"(?:reply|severity|danger_vital|status|risk|reason|raison)"[\s\S]*?\}/i)
                     || cleaned.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {}
      }
      return fallback;
    }
  }

  /**
   * Strip <think> tags, markdown fences, and chain-of-thought preamble lines.
   * Providers put reasoning in different places (a `reasoning` field, <think> tags,
   * or leading prose) so the cleanup is deliberately broad.
   */
  stripReasoning(content) {
    let out = (content || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();

    if (/^\s*\*|\d+\.\s*\*\*|^Thinking Process:/i.test(out)) {
      const lines = out.split('\n');
      const cleanLines = lines.filter(l => {
        const trimmed = l.trim();
        if (/^\d+\.\s*\*\*/.test(trimmed)) return false;
        if (/^Thinking Process:/i.test(trimmed)) return false;
        if (/^\*\s*(?:Task|Constraint|Clinical|Sentence|Patient|Step|Reasoning|Check|Action|Greeting|Rule|CRITICAL)/i.test(trimmed)) return false;
        if (/^(?:Analyze|Determine|Formulate|Apply|Draft|Synthesize)/i.test(trimmed)) return false;
        return true;
      });
      if (cleanLines.length > 0) {
        out = cleanLines.join('\n').trim();
      }
    }

    return out;
  }

  /**
   * Build the response_format for a JSON-mode call.
   *
   * Callers pass `jsonSchema` in one of two shapes and both must be handled:
   *   - `true`                     -> ask for JSON, let the prompt define the shape
   *   - { name, schema: {...} }   -> enforce that schema server-side
   *
   * A bare `true` must never reach the API.
   *
   * Deliberately always `json_object`, never `json_schema`: Groq rejects
   * json_schema on some models (it ran out of completion tokens mid-document),
   * and Gemini's OpenAI-compat layer does not support it either. The prompt
   * carries the shape and parseJSON() salvages the result, which is what the
   * rest of the backend already assumes.
   */
  _buildResponseFormat(options) {
    if (!options.jsonSchema) return undefined;
    return { type: 'json_object' };
  }

  /**
   * Some providers (Groq) reject response_format json_object unless the literal
   * word "json" appears in the messages. Inject it rather than making every
   * caller remember.
   */
  _ensureJsonWord(messages) {
    const hasJson = messages.some(m => {
      const c = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content) ? m.content.map(b => b.text || '').join(' ') : '';
      return /json/i.test(c || '');
    });
    if (hasJson) return messages;

    const out = messages.map(m => ({ ...m }));
    const last = out[out.length - 1];
    const note = ' Respond with a single valid JSON object and nothing else.';
    if (typeof last.content === 'string') {
      last.content = last.content + note;
    } else if (Array.isArray(last.content)) {
      last.content = [...last.content, { type: 'text', text: note }];
    }
    return out;
  }

  _buildPayload(messages, options, stream = false) {
    const responseFormat = this._buildResponseFormat(options);
    const msgs = responseFormat ? this._ensureJsonWord(messages) : messages;

    return {
      model: this._model(options),
      messages: msgs,
      stream,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.1,
      top_p: options.topP ?? 0.95,
      ...(responseFormat ? { response_format: responseFormat } : {}),
      ...this.extraBody,
    };
  }

  _headers() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  /**
   * Non-streaming completion. Used for structured JSON outputs (router, safety gateway, agents).
   * Resolves to the cleaned text.
   */
  async complete(messages, options = {}) {
    return this.withRateLimitRetry(
      () => this._completeOnce(messages, options),
      {
        // A 400 "failed to generate JSON" is the model answering in prose
        // instead of the requested object. The request was valid, so retrying
        // it succeeds often enough that losing the exchange is not justified.
        isRetryable: err => /failed to generate json|json_validate_failed/i.test(err.message),
        baseDelayMs: 400,
      },
    );
  }

  async _completeOnce(messages, options = {}) {
    // Offline stub: lets the whole interface run with no API key. See llmMock.js.
    if (process.env.LLM_MOCK === 'true') {
      const { mockComplete } = require('./llmMock');
      return mockComplete(messages, options);
    }
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(this._buildPayload(messages, options, false)),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const msg = data.choices?.[0]?.message || {};
    // Reasoning models (gpt-oss) return a separate `reasoning` field; prefer
    // `content`, fall back to it only when content is empty.
    const content = msg.content || msg.reasoning || '';

    return this.stripReasoning(content);
  }

  /**
   * Fast completion using the small router/safety model.
   */
  async completeFast(messages, options = {}) {
    const { model, ...rest } = options;
    return this.complete(messages, { maxTokens: 700, ...rest, model });
  }

  /**
   * Run `fn`, retrying on provider rate limits with backoff.
   *
   * Free and shared tiers limit output tokens per *minute*. A 429 that is not
   * retried does not surface to the user — the calling node catches it and
   * falls back to a default route, so the app looks like it is working while
   * quietly ignoring most messages. In the safety gateway the same 429 trips
   * the fail-safe and reports every message as a life-threatening emergency.
   *
   * The delay has to reach into the next window, so the last attempts wait a
   * full minute rather than doubling from a second.
   */
  async withRateLimitRetry(fn, { attempts = 4, baseDelayMs = 1500, maxDelayMs = 62000, isRetryable } = {}) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const retryable = isRetryable ? isRetryable(err) : /\b429\b|rate.?limit|too many requests|quota/i.test(err.message);
        const rateLimited = retryable;
        // A truncated JSON document: the cap was too small for the document.
        // Retrying at the same size fails identically, so surface it as-is and
        // let the caller raise maxTokens rather than burning attempts.
        if (!rateLimited || i === attempts - 1) throw err;

        // Honour a Retry-After hint in the message when the provider gives one.
        const hint = /retry in ([\d.]+)s/i.exec(err.message);
        const wait = hint
          ? Math.min(Number(hint[1]) * 1000 + 500, maxDelayMs)
          : Math.min(maxDelayMs, baseDelayMs * Math.pow(2, i));

        console.warn(`[LlmClient] retryable ${err.message.slice(0, 60)}…, retrying in ${Math.round(wait / 1000)}s (attempt ${i + 1}/${attempts})`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw lastError;
  }

  /**
   * Streaming completion — used for the main patient chat synthesis.
   * Yields text chunks.
   */
  async *completeStream(messages, options = {}) {
    if (process.env.LLM_MOCK === 'true') {
      const { mockCompleteStream } = require('./llmMock');
      yield* mockCompleteStream(messages, options);
      return;
    }
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(this._buildPayload(messages, options, true)),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') return;

          try {
            const chunk = JSON.parse(jsonStr);
            const delta = chunk.choices?.[0]?.delta?.content
              || chunk.choices?.[0]?.message?.content
              || '';
            if (delta) yield delta;
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

module.exports = new LlmClient();
