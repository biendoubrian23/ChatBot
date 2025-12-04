import React, { useState, useEffect, useCallback } from 'react';
import StarRating from './StarRating';
import './QuestionCard.css';

const QuestionCard = ({ question, ratings, onRatingChange, comment, onCommentChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localComment, setLocalComment] = useState(comment || '');
  const [isSaving, setIsSaving] = useState(false);

  // Mettre à jour le commentaire local quand le prop change
  useEffect(() => {
    setLocalComment(comment || '');
  }, [comment]);

  // Debounce pour sauvegarder automatiquement après 1 seconde d'inactivité
  const debouncedSave = useCallback(
    (() => {
      let timeoutId;
      return (value) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (onCommentChange && value !== comment) {
            setIsSaving(true);
            onCommentChange(question.id, value).finally(() => {
              setIsSaving(false);
            });
          }
        }, 1000);
      };
    })(),
    [question.id, comment, onCommentChange]
  );

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setLocalComment(value);
    debouncedSave(value);
  };

  const criteria = [
    { id: 'exactitude', label: 'Exactitude', description: 'La reponse est-elle correcte ?' },
    { id: 'completude', label: 'Completude', description: 'La reponse couvre-t-elle tous les aspects ?' },
    { id: 'clarte', label: 'Clarte', description: 'La reponse est-elle claire et comprehensible ?' }
  ];

  const getAverageRating = () => {
    const values = criteria.map(c => ratings[c.id] || 0).filter(v => v > 0);
    if (values.length === 0) return null;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  const avgRating = getAverageRating();

  const getCategoryColor = (category) => {
    const colors = {
      'Reclamations': '#dc2626',
      'Annulation': '#ea580c',
      'Livraison': '#2563eb',
      'Technique': '#7c3aed',
      'PIEGE': '#dc2626',
      'Paiement': '#059669'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div className={`question-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="question-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="question-info">
          <span className="question-number">Q{question.id}</span>
          <span 
            className="question-category"
            style={{ backgroundColor: getCategoryColor(question.category) }}
          >
            {question.category}
          </span>
          <span className="question-label">{question.label}</span>
        </div>
        <div className="question-meta">
          {avgRating && (
            <span className="question-avg-rating">
              {avgRating}/5
            </span>
          )}
          <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M7 10l5 5 5-5z" fill="currentColor" />
            </svg>
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="question-content">
          <div className="question-text">
            <h4>Question</h4>
            <p>{question.question}</p>
          </div>

          <div className="answers-container">
            <div className="answer expected">
              <h4>Reponse attendue</h4>
              <p>{question.expected_answer}</p>
            </div>

            <div className="answer actual">
              <h4>Reponse du chatbot</h4>
              <p>{question.actual_answer}</p>
            </div>
          </div>

          <div className="ratings-section">
            <h4>Evaluation</h4>
            <div className="ratings-grid">
              {criteria.map(criterion => (
                <div key={criterion.id} className="rating-item">
                  <div className="rating-label">
                    <span className="criterion-name">{criterion.label}</span>
                    <span className="criterion-desc">{criterion.description}</span>
                  </div>
                  <StarRating
                    rating={ratings[criterion.id] || 0}
                    onRatingChange={onRatingChange}
                    criteriaId={criterion.id}
                    questionId={question.id}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Zone de commentaire */}
          <div className="comment-section">
            <h4>
              Commentaire (optionnel)
              {isSaving && <span className="saving-indicator"> Enregistrement...</span>}
            </h4>
            <textarea
              className="comment-input"
              placeholder="Ajoutez vos remarques ou observations sur cette question..."
              value={localComment}
              onChange={handleCommentChange}
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
