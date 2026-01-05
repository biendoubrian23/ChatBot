# UI - Composants réutilisables

## Description
Composants UI de base suivant le design system minimaliste.
Ces composants sont génériques et réutilisables dans toute l'application.

---

## Design System Rappel
- Couleurs: Noir/Blanc, pas de couleurs vives
- Border-radius: 0 (angles droits)
- Shadows: Aucune ou très subtile
- Police: Inter ou system-ui
- Espacement: Généreux

---

## Composants à créer

### `button.tsx`
- [ ] Variantes: `default`, `outline`, `ghost`, `destructive`
- [ ] Tailles: `sm`, `md`, `lg`
- [ ] États: `disabled`, `loading`
- [ ] Style: fond noir, texte blanc, hover gris foncé

```tsx
<Button variant="default" size="md">Créer</Button>
<Button variant="outline">Annuler</Button>
<Button variant="destructive">Supprimer</Button>
```

---

### `input.tsx`
- [ ] Type: text, email, password, number
- [ ] États: error, disabled
- [ ] Label optionnel intégré
- [ ] Style: bordure noire fine, pas de radius

```tsx
<Input type="email" placeholder="Email" error={error} />
```

---

### `card.tsx`
- [ ] Header optionnel
- [ ] Footer optionnel
- [ ] Style: bordure fine, fond blanc

```tsx
<Card>
  <CardHeader>Titre</CardHeader>
  <CardContent>Contenu</CardContent>
</Card>
```

---

### `badge.tsx`
- [ ] Variantes: `default`, `success`, `warning`, `error`
- [ ] Pour afficher les statuts

```tsx
<Badge variant="success">Actif</Badge>
<Badge variant="error">Erreur</Badge>
```

---

### `tabs.tsx`
- [ ] Onglets horizontaux
- [ ] Indicateur de l'onglet actif
- [ ] Style minimaliste

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Aperçu</TabsTrigger>
    <TabsTrigger value="documents">Documents</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
</Tabs>
```

---

### `dialog.tsx` (Modal)
- [ ] Overlay sombre
- [ ] Contenu centré
- [ ] Bouton fermer

---

### `dropdown.tsx`
- [ ] Menu déroulant
- [ ] Items cliquables

---

### `avatar.tsx`
- [ ] Initiales ou image
- [ ] Tailles variées

---

### `spinner.tsx`
- [ ] Animation de chargement
- [ ] Tailles variées

---

### `toast.tsx`
- [ ] Notifications temporaires
- [ ] Variantes: success, error, info

---

## Étapes d'implémentation

1. [ ] Créer `button.tsx` avec toutes les variantes
2. [ ] Créer `input.tsx`
3. [ ] Créer `card.tsx`
4. [ ] Créer `badge.tsx`
5. [ ] Créer `tabs.tsx`
6. [ ] Créer `dialog.tsx`
7. [ ] Créer `spinner.tsx`
8. [ ] Créer `toast.tsx`
9. [ ] Créer `index.ts` pour exporter tous les composants
