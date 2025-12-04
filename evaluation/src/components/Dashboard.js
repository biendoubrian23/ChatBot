import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { getAllRatings, getDistinctUsers } from '../lib/supabase';
import benchmarkData from '../data/benchmarkData';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
  const [allRatings, setAllRatings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('all');

  const categories = [...new Set(benchmarkData.results.map(q => q.category))];
  const criteria = ['exactitude', 'completude', 'clarte'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const ratings = await getAllRatings();
    const userIds = await getDistinctUsers();
    setAllRatings(ratings);
    setUsers(userIds);
    setLoading(false);
  };

  // Calculer les stats globales
  const calculateGlobalStats = () => {
    const filteredRatings = selectedUser === 'all' 
      ? allRatings 
      : allRatings.filter(r => r.user_id === selectedUser);

    if (filteredRatings.length === 0) return { global: 0, count: 0 };

    const total = filteredRatings.reduce((sum, r) => sum + r.rating, 0);
    return {
      global: (total / filteredRatings.length).toFixed(2),
      count: filteredRatings.length
    };
  };

  // Stats par utilisateur
  const getUserStats = () => {
    return users.map(userId => {
      const userRatings = allRatings.filter(r => r.user_id === userId);
      const total = userRatings.reduce((sum, r) => sum + r.rating, 0);
      const avg = userRatings.length > 0 ? total / userRatings.length : 0;
      
      const questionsEvaluated = new Set(userRatings.map(r => r.question_id)).size;
      
      return {
        userId,
        average: parseFloat(avg.toFixed(2)),
        totalRatings: userRatings.length,
        questionsEvaluated
      };
    });
  };

  // Stats par critère
  const getCriteriaStats = () => {
    const filteredRatings = selectedUser === 'all' 
      ? allRatings 
      : allRatings.filter(r => r.user_id === selectedUser);

    return criteria.map(c => {
      const criteriaRatings = filteredRatings.filter(r => r.criteria === c);
      const total = criteriaRatings.reduce((sum, r) => sum + r.rating, 0);
      const avg = criteriaRatings.length > 0 ? total / criteriaRatings.length : 0;
      
      return {
        criteria: c.charAt(0).toUpperCase() + c.slice(1),
        moyenne: parseFloat(avg.toFixed(2)),
        fullMark: 5
      };
    });
  };

  // Stats par catégorie
  const getCategoryStats = () => {
    const filteredRatings = selectedUser === 'all' 
      ? allRatings 
      : allRatings.filter(r => r.user_id === selectedUser);

    return categories.map(cat => {
      const categoryQuestions = benchmarkData.results.filter(q => q.category === cat).map(q => q.id);
      const categoryRatings = filteredRatings.filter(r => categoryQuestions.includes(r.question_id));
      const total = categoryRatings.reduce((sum, r) => sum + r.rating, 0);
      const avg = categoryRatings.length > 0 ? total / categoryRatings.length : 0;
      
      return {
        category: cat,
        moyenne: parseFloat(avg.toFixed(2))
      };
    });
  };

  // Stats par question (pour le tableau détaillé)
  const getQuestionStats = () => {
    const filteredRatings = selectedUser === 'all' 
      ? allRatings 
      : allRatings.filter(r => r.user_id === selectedUser);

    return benchmarkData.results.map(q => {
      const questionRatings = filteredRatings.filter(r => r.question_id === q.id);
      
      const stats = {};
      criteria.forEach(c => {
        const cRatings = questionRatings.filter(r => r.criteria === c);
        stats[c] = cRatings.length > 0 
          ? (cRatings.reduce((sum, r) => sum + r.rating, 0) / cRatings.length).toFixed(1)
          : '-';
      });

      const allValues = questionRatings.map(r => r.rating);
      const avg = allValues.length > 0 
        ? (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(2)
        : '-';

      return {
        id: q.id,
        label: q.label,
        category: q.category,
        ...stats,
        moyenne: avg,
        evaluators: new Set(questionRatings.map(r => r.user_id)).size
      };
    });
  };

  // Comparaison entre utilisateurs
  const getUserComparisonData = () => {
    return criteria.map(c => {
      const dataPoint = { criteria: c.charAt(0).toUpperCase() + c.slice(1) };
      
      users.forEach(userId => {
        const userCriteriaRatings = allRatings.filter(r => r.user_id === userId && r.criteria === c);
        const avg = userCriteriaRatings.length > 0 
          ? userCriteriaRatings.reduce((sum, r) => sum + r.rating, 0) / userCriteriaRatings.length
          : 0;
        dataPoint[`User ${userId}`] = parseFloat(avg.toFixed(2));
      });
      
      return dataPoint;
    });
  };

  const globalStats = calculateGlobalStats();
  const userStats = getUserStats();
  const criteriaStats = getCriteriaStats();
  const categoryStats = getCategoryStats();
  const questionStats = getQuestionStats();
  const userComparisonData = getUserComparisonData();

  const colors = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c'];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement des donnees...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1>Dashboard Admin</h1>
          <span className="admin-badge">ID 1000</span>
        </div>
        <div className="dashboard-actions">
          <button onClick={loadData} className="btn btn-refresh">
            Actualiser
          </button>
          <button onClick={onLogout} className="btn btn-logout">
            Deconnexion
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Filtre utilisateur */}
        <div className="filter-bar">
          <label>Filtrer par evaluateur :</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="all">Tous les evaluateurs</option>
            {users.map(u => (
              <option key={u} value={u}>Evaluateur {u}</option>
            ))}
          </select>
        </div>

        {/* Stats globales */}
        <section className="stats-overview">
          <div className="stat-card primary">
            <span className="stat-value">{globalStats.global}</span>
            <span className="stat-label">Note Globale /5</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Evaluateurs</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{globalStats.count}</span>
            <span className="stat-label">Evaluations</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{benchmarkData.results.length}</span>
            <span className="stat-label">Questions</span>
          </div>
        </section>

        {/* Graphiques principaux */}
        <div className="charts-grid">
          {/* Notes par utilisateur */}
          <div className="chart-card">
            <h3>Moyenne par Evaluateur</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="userId" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="average" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar par critère */}
          <div className="chart-card">
            <h3>Scores par Critere</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={criteriaStats}>
                <PolarGrid />
                <PolarAngleAxis dataKey="criteria" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Radar name="Moyenne" dataKey="moyenne" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Notes par catégorie */}
          <div className="chart-card">
            <h3>Moyenne par Categorie</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="moyenne" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparaison utilisateurs */}
          <div className="chart-card">
            <h3>Comparaison Evaluateurs par Critere</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="criteria" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {users.map((u, i) => (
                  <Bar key={u} dataKey={`User ${u}`} fill={colors[i % colors.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tableau détaillé */}
        <section className="details-section">
          <h3>Detail par Question</h3>
          <div className="table-container">
            <table className="details-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Question</th>
                  <th>Categorie</th>
                  <th>Exactitude</th>
                  <th>Completude</th>
                  <th>Clarte</th>
                  <th>Moyenne</th>
                  <th>Evaluateurs</th>
                </tr>
              </thead>
              <tbody>
                {questionStats.map(q => (
                  <tr key={q.id}>
                    <td>{q.id}</td>
                    <td>{q.label}</td>
                    <td>
                      <span className={`category-badge cat-${q.category.toLowerCase()}`}>
                        {q.category}
                      </span>
                    </td>
                    <td>{q.exactitude}</td>
                    <td>{q.completude}</td>
                    <td>{q.clarte}</td>
                    <td className="avg-cell">{q.moyenne}</td>
                    <td>{q.evaluators}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Stats par utilisateur */}
        <section className="user-stats-section">
          <h3>Resume par Evaluateur</h3>
          <div className="user-cards">
            {userStats.map((u, i) => (
              <div key={u.userId} className="user-stat-card">
                <div className="user-avatar" style={{ backgroundColor: colors[i % colors.length] }}>
                  {u.userId}
                </div>
                <div className="user-info">
                  <span className="user-score">{u.average}/5</span>
                  <span className="user-detail">{u.questionsEvaluated} questions evaluees</span>
                  <span className="user-detail">{u.totalRatings} notes au total</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
