/**
 * Compat shim — the LLM layer is provider-agnostic now.
 *
 * This module was originally GeminiClient.js. The 14 files that require it were
 * left untouched so the swap stayed a one-file change; new code should require
 * ./LlmClient directly.
 */
module.exports = require('./LlmClient');
