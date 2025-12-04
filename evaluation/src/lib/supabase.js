import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hubrysqmeljiergkghuv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YnJ5c3FtZWxqaWVyZ2tnaHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTE2OTcsImV4cCI6MjA4MDQyNzY5N30.FbRmzd3eFwzMd13D4rTHghXqRcZludR9AvJQXrf9BkI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// IDs valides pour l'accès
export const VALID_IDS = ['100', '200', '300', '400', '500'];
export const ADMIN_ID = '1000';

// Fonctions pour les évaluations
export const saveRating = async (userId, questionId, criteria, rating) => {
  const { data, error } = await supabase
    .from('evaluations')
    .upsert({
      user_id: userId,
      question_id: questionId,
      criteria: criteria,
      rating: rating,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,question_id,criteria'
    });

  if (error) {
    console.error('Error saving rating:', error);
    return null;
  }
  return data;
};

export const getUserRatings = async (userId) => {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching ratings:', error);
    return {};
  }

  // Transformer en format attendu par l'app
  const ratings = {};
  data.forEach(row => {
    if (!ratings[row.question_id]) {
      ratings[row.question_id] = {};
    }
    ratings[row.question_id][row.criteria] = row.rating;
  });

  return ratings;
};

export const getAllRatings = async () => {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*');

  if (error) {
    console.error('Error fetching all ratings:', error);
    return [];
  }

  return data;
};

export const getDistinctUsers = async () => {
  const { data, error } = await supabase
    .from('evaluations')
    .select('user_id');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  // Retourner les IDs uniques
  return [...new Set(data.map(row => row.user_id))];
};
