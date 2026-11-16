# Carnet de cabinet

Application web de facturation pour praticiens (dentistes, généralistes, spécialistes), montants en DA : tableau de bord, factures et règlements, catalogue de prestations propre à chaque praticien, impression A4, export Excel, synchronisation entre appareils.

- Application : https://nassim-gitmtl.github.io/Cabinet-dentaire/
- Sur iPhone : ouvrir dans Safari, Partager, « Sur l'écran d'accueil », puis toujours lancer depuis l'icône.
- Chaque praticien crée son compte dans l'application et ne voit que ses propres données.

## Mise en service (une seule fois, dans Supabase)

1. SQL Editor : exécuter `supabase.sql`.
2. Authentication → Sign In / Providers : laisser « Allow new users to sign up » activé.
3. Authentication → URL Configuration : mettre l'adresse de l'application dans « Site URL » et dans « Redirect URLs » (liens de confirmation et de mot de passe oublié).
4. E-mails : soit désactiver « Confirm email » (inscription immédiate), soit brancher un service SMTP ; l'envoi intégré de Supabase est très limité.

Après une mise à jour de l'application, réexécuter `supabase.sql` : le script peut être relancé sans risque et ajoute ce qui manque (dernier ajout : le journal des factures).

## Fonctionnement des données

- Connexion obligatoire à l'ouverture. Ensuite l'application s'ouvre aussi sans réseau sur l'appareil.
- Les saisies sont enregistrées sur l'appareil puis envoyées au compte ; hors connexion, elles partent au retour du réseau.
- Même fiche modifiée sur deux appareils : la modification la plus récente l'emporte.
- Se déconnecter retire les données de l'appareil ; elles reviennent à la reconnexion.
- Une facture supprimée est archivée, jamais effacée. Le serveur tient un journal (création, modification, suppression, restauration) que l'application peut lire mais pas modifier : Factures → Archives.
- La synchronisation n'est pas une sauvegarde : exporter régulièrement depuis Prestations → Données et sauvegarde.

## Fichiers

- `index.html`, `sw.js`, `apple-touch-icon.png` : l'application publiée.
- `src/app.html` : source ; `node src/build.js` régénère `index.html`.
- `src/test.js`, `src/test-sync.js` : tests navigateur, avec `src/mock-supabase.js` sur le port 8766 et un serveur statique sur le port 8765.
