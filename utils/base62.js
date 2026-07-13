const ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
//const ALPHABET = '0123456789';
const BASE = ALPHABET.length;

export function base62encode(num) {
  if (num === 0) return ALPHABET[0];

  let result = '';
  while (num > 0) {
    const remainder = num % BASE;
    result = ALPHABET[remainder] + result;
    num = Math.floor(num / BASE);
  }
  return result;
}
