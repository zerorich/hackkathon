const MESSAGES = {
  VALIDATION_ERROR: "Kiritilgan ma'lumotlarni tekshiring.",
  UNAUTHORIZED: "Iltimos, qaytadan kiring.",
  FORBIDDEN: "Bunga ruxsatingiz yo'q.",
  NOT_FOUND: "Topilmadi.",
  CONFLICT: "Bu amalni hozir bajarib bo'lmaydi.",
  RATE_LIMITED: "Juda tez urinyapsiz. Bir oz kuting.",
  INTERNAL_ERROR: "Bizning tomonda xatolik yuz berdi.",
  NETWORK_ERROR: "Serverga ulanib bo'lmadi. Internetni tekshiring.",

  OTP_INVALID: "Kod noto'g'ri. Qayta urinib ko'ring.",
  OTP_EXPIRED: "Kod muddati tugagan. Yangi kod so'rang.",
  OTP_TOO_MANY_ATTEMPTS: "Juda ko'p urinish. Yangi kod so'rang.",
  OTP_RATE_LIMITED: "Yangi kod so'rashdan oldin biroz kuting.",
  REFRESH_INVALID: "Sessiya muddati tugadi. Qaytadan kiring.",
  REFRESH_EXPIRED: "Sessiya muddati tugadi. Qaytadan kiring.",
  REFRESH_REUSED: "Sessiya muddati tugadi. Qaytadan kiring.",
  SESSION_REVOKED: "Sessiya tugatildi. Qaytadan kiring.",
  USER_BLOCKED: "Bu hisob bloklangan.",
  INVALID_CREDENTIALS: "Login yoki parol noto'g'ri.",
  PASSWORD_NOT_SET: "Bu hisobda parol o'rnatilmagan. Kod orqali kiring.",

  CLASS_NOT_FOUND: "Bunday sinf topilmadi.",
  CLASS_ACCESS_DENIED: "Bu sinfga kirish huquqingiz yo'q.",
  CLASS_ARCHIVED: "Bu sinf arxivlangan.",
  INVITE_CODE_INVALID: "Taklif kodi noto'g'ri.",
  ALREADY_CLASS_MEMBER: "Siz allaqachon bu sinfdasiz.",
  MEMBER_NOT_FOUND: "A'zo topilmadi.",
  CANNOT_REMOVE_LAST_TEACHER: "Sinfdagi oxirgi o'qituvchini o'chirib bo'lmaydi.",

  SUBJECT_NOT_FOUND: "Bunday fan topilmadi.",
  SUBJECT_HAS_ACTIVE_CONTENT: "Bu fanda faol mavzular bor — avval ularni arxivlang.",
  TOPIC_NOT_FOUND: "Bunday mavzu topilmadi.",
  TOPIC_ARCHIVED: "Bu mavzu arxivlangan.",

  CHALLENGE_NOT_FOUND: "Bunday challenge topilmadi.",
  CHALLENGE_NOT_READY: "Bu challenge hali tayyor emas.",
  CHALLENGE_ARCHIVED: "Bu challenge endi mavjud emas.",
  CHALLENGE_ACCESS_DENIED: "Bu challenge'ga kirish huquqingiz yo'q.",
  AI_GENERATION_LIMIT: "Sizda allaqachon yaratilayotgan challenge bor. Tugashini kuting.",
  AI_PROVIDER_UNAVAILABLE: "Zehn AI hozircha ishlamayapti.",
  AI_OUTPUT_INVALID: "Challenge yaratib bo'lmadi. Qayta urinib ko'ring.",
  INVALID_QUESTION: "Savol ma'lumotlari noto'g'ri.",
  INVALID_CORRECT_OPTION_COUNT: "Har bir savolda aynan bitta to'g'ri javob bo'lishi kerak.",

  ATTEMPT_NOT_FOUND: "Bunday urinish topilmadi.",
  ATTEMPT_ALREADY_COMPLETED: "Bu urinish allaqachon yakunlangan.",
  ATTEMPT_HAS_UNANSWERED_QUESTIONS: "Yakunlashdan oldin barcha savollarga javob bering.",
  INVALID_ATTEMPT_STATE: "Bu amal bu urinish uchun mavjud emas.",
  QUESTION_NOT_IN_CHALLENGE: "Bu savol ushbu challenge'ga tegishli emas.",
  OPTION_NOT_IN_QUESTION: "Bu variant ushbu savol uchun noto'g'ri.",

  DUEL_NOT_FOUND: "Bunday duel havolasi topilmadi.",
  DUEL_EXPIRED: "Bu taklifning muddati tugagan.",
  DUEL_ALREADY_ACCEPTED: "Bu taklif allaqachon qabul qilingan.",
  DUEL_ALREADY_EXISTS: "Bu urinish uchun duel allaqachon yaratilgan.",
  DUEL_ALREADY_COMPLETED: "Bu duel allaqachon yakunlangan.",
  CANNOT_DUEL_SELF: "O'zingiz yaratgan duelni qabul qila olmaysiz.",
  INVALID_DUEL_STATE: "Bu amal bu duel uchun mavjud emas.",
};

export function friendlyError(error) {
  if (!error) return "Nimadir xato ketdi.";
  return MESSAGES[error.code] || error.message || "Nimadir xato ketdi.";
}
