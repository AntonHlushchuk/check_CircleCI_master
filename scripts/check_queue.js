const axios = require('axios');

const githubApiHeaders = {
    Authorization: `token ${process.env.GITHUB_API_TOKEN}`,
    'User-Agent': 'circle-deploy'
};

const logToConsole = process.env.CIRCLECI ? console.log : () => {}; // eslint-disable-line no-console

const getOlderRunningBuilds = async ({ defaultBranch, circleBuildNum } = {}) => {
    const recentBuilds = (await axios.get(
        `https://circleci.com/api/v1.1/project/github/AntonHlushchuk/check_CircleCI_master/tree/${defaultBranch}`,
        {
            params: {
                'circle-token': process.env.CIRCLE_TOKEN,
                limit: 10,
                filter: 'running'
            }
        }
    )).data;

    logToConsole(`Fetched ${recentBuilds.length} builds`);

    const builds = recentBuilds.filter(build => String(build.build_num) !== circleBuildNum);

    logToConsole(`Filtered to ${builds.length} builds`);

    return builds;
};

const moduleExports = {};

moduleExports.checkQueueForSlot = async ({
                                             buildSha = process.env.CIRCLE_SHA1,
                                             defaultBranch = process.env.DEFAULT_BRANCH || 'master',
                                             checkFrequency = process.env.QUEUE_CHECK_FREQUENCY || 30,
                                             circleBuildNum = process.env.CIRCLE_BUILD_NUM
                                         } = {}) => {
    let checkCounter = 0;

    const builds = await getOlderRunningBuilds({
        defaultBranch,
        circleBuildNum
    });
    logToConsole(`Done fetching. Fetched ${builds.length} builds`);

    const branch = (await axios.get(
        `https://api.github.com/repos/AntonHlushchuk/check_CircleCI_master/git/refs/heads/${defaultBranch}`,
        {
            headers: githubApiHeaders
        }
    )).data;

    const latestSha = branch.object.sha;
    logToConsole(`latest SHA: ${latestSha}`);

    const iAmLatestSha = latestSha === buildSha;

    if (!iAmLatestSha) {
        logToConsole('I am NOT the latest SHA. Exiting with status 1');
        process.exit(1);
    }

    if (!builds.length) {
        logToConsole(`There are no older running builds on ${defaultBranch}`);
        logToConsole('I am the latest SHA. Exiting with status 0');
        process.exit(0);
    }

    const checkInterval = setInterval(() => {
        checkCounter += 1;
        process.env.CIRCLECI && logToConsole(`Checking again in ${checkFrequency - checkCounter} seconds`);
        if (checkCounter >= checkFrequency) {
            moduleExports.checkQueueForSlot({
                buildSha,
                defaultBranch,
                checkFrequency,
                circleBuildNum
            });
            clearInterval(checkInterval);
        }
    }, 1000);

    return checkInterval;
};

if (process.env.NODE_ENV !== 'test') {
    moduleExports.checkQueueForSlot();
}

module.exports = moduleExports;
