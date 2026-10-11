export const AI_STRUCTURE_ERROR = 'AI_STRUCTURE_MISMATCH';

export class SubtitleStructureError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SubtitleStructureError';
    this.code = AI_STRUCTURE_ERROR;
  }
}

export const getSrtFormattingTokens = (text = '') => (
  text.match(/<\/?[^>\n]+>|\{\\[^}\n]*\}/g) || []
);

export const isProtectedPromoText = (text = '') => (
  /(?:https?:\/\/|www\.|ksubzone(?:\.com)?|subtitles?\s+by|translated\s+by)/i.test(text)
);

const assertFormattingPreserved = (original, translated, blockId) => {
  const originalTokens = getSrtFormattingTokens(original);
  const translatedTokens = getSrtFormattingTokens(translated);
  if (JSON.stringify(originalTokens) !== JSON.stringify(translatedTokens)) {
    throw new SubtitleStructureError(
      `AI changed formatting tags in subtitle block ${blockId}. Retrying this section safely.`
    );
  }
};

/**
 * Merge an AI response into the original cues without ever trusting the model
 * with sequence numbers or timestamps. New backends return dialogue-only arrays;
 * the legacy SRT response remains supported during rolling deployments.
 */
export function mergeAiTranslationResponse({
  chunk,
  responseData,
  polishingSinhala,
  parseSRT
}) {
  const structuredField = polishingSinhala ? 'polishedCues' : 'translatedCues';
  const legacyField = polishingSinhala ? 'polishedSrt' : 'translatedSrt';
  const translatedCues = responseData?.[structuredField];

  if (Array.isArray(translatedCues)) {
    if (translatedCues.length !== chunk.length) {
      throw new SubtitleStructureError(
        `AI returned ${translatedCues.length} subtitle lines; expected ${chunk.length}. Retrying as smaller batches.`
      );
    }

    return chunk.map((original, index) => {
      const translatedText = translatedCues[index];
      if (typeof translatedText !== 'string' || !translatedText.trim()) {
        throw new SubtitleStructureError(
          `AI returned an empty subtitle line for block ${original.id}. Retrying this section safely.`
        );
      }

      const finalText = isProtectedPromoText(original.text) ? original.text : translatedText;
      assertFormattingPreserved(original.text, finalText, original.id);
      return { ...original, text: finalText };
    });
  }

  const legacySrt = responseData?.[legacyField] || '';
  const parsed = parseSRT(legacySrt);
  if (parsed.length !== chunk.length) {
    throw new SubtitleStructureError(
      `AI returned ${parsed.length} subtitle blocks; expected ${chunk.length}. Retrying as smaller batches.`
    );
  }

  return chunk.map((original, index) => {
    const translated = parsed[index];
    if (translated.start.trim() !== original.start.trim() || translated.end.trim() !== original.end.trim()) {
      throw new SubtitleStructureError(
        `AI changed the timestamps in subtitle block ${original.id}. Retrying this section safely.`
      );
    }

    const finalText = isProtectedPromoText(original.text) ? original.text : translated.text;
    assertFormattingPreserved(original.text, finalText, original.id);
    return { ...original, text: finalText };
  });
}

export function shouldSplitAiChunk(error) {
  return error?.code === AI_STRUCTURE_ERROR
    || error?.response?.data?.code === 'AI_RESPONSE_INCOMPLETE'
    || error?.response?.status === 502;
}
