import React, { useState } from 'react';
import './Login.css';
import { VALID_IDS, ADMIN_ID } from '../lib/supabase';

const funnyMessages = [
  "Oups ! Cet ID n'existe pas dans notre univers parallele. Demande a Brian de t'en creer un !",
  "Hmm... Cet ID est aussi introuvable que mes chaussettes le lundi matin. Contacte Brian !",
  "Erreur 404 : ID non trouve. Brian a peut-etre oublie de te donner le bon. Demande-lui !",
  "Cet ID est parti en vacances aux Bahamas. Demande a Brian de t'en donner un qui travaille !",
  "ID inconnu ! Serait-ce un test ? Si non, demande gentiment a Brian de te debloquer.",
];

const Login = ({ onLogin }) => {
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (inputId === ADMIN_ID) {
      onLogin(inputId, true);
      return;
    }

    if (VALID_IDS.includes(inputId)) {
      onLogin(inputId, false);
    } else {
      const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
      setError(randomMessage);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="login-container">
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="login-header">
          <h1>Evaluation Chatbot</h1>
          <p>Entrez votre identifiant pour acceder a l'evaluation</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="userId">Identifiant</label>
            <input
              type="text"
              id="userId"
              value={inputId}
              onChange={(e) => {
                setInputId(e.target.value);
                setError('');
              }}
              placeholder="Entrez votre ID"
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" className="login-button">
            Acceder
          </button>
        </form>

        <div className="login-footer">
          <p>Pas d'identifiant ? Demandez a Brian !</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
