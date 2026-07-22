#!/bin/sh
# Un Volume Railway monté sur /storage appartient à root par défaut, quels
# que soient les droits fixés dans l'image au moment du build — il faut donc
# corriger la propriété à chaque démarrage du conteneur (encore root ici),
# puis passer la main au process applicatif sous l'utilisateur non-root.
set -e

chown -R stockgo:stockgo /storage

exec su-exec stockgo /app/server
