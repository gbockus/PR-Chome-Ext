//         chrome.browserAction.setIcon({path: config.newIcon});

function getRepos() {
  let usernamePromise = getChromeStorage(config.githubUserName),
    passwordPromise = getChromeStorage(config.githubPassword);

  Promise.all([usernamePromise, passwordPromise])
    .then((results) => {
      let username = results[0];
      let password = results[1];

      // basic auth
      const gh = new GitHub({
        username: username,
        password: password
      });

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

function processPRs(prList) {
  let newList = [];
  prList.forEach((pr, i) => {
    var newObj = {};
    newObj.title = pr.title;
    newObj.userAvatar = pr.user.avatar_url;
    newObj.username = pr.user.login;
    newObj.url = pr.url;
    newObj.updatedAt = pr.updated_at;

    newList.push(newObj);
  });
  return newList;
}

/**
 *
 */
function getPRs() {
  console.log('getPRs');
  let currentPrs;
  return Promise.all([
    getChromeStorage(config.githubUserName),
    getChromeStorage(config.githubPassword),
    getChromeStorage(config.prs),
    getChromeStorage(config.selectedRepos)
  ]).then(([username, password, prs, selectedRepos = []]) => {
    let prPromises = [];
    currentPrs = prs;

    if (selectedRepos.length === 0 || !username || !password) {
      return;
    }

    console.log(selectedRepos);
    const gh = new GitHub({
      username: username,
      password: password
    });

    selectedRepos.forEach((repoStr) => {
      let indexOfDash = repoStr.indexOf('-'),
        orgName = repoStr.substring(0, indexOfDash),
        repoName = repoStr.substring(indexOfDash + 1),
        usernameParam = (orgName === config.personalRepoName) ? username : orgName;
      console.log({name: usernameParam, repo: repoName}, 'Getting PRs');
      prPromises.push(gh.getRepo(usernameParam, repoName).listPullRequests({state: 'open', sort: 'created'}));
    });

    prPromises.unshift(selectedRepos);
    return Promise.all(prPromises);
  })
  .then(([selectedRepos, ...prResults]) => {
      console.log(prResults, 'prResults');
      var prDataToStore = [];
      prResults.forEach((prResult, index) => {
        prDataToStore.unshift({
          repoName: selectedRepos[index],
          prs: processPRs(prResult.data)
        });
      });
      console.log(prDataToStore, 'prDataToStore');
      if (!_.isEqual(prDataToStore, currentPrs)) {
        console.log(prDataToStore);
        console.log(currentPrs);
        setChromeStorage(config.prs, prDataToStore);
        setChromeStorage(config.oldPrs, currentPrs);
        return true;
      } else {
        return false;
      }
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
        chrome.runtime.sendMessage({prsUpdated: true});
      } else {
        chrome.browserAction.setIcon({path: config.oldIcon});
      }
      return getChromeStorage(config.interval);
    })
    .then((interval = config.defaultInterval) => {
      console.log('Interval: '+ interval);
      chrome.alarms.create('prAlarm', {delayInMinutes: parseInt(interval)});
    });
}

chrome.alarms.onAlarm.addListener(function() {
  console.log('in Alarm handler');
  getPRs();
});
/**
 *
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.getRepos) {
    getRepos();
  } else if (request.getPRs) {
    chrome.alarms.clear('prAlarm');
    getPRs();
  }
});

getPRs();
