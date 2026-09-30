const DAILY_ACCENT_COLORS = {
  Monday: '#FF3B30',
  Tuesday: '#FF9F0A',
  Wednesday: '#30D158',
  Thursday: '#00C7BE',
  Friday: '#0A84FF',
  Saturday: '#BF5AF2',
  Sunday: '#FF2D55'
};

export const getDailyBrandAccentColor = (date = new Date()) => {
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'Asia/Colombo'
  }).format(date);

  return DAILY_ACCENT_COLORS[weekday] || DAILY_ACCENT_COLORS.Monday;
};

export const applyDailyBrandAccentColor = (text, date = new Date()) =>
  String(text || '').replace(/\{dailyColor\}/gi, getDailyBrandAccentColor(date));
