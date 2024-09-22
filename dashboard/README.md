Dodac tab "console" i tam mozna wpisywac jakie stany, synchronizacje etc
Mozna dac aktywne taby, auto refresh

Manual runs przekminic jeszcze (jako akcja?) / na filtrze "manual" :D 
Dodac tagi lokalnie / ewentualnie jakis app-helper

Mozna dodac belke z kontekstem i konifguracja (api + jwt)

Websocket

Command builder dla implementacji i walidacji
Command builder wystawi "jasny" komunikat dla serwera
Dodatkowo mamy mozliwosc pobierania danych zgodnie z JWT i autoryzacje po stronie websocketa

Mozemy wysylac sobie komandy i odbierac elegancko i tak budowac froncik

Logi sa dostepne w pierwszym tabie i debug dla appki

Przy wejsciu trzeba podac JWT z konfigiem po jakims http to bedzie trzeba ojebac albo tez ws i metode wystawic jakas sensowna

Fajnie jakby ten "workflow" co buduje "flow" dla atomu, moglbyc przeplywem, diagramem, cokolwiek i budowac zaleznosci dla FE i moc okreslac w jakim obecnym etapie jest? to juz taki mega fizcerek w sumie, ale moze byc fajny

Fajnie jakby tez budowac akcje dostepne na danym etapie

Process
  .forNamespace('ns://users/*') // activity?
  .on((userState => userState.status === 'waiting'), (commands => commands.add('accept', p => p.boolean(accepts, 'Check if you accept this account')))) // send validation to fe, sends form to fe, sends, checker for command to fe