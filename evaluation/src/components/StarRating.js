import React from 'react';
import './StarRating.css';

const StarRating = ({ rating, onRatingChange, criteriaId, questionId }) => {
  const handleClick = (e, starIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const newRating = isHalf ? starIndex + 0.5 : starIndex + 1;
    onRatingChange(questionId, criteriaId, newRating);
  };

  const renderStar = (index) => {
    const filled = rating >= index + 1;
    const halfFilled = !filled && rating >= index + 0.5;

    return (
      <span
        key={index}
        className={`star ${filled ? 'filled' : ''} ${halfFilled ? 'half-filled' : ''}`}
        onClick={(e) => handleClick(e, index)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <defs>
            <linearGradient id={`half-${questionId}-${criteriaId}-${index}`}>
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#e5e7eb" />
            </linearGradient>
          </defs>
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={filled ? '#2563eb' : halfFilled ? `url(#half-${questionId}-${criteriaId}-${index})` : '#e5e7eb'}
          />
        </svg>
      </span>
    );
  };

  return (
    <div className="star-rating">
      {[0, 1, 2, 3, 4].map(renderStar)}
      <span className="rating-value">{rating > 0 ? rating.toFixed(1) : '-'}</span>
    </div>
  );
};

export default StarRating;
