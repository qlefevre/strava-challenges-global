const axios = require('axios');
const fs = require('fs-extra');

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
    'Host': 'corsproxy.io',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'DNT': '1',
    'Sec-GPC': '1',
    'Connection': 'keep-alive',
    'Cookie': 'cf_clearance=II.E60N50BHvpFFYtlcrPM_S1eG0Oiaa5obxoIFOMWg-1720528084-1.0.1.1-dCdp8T4qnFgWPDQJ2jupxAOcqLgbRxc14qG1YRvuWjHtPUV3RYms2GUJAjwtdKtL.So7mymyt_WI0dDqmL.kmA',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Priority': 'u=1',
    'TE': 'trailers',
};


function transformJson(inputJson) {
    return inputJson.map(item => {
        const {
            challengeId,
            header: { coverImageUrl, challengeLogoUrl, name, subtitle },
            club: { id: clubId, name: clubName },
            summary: { calendar: { title: periodWithDaysLeft } },
            sections
        } = item;

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
        let yearMatch = periodWithDaysLeft0.match(/\b\d{4}\b/);
        let year = yearMatch[0];
        let monthMatch = periodWithDaysLeft0.match(/\b[A-Za-z]{3}\b/);
        let month = monthMap[monthMatch[0]];
        let dayMatch = periodWithDaysLeft0.match(/\b\d{1,2}\b/);
        let day = dayMatch[0];

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
            year,
            month,
            day
        };
    });
}

function transformJsonOneObjectPerLine(inputJsonText) {
    const challengesArray = JSON.parse(inputJsonText);
    const challengesJson = challengesArray.map(obj => JSON.stringify(obj)).join(',\r\n');
    return `[\r\n${challengesJson}\r\n]`;
}

function getParamCurrentDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `t=${year}${month}${day}`;
}

async function findChallengeUrls(start = 4521, end = 4530) {
    const proxyCorsUrl = 'https://corsproxy.io/?';
    const baseUrl = 'https://www.strava.com/challenges/';
    const validJsonObjects = [];
    const paramDate = getParamCurrentDate();

    for (let challengeId = start; challengeId <= end; challengeId++) {
        const url = `${baseUrl}${challengeId}?${paramDate}`;
        const proxyUrl = `${proxyCorsUrl}` + encodeURIComponent(url);
        console.log(proxyUrl);
        try {
            const response = await axios.get(proxyUrl, { 
                headers:headers 
            });
            if (response.status === 200) {
                const text = response.data;

                let jsonString = text.match(/data-react-props='(.*)'/)[1];
                let decodedString = jsonString.replace(/&quot;/g, '"').replace(/&#39;/g, "'");

                let jsonObject = JSON.parse(decodedString);

                if (jsonObject.challengeId
                    && !jsonObject.club.name.includes("The Strava Club")) {
                    validJsonObjects.push(jsonObject);
                }
            }
        } catch (error) {
            console.error(`Error accessing ${url}: ${error}`);
        }
    }

    return validJsonObjects;
}

async function main() {
    const startId = 4521;
    const endId = 4530;

    console.log('Checking challenges...');
    let validJsonObjects = await findChallengeUrls(startId, endId);
    if (validJsonObjects.length === 0) {
        console.log('No valid challenge URLs found.');
    } else {
        validJsonObjects = transformJson(validJsonObjects);
        const jsonResults = JSON.stringify(validJsonObjects, null, 2);
        console.log(jsonResults);

        await fs.writeFile('challenges.json', jsonResults);
        console.log('JSON data saved to challenges.json');
    }
	console.log('Challenge update completed');
}

main();
