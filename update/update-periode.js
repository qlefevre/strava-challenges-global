
const axios = require('axios');
const fs = require('fs-extra');

// Fonction pour extraire les dates (comme défini précédemment)
function extractDates(dateRange) {
    const months = {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
        "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
    };

    const [start, end] = dateRange.split(" to ");

    function parseDate(dateStr) {
        const [month, date, year] = dateStr.split(" ");
        return `${parseInt(year)}-${months[month]}-${parseInt(date)}`;
    }

    const startDate = parseDate(start);
    const endDate = parseDate(end);

    return {
        startDate,
        endDate
    };
}

function transformJsonOneObjectPerLine(inputJsonText) {
    const challengesArray = JSON.parse(inputJsonText);
    const challengesJson = challengesArray.map(obj => JSON.stringify(obj)).join(',\r\n');
    return `[\r\n${challengesJson}\r\n]`;
}

// Charger le JSON depuis le lien
const challengesFile = 'challenges.json';
const updateDate = fs
  .readJson(challengesFile)
    .then(data => {
        // Ajouter startDate et endDate à chaque challenge
        data= data.map(challenge => {
            const extractedDates = extractDates(challenge.period);
            return {
                ...challenge,
                startDate: extractedDates.startDate,
                endDate: extractedDates.endDate
            };
        });

        let json = JSON.stringify(data);
        json = transformJsonOneObjectPerLine(json);

        // Sauvegarder le fichier JSON mis à jour
        fs.writeFile('updated_challenges.json',json , (err) => {
            if (err) {
                console.error('Erreur lors de la sauvegarde du fichier JSON:', err);
            } else {
                console.log('Le fichier JSON a été mis à jour et sauvegardé sous "updated_challenges.json".');
            }
        });
    })
    .catch(error => console.error('Erreur lors du chargement du JSON:', error));
