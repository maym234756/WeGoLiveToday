import { supabase } from './supabase'; // make sure this matches your setup

export const getIsPro = async (authUserId: string) => {
  const { data, error } = await supabase
    .from('User Signup List')
    .select('is_pro')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    console.error('Failed to fetch is_pro:', error.message);
    return false;
  }

  return data?.is_pro === true;
};
