import React from 'react';
import './Summary.css';

const Summary = ({ ratings, questions }) => {
  const criteria = ['exactitude', 'completude', 'clarte'];
  const categories = [...new Set(questions.map(q => q.category))];

  const calculateGlobalScore = () => {
    let total = 0;
    let count = 0;
    Object.values(ratings).forEach(questionRatings => {
      criteria.forEach(c => {
        if (questionRatings[c] > 0) {
          total += questionRatings[c];
          count++;
        }
      });
    });
    return count > 0 ? (total / count).toFixed(2) : '-';
  };

  const calculateCriteriaScore = (criterion) => {
    let total = 0;
    let count = 0;
    Object.values(ratings).forEach(questionRatings => {
      if (questionRatings[criterion] > 0) {
        total += questionRatings[criterion];
        count++;
      }
    });
    return count > 0 ? (total / count).toFixed(2) : '-';
  };

  const calculateCategoryScore = (category) => {
    const categoryQuestions = questions.filter(q => q.category === category);
    let total = 0;
    let count = 0;
    categoryQuestions.forEach(q => {
      const questionRatings = ratings[q.id] || {};
      criteria.forEach(c => {
        if (questionRatings[c] > 0) {
          total += questionRatings[c];
          count++;
        }
      });
    });
    return count > 0 ? (total / count).toFixed(2) : '-';
  };

  const getProgressCount = () => {
    let evaluated = 0;
    questions.forEach(q => {
      const questionRatings = ratings[q.id] || {};
      const hasAnyRating = criteria.some(c => questionRatings[c] > 0);
      if (hasAnyRating) evaluated++;
    });
    return { evaluated, total: questions.length };
  };

  const progress = getProgressCount();
  const globalScore = calculateGlobalScore();

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
    <div className="summary">
      <div className="summary-header">
        <h2>Recapitulatif</h2>
        <span className="progress-badge">
          {progress.evaluated}/{progress.total} questions evaluees
        </span>
      </div>

      <div className="summary-grid">
        <div className="summary-card global-score">
          <span className="card-label">Score Global</span>
          <span className="card-value">{globalScore}</span>
          <span className="card-max">/5</span>
        </div>

        <div className="summary-card criteria-scores">
          <span className="card-label">Par Critere</span>
          <div className="criteria-list">
            <div className="criteria-item">
              <span>Exactitude</span>
              <span className="criteria-value">{calculateCriteriaScore('exactitude')}</span>
            </div>
            <div className="criteria-item">
              <span>Completude</span>
              <span className="criteria-value">{calculateCriteriaScore('completude')}</span>
            </div>
            <div className="criteria-item">
              <span>Clarte</span>
              <span className="criteria-value">{calculateCriteriaScore('clarte')}</span>
            </div>
          </div>
        </div>

        <div className="summary-card category-scores">
          <span className="card-label">Par Categorie</span>
          <div className="category-list">
            {categories.map(category => (
              <div key={category} className="category-item">
                <span 
                  className="category-dot"
                  style={{ backgroundColor: getCategoryColor(category) }}
                />
                <span className="category-name">{category}</span>
                <span className="category-value">{calculateCategoryScore(category)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
