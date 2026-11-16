# Carnet dentaire

Application web de facturation pour cabinet dentaire (montants en DA) : tableau de bord, factures, catalogue de prestations, impression A4, synchronisation entre appareils.

- Application : https://nassim-gitmtl.github.io/Cabinet-dentaire/
- Sur iPhone : ouvrir dans Safari, Partager, « Sur l'écran d'accueil », puis toujours lancer depuis l'icône.

## Mise en service (une seule fois, dans Supabase)

1. SQL Editor : exécuter `supabase.sql`.
2. Authentication → Users → Add user : créer le compte du cabinet, « Auto confirm user » coché.
3. Authentication → Sign In / Providers : désactiver « Allow new users to sign up ».

Mot de passe oublié : le changer dans Authentication → Users.

## Fonctionnement des données

- Connexion obligatoire à l'ouverture. Ensuite l'application s'ouvre aussi sans réseau sur l'appareil.
- Les saisies sont enregistrées sur l'appareil puis envoyées au compte ; hors connexion, elles partent au retour du réseau.
- Même fiche modifiée sur deux appareils : la modification la plus récente l'emporte.
- Se déconnecter retire les données de l'appareil ; elles reviennent à la reconnexion.
- La synchronisation n'est pas une sauvegarde : exporter régulièrement depuis Prestations → Données et sauvegarde.

## Fichiers

- `index.html`, `sw.js`, `apple-touch-icon.png` : l'application publiée.
- `src/app.html` : source ; `node src/build.js` régénère `index.html`.
- `src/test.js`, `src/test-sync.js` : tests navigateur, avec `src/mock-supabase.js` sur le port 8766 et un serveur statique sur le port 8765.
