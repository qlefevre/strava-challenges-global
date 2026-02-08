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
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en;q=0.8,en-US;q=0.5,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'keep-alive',
    'Cookie': 'sp=af39222e-de43-4953-846a-96b6d2717baa; iterableEndUserId=qlefevre%40gmail.com; globalHeatmapAboutModal=true; _strava_cbv3=true; _strava_cpra=opted_out; CookieConsent={stamp:%27JF1BlMmicaH7oY2UaAIErFsbGcumN9Nk3waAQxcgqrg4VhDrwOmjZg==%27%2Cnecessary:true%2Cpreferences:true%2Cstatistics:true%2Cmarketing:false%2Cmethod:%27explicit%27%2Cver:2%2Cutc:1765222520311%2Cregion:%27fr%27}; fbm_284597785309=base_domain=.www.strava.com; _sp_ses.047d=*; _currentH=d3d3LnN0cmF2YS5jb20=; _strava4_session=6egmdfi9q46aouf853t0fjeog25i7k7; g_state={"i_l":0,"i_ll":1770544408841,"i_b":"26qUf7d4OILRVEPY52sQtXmiK9NIxtFP33REgqLrXLs","i_e":{"enable_itp_optimization":0}}; _ga_12345=GS2.1.s1770547012$o1$g0$t1770547012$j60$l0$h495009092; _tt_enable_cookie=1; _ttp=01KGYD6S52WE11PV57QET6C19X_.tt.1; ttcsid=1770547012775::YKqFhbyXzuAnQDX-s2XA.1.1770547022783.0; ttcsid_CRCAPDJC77UE5B95LUQG=1770547012774::_VicJa4WJCuZ9u5ivGv4.1.1770547022787.1; _sp_id.047d=d6034b99-1c1c-4309-bad9-c8a606568edb.1752955704.96.1770547583.1769613947.a10e4d9d-018e-4fae-91f5-b942663e6c3a',
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

	const segment = summary?.segment?.destinationUrl || null;

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
            endDate: extractedDates.endDate,
	    segment
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

                let jsonString = text.match(/data-react-props='(.*?(?=' style))'/)[1];
                let decodedString = jsonString
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&");
          
                let jsonObject;
                try {
                    //console.log(decodedString);
                    jsonObject = JSON.parse(decodedString);
                } catch (e) {
                    console.error("Erreur de parsing JSON :", e);
                    return; // ou gérer l'erreur autrement
                }

                var challengeIdColor = `${challengeId}`.red;
                // ont un challengeId défini
                // n'ont pas de club défini OU ont un club dont le nom ne contient pas "The Strava Club"
                if (jsonObject.challengeId) {
                    if (!jsonObject.club?.name || 
                        (jsonObject.club?.name && !jsonObject.club.name.includes("The Strava Club") && !jsonObject.club.name.includes("Team Runna"))
                    ) {
                        challengeIdColor = `${challengeId}`.brightGreen;
                        // C'est un challenge officiel
                    } else if (jsonObject.club?.name && (jsonObject.club.name.includes("The Strava Club") || jsonObject.club.name.includes("Team Runna"))) {
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
