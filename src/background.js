/**
 * Utility for getting a Github object instance.  It will use the token if available,
 * then defaul to the username and password.
 *
 * @returns {Promise.<T>} - A Github instance.
 */
function getGH() {
  let usernamePromise = getChromeStorage(config.githubUserName),
    passwordPromise = getChromeStorage(config.githubPassword),
    tokenPromise = getChromeStorage(config.githubApiKey);

  return Promise.all([usernamePromise, passwordPromise, tokenPromise])
    .then(([username, password, token]) => {
      let ghObj = {};
      if (token) {
        ghObj.token = token;
      } else if (username && password) {
        ghObj.username = username;
        ghObj.password = password;
      }
      // basic auth
      return new GitHub(ghObj);
    });
}

/**
 * Gets the repositories for the current User and stores them in the associated
 * local stoarage object.
 */
function getRepos() {
  getGH()
    .then((gh) => {

      let user = gh.getUser();

      let userRepoProm = user.listRepos()
        .then((repos) => {
          return repos.data;
        });
      let orgRepoProm = user.listOrgs()
        .then((orgs) => {
          orgs = orgs.data;
          let orgReposPromsies = [orgs];
          orgs.forEach((org) => {
            orgReposPromsies.push(gh.getOrganization(org.login).getRepos());
          });
          return Promise.all(orgReposPromsies);
        })
        .then((orgRepos) => {
          let orgs = orgRepos[0];
          let orgList = [];
          orgs.forEach((org, i) => {
            orgList.unshift({
              login: org.login,
              repos: orgRepos[i+1].data
            })
          });
          return orgList;
        });

      return Promise.all([userRepoProm, orgRepoProm]);
    })
    .then(([personalRepos = [], orgList = []]) => {
      if (personalRepos.length > 0) {
        orgList.push({login: config.personalRepoName, repos: personalRepos});
      }
      return setChromeStorage(config.repositories, orgList);
    })
    .then(() => {
      chrome.runtime.sendMessage({reposLoaded: true});
    });
}

/**
 * Utilty for creating a simpler PR object from the github data.
 *
 * @param {Object[]} prList - An array of github PR objects.
 * @param {boolean} useCreated - Flag to indicate that the created timestamp should
 * be monitored instead of updated timestamp.
 *
 * @returns {Array} - A list of simpler PR object.
 */
function processPRs(prList, useCreated) {
  let newList = [];
  prList.forEach((pr, i) => {
    var newObj = {};
    newObj.title = pr.title;
    newObj.userAvatar = pr.user.avatar_url;
    newObj.username = pr.user.login;
    newObj.url = pr.html_url;
    newObj.updatedAt = (useCreated) ? pr.created_at : pr.updated_at;

    newList.push(newObj);
  });
  return newList;
}

/**
 *  Goes out to github and collects pull request information from the currently selected
 *  repositories.   It will fire the `prsUpdated` message if either the PR info has changed
 *  or the force flag was passed
 *
 *  @param {boolean} force - Fire the `prsUpdated` message regardless of if the data has changed.
 */
function getPRs(force) {
  let currentPrs, useCreatedFlag;
  return Promise.all([
    getGH(),
    getChromeStorage(config.githubUserName),
    getChromeStorage(config.prs),
    getChromeStorage(config.useCreated),
    getChromeStorage(config.selectedRepos)
  ]).then(([gh, username, prs, useCreated, selectedRepos = []]) => {
    let prPromises = [];
    currentPrs = prs;
    useCreatedFlag = !!useCreated;

    if (selectedRepos.length === 0) {
      return;
    }

    selectedRepos.forEach((repoStr) => {
      let indexOfDash = repoStr.indexOf('-'),
        orgName = repoStr.substring(0, indexOfDash),
        repoName = repoStr.substring(indexOfDash + 1),
        usernameParam = (orgName === config.personalRepoName) ? username : orgName;
      prPromises.push(gh.getRepo(usernameParam, repoName).listPullRequests({state: 'open', sort: 'created'}));
    });

    prPromises.unshift(selectedRepos);
    return Promise.all(prPromises);
  })
  .then(([selectedRepos, ...prResults]) => {
      var prDataToStored = [], result;
      prResults.forEach((prResult, index) => {
        prDataToStored.unshift({
          repoName: selectedRepos[index],
          prs: processPRs(prResult.data, useCreatedFlag)
        });
      });
      if (!_.isEqual(prDataToStored, currentPrs)) {
        setChromeStorage(config.prs, prDataToStored);
        setChromeStorage(config.oldPrs, currentPrs);
        result = true;
      } else {
        result = false;
        setChromeStorage(config.oldPrs, currentPrs);
      }

      return result;
    })
    .then((updated) => {
      if (updated) {
        chrome.browserAction.setIcon({path: config.newIcon});
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/images/new-pr-48.png',
          title: 'PRs have changed',
          message: 'There has been activity in PR land'
        });
      } else {
        chrome.browserAction.setIcon({path: config.oldIcon});
      }

      if (updated || force) {
        chrome.runtime.sendMessage({prsUpdated: true});
      }
      return getChromeStorage(config.interval);
    })
    .then((interval = config.defaultInterval) => {
      chrome.alarms.create('prAlarm', {delayInMinutes: parseInt(interval)});
    });
}

/**
 * Add a handler for the chrome alarm calls that are used instead of setInterval.
 */
chrome.alarms.onAlarm.addListener(function() {
  getPRs();
});

/**
 *  Handler for when the there are messages posted.
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.getRepos) {
    getRepos();
  } else if (request.getPRs) {
    chrome.alarms.clear('prAlarm');
    getPRs(true);
  }
});

// Refresh teh PR list on load.
getPRs();
