export const formatTimeAgo = (value) => {
  if (!value) return '';

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '';

  const elapsed = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (elapsed < minute) return 'just now';
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m ago`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h ago`;
  if (elapsed < month) return `${Math.floor(elapsed / day)}d ago`;
  if (elapsed < year) return `${Math.floor(elapsed / month)}mo ago`;
  return `${Math.floor(elapsed / year)}y ago`;
};
