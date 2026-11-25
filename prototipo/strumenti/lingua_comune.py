# Aiuti per le traduzioni, usati dagli script che generano il client online (patch_online, sicurezza, tempo).
# - EN_ONLINE: testi che esistono solo nella versione online (italiano -> inglese);
# - avvolgi(): "testo" -> tr("testo") per i testi che hanno una traduzione, come fa patch_lingua_ui.py sul prototipo;
# - aggiungi_en_online(): aggiunge EN_ONLINE alla tabella EN della pagina.
import json, re

EN_ONLINE = {
  # collegamento, notifiche, inviti, profilo
  "Nessuna connessione con il server. Controlla la rete e riprova.": "No connection to the server. Check the network and try again.",
  "Errore del server ({n}).": "Server error ({n}).",
  "Questo browser non supporta le notifiche. Su Android usa Chrome e installa Grimorio sulla schermata Home.": "This browser does not support notifications. On Android, use Chrome and install Grimorio on the Home screen.",
  "Notifiche non attivate: puoi abilitarle dalle impostazioni del browser.": "Notifications not enabled: you can turn them on in the browser settings.",
  "Notifiche attive: ti avviso quando tocca a te.": "Notifications on: I will let you know when it is your turn.",
  "Non riesco ad attivare le notifiche su questo dispositivo.": "I can't turn on notifications on this device.",
  "🔔 Avvisami quando tocca a me": "🔔 Notify me when it is my turn",
  "Ti sfido a Grimorio! Apri il link e siediti come Mago Rosso.": "I challenge you to Grimorio! Open the link and sit down as the Red Wizard.",
  "Link copiato: incollalo in un messaggio all'avversario.": "Link copied: paste it in a message to your opponent.",
  "Invita un amico": "Invite a friend",
  "Copia questo link e mandalo a chi vuoi sfidare:": "Copy this link and send it to whoever you want to challenge:",
  "Crea o accetta una partita: il profilo nasce lì.": "Create or accept a game: your profile starts there.",
  "Il tuo profilo": "Your profile",
  "Sei {n} su questo dispositivo.": "You are {n} on this device.",
  "Per giocare le stesse partite da un altro telefono o computer, apri lì questo link. Non mandarlo a nessuno: chi lo apre gioca al posto tuo.": "To play the same games from another phone or computer, open this link there. Don't send it to anyone: whoever opens it plays as you.",
  "Link di accesso copiato.": "Access link copied.",
  "Copia il link di accesso": "Copy the access link",
  "Accesso eseguito: bentornato, {n}.": "Signed in: welcome back, {n}.",
  "Il link di accesso non è valido.": "The access link is not valid.",
  "Se pensi che il link sia finito in mani sbagliate, crea un nuovo codice: tutti gli altri dispositivi verranno scollegati.": "If you think the link has fallen into the wrong hands, create a new code: all other devices will be signed out.",
  "Scollega gli altri dispositivi": "Sign out other devices",
  "Fatto: gli altri dispositivi sono scollegati. Questo resta collegato.": "Done: the other devices are signed out. This one stays signed in.",
  # elenco partite
  "Collegamento al server…": "Connecting to the server…",
  "Non riesco a raggiungere il server. Controlla la connessione e riprova.": "I can't reach the server. Check your connection and try again.",
  "Nessuna partita. Creane una qui sopra, oppure apri il link d'invito che ti hanno mandato.": "No games yet. Create one above, or open the invite link you were sent.",
  "Crea una partita scegliendo «Un'altra persona» e tocca «Invita un amico»: manda il link su WhatsApp o dove preferisci. Chi lo apre sceglie un nome e si siede come Mago Rosso. Ognuno gioca il proprio turno quando può; con le notifiche attive il telefono ti avvisa quando tocca a te.": "Create a game choosing “Another person” and tap “Invite a friend”: send the link on WhatsApp or wherever you like. Whoever opens it picks a name and sits down as the Red Wizard. Each of you plays your turn when you can; with notifications on, your phone tells you when it is your turn.",
  "Installa Grimorio sul telefono": "Install Grimorio on your phone",
  "In Chrome per Android apri il menu ⋮ e scegli «Aggiungi a schermata Home» (o «Installa app»). Grimorio si aprirà a tutto schermo come un'app e potrà mandarti le notifiche.": "In Chrome for Android open the ⋮ menu and choose “Add to Home screen” (or “Install app”). Grimorio will open full screen like an app and can send you notifications.",
  "Partita creata: ora tocca «Invita un amico».": "Game created: now tap “Invite a friend”.",
  "Questa partita non esiste più.": "This game no longer exists.",
  "Partita tolta dall'elenco.": "Game removed from the list.",
  # partita
  "Sei il Mago Rosso. Inizia il Mago Blu: ti avviso quando tocca a te.": "You are the Red Wizard. The Blue Wizard starts: I will let you know when it is your turn.",
  "Sei stato sfidato a Grimorio!": "You have been challenged to Grimorio!",
  "Manda il link d'invito: la partita inizia quando l'avversario si siede.": "Send the invite link: the game starts when your opponent sits down.",
  "Scegli il tuo nome e siediti come Mago Rosso.": "Choose your name and sit down as the Red Wizard.",
  "Puoi chiudere: ti avviso quando tocca a te.": "You can close the page: I will let you know when it is your turn.",
  "Siediti come Mago Rosso": "Sit down as the Red Wizard",
  "Questa partita ha già due giocatori. Se è tua, aprila dal dispositivo con cui giochi o usa il link di accesso del tuo profilo.": "This game already has two players. If it is yours, open it from the device you play on or use the access link in your profile.",
  "Togli dall'elenco": "Remove from the list",
  "Sì, elimina la partita": "Yes, delete the game",
  "Sì, abbandono (vince l'avversario)": "Yes, I give up (my opponent wins)",
  "Abbandona la partita": "Leave the game",
  # tempo per turno
  "tempo scaduto": "time is up", "1 ora": "1 hour", "{n} ore": "{n} hours", "{n} minuti": "{n} minutes",
  "Tempo scaduto: il turno sta per passare.": "Time is up: the turn is about to pass.",
  "Hai ancora {t} per giocare, poi il turno passa.": "You still have {t} to play, then the turn passes.",
  "Ha ancora {t} per giocare.": "They still have {t} to play.",
  "A distanza hai 48 ore per ogni turno: allo scadere il turno passa da solo. Chi lo lascia scadere 2 volte di fila perde la partita.": "When playing remotely you have 48 hours per turn: when time runs out the turn passes by itself. Whoever lets it run out twice in a row loses the game.",
}

NO_AUTO = {"Grimorio", "Automa", "Mago"}
FUORI = ("const REGOLE", "const NOMI", "const EL ", "const EN = ", "const LINGUE_UI", "Object.assign(EN,")

def en_pagina(s):
    i = s.index("const EN = ") + len("const EN = ")
    j = s.index("\n};", i) + 2
    return json.loads(s[i:j])

def chiavi(s=None):
    k = set(EN_ONLINE)
    if s is not None and "const EN = " in s: k |= set(en_pagina(s))
    return k

def avvolgi(testo, keys):
    righe = testo.split("\n"); in_en = False
    for i, r in enumerate(righe):
        if r.startswith("const EN = "): in_en = True
        if in_en:
            if r.startswith("}"): in_en = False
            continue
        if r.startswith(FUORI): continue
        def f(m, r=r):
            lit = m.group(1)
            if r[max(0, m.start() - 3):m.start()] == "tr(" or lit not in keys or lit in NO_AUTO: return m.group(0)
            return 'tr("' + lit + '")'
        righe[i] = re.sub(r'"((?:[^"\\]|\\.)*)"', f, r)
    return "\n".join(righe)

def aggiungi_en_online(s):
    assert "Object.assign(EN," not in s
    j = s.index("\n};", s.index("const EN = ")) + 3
    return s[:j] + "\n// testi della sola versione online\nObject.assign(EN, " + json.dumps(EN_ONLINE, ensure_ascii=False) + ");" + s[j:]
