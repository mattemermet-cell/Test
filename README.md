# Maybach S 680 — Immersion

Site one-page immersif, piloté au scroll, autour de la Mercedes-Maybach S 680. Projet démo non officiel.

## Lancer

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Séquences

1. **Hero** : macro de l'emblème Maybach (reflet qui suit la souris), puis la voiture se construit : plan filaire, balayage laser avec étincelles, révélation de la photo et compteur d'assemblage.
2. **Écran noir** : fiche technique animée (V12, 612 ch, 900 Nm, 4,5 s, empattement 3 396 mm).
3. **Tour de la voiture** : vidéo pilotée par le scroll, avec annotations et cadran.
4. **Entrée dans l'habitacle** : vidéo de la porte arrière jusqu'à l'intérieur, cuir nappa blanc, ciel étoilé animé en canvas (étoiles filantes), parallaxe à la souris.
5. **Univers** : détail des jantes, rotation 360° au glisser, galerie horizontale, fiche complète.
6. **Étoile Mercedes errante** : elle se balade au hasard, fuit le curseur et explose en mini-étoiles au clic.

## Médias

Images (Nano Banana 2) et vidéos (MiniMax H3 Max) générées avec Higgsfield. Les URL sont dans `js/media.js` (CDN Higgsfield). Pour les héberger en local, télécharge les fichiers dans `assets/` et remplace les URL.

GSAP 3.12.5, ScrollTrigger et Lenis 1.1.13 sont inclus dans `js/vendor/`.
