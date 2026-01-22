# Migrations Supabase

Ce dossier contient toutes les migrations SQL à exécuter sur la base de données Supabase.

## Comment exécuter une migration

1. Allez dans votre [Dashboard Supabase](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Copiez-collez le contenu du fichier SQL
5. Cliquez sur **Run**

## Liste des migrations

| Fichier | Description | Date |
|---------|-------------|------|
| `001_add_allowed_domains.sql` | Ajout du support pour plusieurs domaines autorisés (max 5) | 2026-01-07 |

## Ordre d'exécution

Les migrations doivent être exécutées dans l'ordre numérique (001, 002, 003, etc.).

## Notes importantes

- **Toujours** faire un backup avant d'exécuter une migration en production
- Testez d'abord sur un environnement de développement
- Les migrations sont **idempotentes** (peuvent être exécutées plusieurs fois sans problème grâce à `IF NOT EXISTS`)
