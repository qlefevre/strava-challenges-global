const axios = require('axios');
const fs = require('fs-extra');
const colors = require('colors');

const monthMap = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12'
};

// Set custom headers to mimic a Chrome browser request
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en;q=0.8,en-US;q=0.5,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'keep-alive',
    'Cookie': 'cf_clearance=II.E60N50BHvpFFYtlcrPM_S1eG0Oiaa5obxoIFOMWg-1720528084-1.0.1.1-dCdp8T4qnFgWPDQJ2jupxAOcqLgbRxc14qG1YRvuWjHtPUV3RYms2GUJAjwtdKtL.So7mymyt_WI0dDqmL.kmA',
};

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

function transformJson(inputJson) {
    return inputJson.map(item => {
        const {
            challengeId,
            header,
            club,
            summary,
            sections
        } = item;

	// Vérifiez si les objets header, club et summary existent avant de déstructurer leurs propriétés
        const coverImageUrl = header?.coverImageUrl || '';
        const challengeLogoUrl = header?.challengeLogoUrl || '';
        const name = header?.name || 'Unknown Name';
        const subtitle = header?.subtitle || 'Unknown Subtitle';

        const clubId = club?.id || 'Unknown Club ID';
        const clubName = club?.name || 'Unknown Club Name';

        const periodWithDaysLeft = summary?.calendar?.title || 'Unknown Period';


        const qualifyingActivitiesSection = sections.find(section =>
            section.content.some(content => content.key === "qualifyingActivities")
        );

        let qualifyingActivities = [];
        if (qualifyingActivitiesSection) {
            const qualifyingActivitiesContent = qualifyingActivitiesSection.content.find(content => content.key === "qualifyingActivities");
            if (qualifyingActivitiesContent) {
                qualifyingActivities = qualifyingActivitiesContent.qualifyingActivities.map(activity => activity.activityType);
            }
        }

        let periodWithDaysLeft0 = periodWithDaysLeft;
        if (periodWithDaysLeft0.includes('Ended')) {
            let parts = periodWithDaysLeft0.split('—');
            periodWithDaysLeft0 = parts[1].trim();
        }
        let parts = periodWithDaysLeft0.split('—');
        let period = parts[0].trim();

        const extractedDates = extractDates(period);

        return {
            challengeId,
            coverImageUrl,
            challengeLogoUrl,
            name,
            subtitle,
            clubId,
            clubName,
            qualifyingActivities,
            period,
            startDate: extractedDates.startDate,
            endDate: extractedDates.endDate
        };
    });
}

function transformJsonOneObjectPerLine(inputJsonText) {
    const challengesArray = JSON.parse(inputJsonText);
    const challengesJson = challengesArray.map(obj => JSON.stringify(obj)).join(',\r\n');
    return `[\r\n${challengesJson}\r\n]`;
}


function challengeUrl(challengeId) {

    // Paramètre date de l'url
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const paramDate = `t=${year}${month}${day}`;

    // Challenge url
    const url = `https://www.strava.com/challenges/${challengeId}?${paramDate}`;;

    return url;
}

async function findChallengeUrls(lastIds, endId) {
 
    const validJsonObjects = [];
    const challengeIdEnd = lastIds[lastIds.length-1] +Number(endId);
    console.log('Search up to challenge ID: '+`${challengeIdEnd}`.cyan);

    for (let challengeId = lastIds[0]; challengeId <= challengeIdEnd; challengeId++) {
        if(lastIds.includes(challengeId)){
            console.log(`${challengeId}`.cyan+' already known')
            continue;
        }
        const url = challengeUrl(challengeId);
 
        try {
            const response = await axios.get(url, { 
                headers:headers 
            });
            if (response.status === 200) {
                const text = response.data;

                let jsonString = text.match(/data-react-props='(.*)'/)[1];
                let decodedString = jsonString.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
		console.log(decodedString);
                let jsonObject = JSON.parse(decodedString);

                var challengeIdColor = `${challengeId}`.red;
                // ont un challengeId défini
                // n'ont pas de club défini OU ont un club dont le nom ne contient pas "The Strava Club"
                if (jsonObject.challengeId) {
                    if (!jsonObject.club?.name || (jsonObject.club?.name && !jsonObject.club.name.includes("The Strava Club"))) {
                        challengeIdColor = `${challengeId}`.brightGreen;
                        // C'est un challenge officiel
                    } else if (jsonObject.club?.name && jsonObject.club.name.includes("The Strava Club")) {
                        challengeIdColor = `${challengeId}`.brightMagenta;
                    }
                    validJsonObjects.push(jsonObject);
                    
                }
            }
            console.log(challengeIdColor+' '+challengeUrl(challengeId))
        } catch (error) {
            console.error(`Error accessing ${url}: ${error}`);
        }
    }

    return validJsonObjects;
}

/**
 * Returns an array containing last nth challenge ids
 *
 * @param {*} challengesFile json file containing challenges 
 * @param {*} lastNthIds last nth challenge ids
 * @returns an array containing last nth challenge ids
 */
async function getLastChallengeIds(challengesFile, lastNthIds){
    // Using promise chaining
  const lastChallengeIds = await fs
  .readJson(challengesFile)
  .then((challenges) => {
    return challenges.slice(-lastNthIds).map(n => n.challengeId);
  })
  .catch((error) => {
    console.log(error);
  });
  return lastChallengeIds;
}

// Fusionne les 2 tableaux contenant des challenges
async function mergeChallenges(inputFile,newChallenges){
    // Using promise chaining
  const challenges = await fs
  .readJson(inputFile)
  .catch((error) => {
    console.log(error);
  });
  let mergedArray = [...challenges,...newChallenges];
  mergedArray.sort((a, b) => a.challengeId - b.challengeId);
  return mergedArray;
}

async function main() {
    
    const args = process.argv.slice(2);
    const inputFile = args[0];
    const outputFile = args[1];
    const lastNthIds = args[2]
    const upToNIds = args[3];

    let th = lastNthIds == 1 ? 'st' : lastNthIds == 2 ? 'nd' : lastNthIds == 3 ? 'rd' : 'th';

    console.log('Input file: '+`${inputFile}`.cyan);
    console.log('Output file: '+`${outputFile}`.cyan);
    console.log('Search from the '+`${lastNthIds}${th}`.cyan+' previous challenge ID to the next '+`${upToNIds}`.cyan+' challenge IDs.');
    const lastChallengeIds = await getLastChallengeIds(inputFile,lastNthIds);
    console.log('Last known challenge ID: '+`${lastChallengeIds}`.cyan);

    let validJsonObjects = await findChallengeUrls(lastChallengeIds,upToNIds);
    let newChallengesFound = validJsonObjects.length;
    if (newChallengesFound === 0) {
        console.log('No valid challenge URLs found.'.yellow);
    } else {
        
        validJsonObjects = transformJson(validJsonObjects);
        const jsonResults = JSON.stringify(await mergeChallenges(inputFile,validJsonObjects));
        const prettyJsonChallenges = transformJsonOneObjectPerLine(jsonResults);

        await fs.writeFile(outputFile, prettyJsonChallenges);
        console.log(`${newChallengesFound}`.green+' new challenge URLs found');
        console.log(`JSON data saved to ${outputFile}`.green);
    }
}

main();
