# security-reports/

Sorties de `../security-audit.sh`, à la racine du repo.

```
./security-audit.sh            # audit complet (statique + live)
./security-audit.sh --static   # SAST, secrets, dépendances (aucune requête réseau)
./security-audit.sh --live     # headers HTTP + TLS contre les domaines en prod (lecture seule)
```

- `raw/` — sortie brute de chaque outil (non versionné, régénéré à chaque run)
- `SUMMARY.md`, `dashboard.html` — décompte mécanique par sévérité, **avant triage humain** (compte aussi les faux positifs)
- `SECURITY-REPORT.md`, `SECURITY-REPORT.html` — rapport final, après vérification manuelle de chaque finding (celui à lire)

Volontairement absents de l'audit : OWASP ZAP / Nuclei (scanners actifs — le
backend local pointe sur la vraie base de production, pas de staging),
SonarQube (nécessite un serveur dédié), Dockle (nécessite un daemon Docker,
absent de cette machine), kube-bench (pas de Kubernetes dans ce projet).
