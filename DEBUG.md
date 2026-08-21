# Chaque année

- Mettre à jour la date en bas de page
- Ne pas oublier d'ajouter l'année dans les challenges passés

# En cours de vie 

Suite à l'évolution du produit vérifier l'arrivée de nouveau "Club Strava", exemple le rachat de Runna
 - The Strava Club (231407)
 - Team Runna (886292)

# Si le script update-challenge.js ne fonctionne plus

Vérifier si le résultat json extrait depuis la page html contient bien le même contenu entre le script et un accès direct depuis le naviagateur.
Dans les derniers cas, ce n'était pas le script en cause, mais les http request headers qui étaient en cause comme:
- User-Agent
- Accept
- Cookie

# Si les challenges NYRR n'apparaissent plus

Le challenge NYRR "Virtual New Balance 5th Avenue Mile" apparait en septembre 2026 avec un id 5527, quand les ids actuellement attribués sont dans les 6300 
refaire un full scan de update challenge 500 challenges en arrière