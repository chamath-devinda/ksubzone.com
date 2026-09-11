export function decodeSubtitle(buffer) {
  const bytes = new Uint8Array(buffer);
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
    : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  try { return new TextDecoder(encoding, { fatal: true }).decode(bytes); }
  catch { throw new Error('Unsupported text encoding. Save the original as UTF-8 or UTF-16 with a byte-order mark, then retry.'); }
}

export function parseSRT(text) {
  const blocks = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/);
  const timestamp = /^(\d{2,}):([0-5]\d):([0-5]\d),([0-9]{3})$/;
  const toMs = value => {
    const match = value.match(timestamp);
    if (!match) return NaN;
    return Number(match[1]) * 3600000 + Number(match[2]) * 60000 + Number(match[3]) * 1000 + Number(match[4]);
  };
  if (!text.trim()) throw new Error('This subtitle file is empty.');
  return blocks.map((block, index) => {
    const lines = block.trim().split('\n');
    const timeIndex = /^\d+$/.test(lines[0]) ? 1 : 0;
    const times = lines[timeIndex]?.split(/\s+-->\s+/);
    const start = times?.[0]?.trim(), end = times?.[1]?.trim();
    if (!start || !end || !Number.isFinite(toMs(start)) || !Number.isFinite(toMs(end)) || toMs(end) <= toMs(start) || lines.length <= timeIndex + 1) {
      throw new Error(`Subtitle block ${index + 1} has malformed timestamps or missing text. The original file is unchanged.`);
    }
    return { id: index + 1, start, end, text: lines.slice(timeIndex + 1).join('\n') };
  });
}
