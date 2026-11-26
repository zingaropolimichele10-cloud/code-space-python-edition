# Architettura

La radice contiene la pagina statica. `css/` gestisce la presentazione e `js/` contiene moduli per responsabilità. `workers/` ospita l’interprete in un contesto separato. Gli asset e le dipendenze runtime vengono serviti insieme alla pagina e i test risiedono in `tests/`.

Le directory game, missions, storage, teacher e audio riservano gli spazi previsti per le fasi successive. La fase 01 verifica l’esecuzione Python indipendentemente dal gioco.
