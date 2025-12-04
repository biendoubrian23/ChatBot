import React, { useState, useEffect } from 'react';
import benchmarkData from './data/benchmarkData';
import QuestionCard from './components/QuestionCard';
import Summary from './components/Summary';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { saveRating, getUserRatings } from './lib/supabase';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [ratings, setRatings] = useState({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  const categories = [...new Set(benchmarkData.results.map(q => q.category))];

  // Vérifier si déjà connecté
  useEffect(() => {
    const savedUserId = localStorage.getItem('evaluation-userId');
    const savedIsAdmin = localStorage.getItem('evaluation-isAdmin') === 'true';
    if (savedUserId) {
      setUserId(savedUserId);
      setIsAdmin(savedIsAdmin);
      setIsLoggedIn(true);
    }
  }, []);

  // Charger les notes depuis Supabase quand connecté
  useEffect(() => {
    const loadRatings = async () => {
      setLoading(true);
      const userRatings = await getUserRatings(userId);
      setRatings(userRatings);
      setLoading(false);
    };
    
    if (isLoggedIn && userId && !isAdmin) {
      loadRatings();
    }
  }, [isLoggedIn, userId, isAdmin]);



  const handleLogin = (id, admin) => {
    setUserId(id);
    setIsAdmin(admin);
    setIsLoggedIn(true);
    localStorage.setItem('evaluation-userId', id);
    localStorage.setItem('evaluation-isAdmin', admin.toString());
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUserId(null);
    setRatings({});
    localStorage.removeItem('evaluation-userId');
    localStorage.removeItem('evaluation-isAdmin');
  };

  const handleRatingChange = async (questionId, criteriaId, value) => {
    // Mise à jour locale immédiate
    setRatings(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [criteriaId]: value
      }
    }));

    // Sauvegarde dans Supabase
    await saveRating(userId, questionId, criteriaId, value);
  };

  const handleExport = () => {
    const exportData = {
      export_date: new Date().toISOString(),
      user_id: userId,
      benchmark_info: benchmarkData.benchmark_info,
      evaluations: benchmarkData.results.map(q => ({
        id: q.id,
        category: q.category,
        label: q.label,
        question: q.question,
        ratings: ratings[q.id] || {}
      })),
      summary: {
        global_score: calculateGlobalScore(),
        by_criteria: {
          exactitude: calculateCriteriaScore('exactitude'),
          completude: calculateCriteriaScore('completude'),
          clarte: calculateCriteriaScore('clarte')
        },
        by_category: categories.reduce((acc, cat) => {
          acc[cat] = calculateCategoryScore(cat);
          return acc;
        }, {})
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation_mistral_user${userId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculateGlobalScore = () => {
    let total = 0;
    let count = 0;
    Object.values(ratings).forEach(questionRatings => {
      ['exactitude', 'completude', 'clarte'].forEach(c => {
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
    const categoryQuestions = benchmarkData.results.filter(q => q.category === category);
    let total = 0;
    let count = 0;
    categoryQuestions.forEach(q => {
      const questionRatings = ratings[q.id] || {};
      ['exactitude', 'completude', 'clarte'].forEach(c => {
        if (questionRatings[c] > 0) {
          total += questionRatings[c];
          count++;
        }
      });
    });
    return count > 0 ? (total / count).toFixed(2) : '-';
  };

  const filteredQuestions = filterCategory === 'all'
    ? benchmarkData.results
    : benchmarkData.results.filter(q => q.category === filterCategory);

  // Page de login
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Dashboard admin
  if (isAdmin) {
    return <Dashboard onLogout={handleLogout} />;
  }

  // Interface d'évaluation
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <h1>Evaluation Chatbot</h1>
            <span className="model-badge">Mistral</span>
            <span className="user-badge">ID: {userId}</span>
          </div>
          <div className="header-right">
            <p className="header-subtitle">
              Benchmark du {new Date(benchmarkData.benchmark_info.date).toLocaleDateString('fr-FR')} - {benchmarkData.benchmark_info.total_questions} questions
            </p>
            <button className="logout-btn" onClick={handleLogout}>
              Deconnexion
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement de vos evaluations...</p>
        </div>
      ) : (
        <main className="main">
          <section className="criteria-info">
            <h3>Criteres d'evaluation</h3>
            <div className="criteria-grid">
              <div className="criteria-card">
                <h4>Exactitude</h4>
                <p>La reponse est-elle factuellement correcte ? Correspond-elle a la reponse attendue ?</p>
              </div>
              <div className="criteria-card">
                <h4>Completude</h4>
                <p>La reponse couvre-t-elle tous les aspects de la question ? Manque-t-il des informations ?</p>
              </div>
              <div className="criteria-card">
                <h4>Clarte</h4>
                <p>La reponse est-elle claire, bien structuree et facile a comprendre ?</p>
              </div>
            </div>
          </section>

          <Summary ratings={ratings} questions={benchmarkData.results} />

          <section className="questions-section">
            <div className="questions-header">
              <h3>Questions ({filteredQuestions.length})</h3>
              <div className="filters">
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Toutes les categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="questions-list">
              {filteredQuestions.map(question => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  ratings={ratings[question.id] || {}}
                  onRatingChange={handleRatingChange}
                />
              ))}
            </div>
          </section>

          <div className="actions">
            <button className="btn btn-primary" onClick={handleExport}>
              Exporter mes resultats
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
