# Mon Plan de Course — PWA

Application web (PWA) pour suivre ton plan d'entraînement de course à pied jour par jour, sous forme de calendrier, jusqu'au jour de la course.

## Fonctionnalités

- Calendrier mensuel avec un point de couleur par type de séance (endurance, fractionné, repos, course, autre)
- Fiche détaillée par jour : distance, temps, allure (calculée automatiquement si non renseignée), exercices spécifiques (texte libre pour décrire un fractionné, des répétitions, de la récupération, etc.)
- Compte à rebours jusqu'au jour de la course, réglable dans les paramètres
- Carte "prochaine séance" toujours visible en haut
- Sauvegarde locale automatique (aucune connexion ni compte requis)
- Export / import des données en JSON (pour sauvegarder ou transférer vers un autre appareil)
- Fonctionne hors-ligne une fois installée (service worker)

## Installer sur iPhone

Une PWA doit être servie en HTTPS pour être installable proprement (sauf en local). Le moyen le plus simple et gratuit : **GitHub Pages**, puisque le projet est déjà sur GitHub.

### 1. Activer GitHub Pages

Dans le repo GitHub : **Settings → Pages → Branch**, choisis la branche `claude/ios-running-plan-tracker-svxc4v` (ou `main` après fusion) et le dossier `/ (root)`. GitHub te donnera une URL du type :

```
https://thibaultc71.github.io/test_manim/
```

### 2. Ouvrir dans Safari sur iPhone

Ouvre cette URL dans **Safari** (obligatoire, pas Chrome) sur ton iPhone.

### 3. Ajouter à l'écran d'accueil

Bouton **Partager** (carré avec flèche) → **Sur l'écran d'accueil** → **Ajouter**.

L'app apparaît alors comme une vraie application, avec son icône, en plein écran (sans barre Safari), et fonctionne hors-ligne.

## Développement local

```bash
python3 -m http.server 8000
```

Puis ouvre `http://localhost:8000` dans un navigateur.

## Structure du projet

```
index.html          Structure de l'app (calendrier, fiche séance, réglages)
styles.css           Styles (thème clair/sombre automatique, look iOS)
app.js               Logique : état, stockage local, rendu du calendrier
manifest.json        Manifeste PWA (nom, icônes, mode standalone)
service-worker.js    Cache pour le fonctionnement hors-ligne
icons/               Icônes de l'app (192, 512, apple-touch-icon)
```

## Limites actuelles / pistes d'évolution

- Les séances s'ajoutent manuellement via le formulaire (pas encore d'import automatique depuis une photo — nécessiterait de l'OCR, envisageable en V2)
- Les données sont stockées uniquement sur l'appareil (localStorage) ; pas de synchronisation multi-appareils pour l'instant (export/import JSON en attendant)
- Pas d'intégration Apple Santé / Apple Watch (nécessiterait de passer en app native ou React Native)
