# Avvio offline di CODE SPACE 2.0.0

Estrai l’intero ZIP. Apri un terminale nella cartella estratta che contiene index.html e lancia:

    python3 -m http.server 8000 --bind 127.0.0.1

Su Windows con il launcher Python usa py -3 -m http.server 8000 --bind 127.0.0.1. Serve Python 3 già disponibile sulla macchina che ospita il server. Apri http://127.0.0.1:8000/ in un browser. La scheda e il server devono restare aperti durante la lezione. Il gioco funziona tramite HTTP anche senza collegamento a Internet.

Per un server condiviso, usa --bind 0.0.0.0 solo se il referente IT autorizza il servizio sulla LAN. Le altre macchine aprono http://INDIRIZZO_IPV4_DEL_SERVER:8000/. Verifica firewall, porte e raggiungibilità in anticipo. Una copia per singola postazione resta il piano di riserva. Chiudi il server al termine con Ctrl+C.
