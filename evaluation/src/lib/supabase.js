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

// ============================================
// FONCTIONS POUR LES COMMENTAIRES
// ============================================

// Sauvegarder ou mettre à jour un commentaire
export const saveComment = async (userId, questionId, commentText) => {
  const { data, error } = await supabase
    .from('user_comments')
    .upsert({
      user_id: userId,
      question_id: questionId,
      comment_text: commentText,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,question_id'
    });

  if (error) {
    console.error('Error saving comment:', error);
    return null;
  }
  return data;
};

// Récupérer tous les commentaires d'un utilisateur
export const getUserComments = async (userId) => {
  const { data, error } = await supabase
    .from('user_comments')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user comments:', error);
    return {};
  }

  // Transformer en format {questionId: commentText}
  const comments = {};
  data.forEach(row => {
    comments[row.question_id] = row.comment_text;
  });

  return comments;
};

// Récupérer tous les commentaires (pour l'admin)
export const getAllComments = async () => {
  const { data, error } = await supabase
    .from('user_comments')
    .select('*')
    .order('question_id', { ascending: true })
    .order('user_id', { ascending: true });

  if (error) {
    console.error('Error fetching all comments:', error);
    return [];
  }

  return data;
};

// Récupérer les commentaires pour une question spécifique
export const getCommentsForQuestion = async (questionId) => {
  const { data, error } = await supabase
    .from('user_comments')
    .select('*')
    .eq('question_id', questionId)
    .order('user_id', { ascending: true });

  if (error) {
    console.error('Error fetching question comments:', error);
    return [];
  }

  return data;
};
