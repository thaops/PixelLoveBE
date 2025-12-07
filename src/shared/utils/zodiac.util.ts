/**
 * Calculate zodiac sign from date of birth
 * @param dob Date of birth
 * @returns Zodiac sign name
 */
export function calculateZodiac(dob: Date): string {
  const month = dob.getMonth() + 1; // getMonth() returns 0-11
  const day = dob.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return 'Aries'; // Bạch Dương
  } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return 'Taurus'; // Kim Ngưu
  } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return 'Gemini'; // Song Tử
  } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return 'Cancer'; // Cự Giải
  } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return 'Leo'; // Sư Tử
  } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return 'Virgo'; // Xử Nữ
  } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return 'Libra'; // Thiên Bình
  } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return 'Scorpio'; // Bọ Cạp
  } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return 'Sagittarius'; // Nhân Mã
  } else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return 'Capricorn'; // Ma Kết
  } else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return 'Aquarius'; // Bảo Bình
  } else {
    return 'Pisces'; // Song Ngư
  }
}

/**
 * Generate unique couple code
 * @param length Code length (default 6)
 * @returns Random alphanumeric code
 */
export function generateCoupleCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

