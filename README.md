# Ballance

Ein modernes, statisches Geschicklichkeitsspiel: Eine Kugel wird durch Neigen des Smartphones oder mit Tastatursteuerung durch Labyrinthe geführt. Das Spiel verwendet Matter.js für die Physik und speichert ausschließlich im `localStorage` des Browsers.

## Features

- 10 datengetriebene Level mit Fallen, Checkpoints, beweglichen Hindernissen, Teleportern und Windzonen
- Neigungssteuerung mit Glättung, Kalibrierung und iOS-Berechtigungsdialog
- Desktop-Fallback mit Pfeiltasten oder WASD
- Matter.js-Physik: Gravitation, Reibung, Trägheit und Kollisionen
- Zeit, Sterne, Bestzeiten, Fortschritt und Einstellungen dauerhaft lokal gespeichert
- Pause, Neustart, Levelauswahl, Soundregler und Vibrationsoption
- Responsives Canvas-Design, kein Build-Schritt und kein Backend

## Steuerung

Auf Mobilgeräten: Gerät neigen. Über **Kalibrieren** wird die aktuelle Haltung zur neutralen Position. iOS verlangt nach dem Start gegebenenfalls eine Sensorfreigabe.

Auf Desktop: Pfeiltasten oder `W`, `A`, `S`, `D`. `Esc` pausiert bzw. setzt fort.

## Browser

Getestet für aktuelle Chromium-Browser, Safari iOS, Samsung Internet, Edge und Firefox. Ohne verfügbare Sensoren wird automatisch auf die Tastatursteuerung hingewiesen.

## Dateien

`index.html` enthält die Oberfläche, `style.css` das responsive Design und `script.js` Spielkern und Leveldaten. Platzhalterordner unter `assets/` sind für zukünftige Sounds, Texturen und Icons vorgesehen.

## Lizenz

MIT
