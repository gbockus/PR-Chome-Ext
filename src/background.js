console.log('In background.js');
console.log(config);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  'use strict';
  if (request.getRepos) {
    let usernamePromise = getChromeStorage(config.githubUserName),
      passwordPromise = getChromeStorage(config.githubPassword);

    Promise.all([usernamePromise, passwordPromise])
      .then((results) => {
        let username = results[0];
        let password = results[1];

        console.log(username);
        console.log(password);
        // basic auth
        const gh = new GitHub({
          username: username,
          password: password
        });
        
        let user = gh.getUser();

        let userRepoProm = user.listRepos()
          .then((repos) => {
            console.log(repos);
            return repos.data;
            // setChromeStorage(config.repositories, repos.data);
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
            let orgStorageObj = {};
            let orgList = [];
            orgs.forEach((org, i) => {
              orgList.push({
                login: org.login,
                repos: orgRepos[i+1].data
              })
            });
            console.log(orgList);
            return orgList;
            // setChromeStorage(config.orgs, orgList);
          });

        return Promise.all([userRepoProm, orgRepoProm]);
      })
      .then(([personalRepos = [], orgList]) => {
        if (personalRepos.length > 0) {
          orgList.push({login: 'Personal', repos: personalRepos});
        }
        console.log(orgList, 'final org list');
        return setChromeStorage(config.repositories, orgList);
      })
      .then(() => {
        chrome.runtime.sendMessage({reposLoaded: true});
      });


  }
});