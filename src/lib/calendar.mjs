// Calendar labels are strings, not instants. Do not use Date/timezone conversion
// for publication days, weekly periods or deadlines. Preserve input precision.
export function parseCalendar(value) {
  if (typeof value !== 'string') throw new TypeError('Calendar value must be a string');
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!match) throw new RangeError(`Invalid calendar label: ${value}`);
  const year = Number(match[1]), month = match[2] && Number(match[2]), day = match[3] && Number(match[3]);
  if (year < 1 || (month !== undefined && (month < 1 || month > 12))) throw new RangeError(`Invalid calendar label: ${value}`);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day !== undefined && (day < 1 || day > days[month - 1])) throw new RangeError(`Invalid calendar label: ${value}`);
  return { year, month, day, precision: day === undefined ? month === undefined ? 'year' : 'month' : 'day' };
}
export function formatCalendar(value, lang = 'en') {
  const { year, month, day } = parseCalendar(value);
  if (!['en', 'zh'].includes(lang)) throw new RangeError(`Unknown calendar locale: ${lang}`);
  return lang === 'en' ? value : `${year}年${month === undefined ? '' : `${month}月`}${day === undefined ? '' : `${day}日`}`;
}
export function parsePeriod(value) {
  const match = /^(\d{4}(?:-\d{2}){0,2})\s*~\s*(\d{4}(?:-\d{2}){0,2})(\s+\([^)]*\))?$/.exec(value);
  if (!match) throw new RangeError(`Invalid calendar period: ${value}`);
  const start = parseCalendar(match[1]), end = parseCalendar(match[2]);
  if (start.precision !== end.precision || match[1] > match[2]) throw new RangeError(`Invalid calendar period: ${value}`);
  return { start: match[1], end: match[2], note: match[3] ?? '' };
}
export function formatPeriod(value, lang = 'en') {
  const { start, end, note } = parsePeriod(value);
  return `${formatCalendar(start, lang)}${lang === 'zh' ? ' 至 ' : ' – '}${formatCalendar(end, lang)}${note}`;
}
// Only a known leading date label is projected. The archived commit message
// itself remains verbatim, including code, identifiers and quoted dates.
export function splitLogLabel(value) {
  const match = /^\[(\d{4}-\d{2}-\d{2})\] (.*)$/s.exec(value);
  if (!match) return { date: null, message: value };
  parseCalendar(match[1]);
  return { date: match[1], message: match[2] };
}
