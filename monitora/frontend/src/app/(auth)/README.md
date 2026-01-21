# (auth) - Routes d'authentification

## Description
Routes publiques pour l'authentification des utilisateurs.
Ces pages sont accessibles sans être connecté.

---

## Pages à créer

### `/login/page.tsx`
Page de connexion.

- [ ] Formulaire avec email + password
- [ ] Bouton "Se connecter"
- [ ] Lien vers "Créer un compte"
- [ ] Gestion des erreurs (email invalide, mot de passe incorrect)
- [ ] Redirection vers `/dashboard` après connexion
- [ ] Style minimaliste centré

---

### `/register/page.tsx`
Page d'inscription.

- [ ] Formulaire avec email + password + confirmation password
- [ ] Bouton "Créer un compte"
- [ ] Lien vers "Se connecter"
- [ ] Validation des champs
- [ ] Redirection vers `/login` après inscription
- [ ] Optionnel: email de confirmation

---

### `layout.tsx`
Layout commun aux pages auth.

- [ ] Centrer le contenu verticalement et horizontalement
- [ ] Logo MONITORA en haut
- [ ] Fond blanc, style épuré

---

## Intégration Supabase Auth

```typescript
// Connexion
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

// Inscription
const { data, error } = await supabase.auth.signUp({
  email,
  password
})

// Déconnexion
await supabase.auth.signOut()

// Récupérer l'utilisateur actuel
const { data: { user } } = await supabase.auth.getUser()
```

---

## Étapes d'implémentation

1. [ ] Créer `layout.tsx` avec style centré
2. [ ] Créer `/login/page.tsx` avec formulaire
3. [ ] Connecter le formulaire à Supabase
4. [ ] Gérer les erreurs et la redirection
5. [ ] Créer `/register/page.tsx`
6. [ ] Tester le flow complet
