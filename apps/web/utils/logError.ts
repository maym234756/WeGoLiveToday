// apps/web/utils/logError.ts

export function logSupabaseError(context: string, error: any) {
  console.error(`❌ ${context}`);
  if (error?.message) console.error('🔥 Message:', error.message);
  if (error?.details) console.error('📌 Details:', error.details);
  if (error?.hint) console.error('💡 Hint:', error.hint);
  if (error) console.error('🧵 Full Error:', error);
}
