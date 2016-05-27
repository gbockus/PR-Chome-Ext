const storageKey = 'gh-pr-mon';
const config = {
  githubApiKey: `${storageKey}-gh-api-key`,
  githubUserName: `${storageKey}-gh-username`,
  githubPassword: `${storageKey}-gp-password`,
  repositories: `${storageKey}-repos`,
  orgs: `${storageKey}-orgs`,
  selectedRepos: `${storageKey}-selected-repos`,
  prs: `${storageKey}-current-prs`,
  oldPrs: `${storageKey}-old-prs`,
  interval: `${storageKey}-prs-interval`,

  oldIcon: '/images/no-pr-16.png',
  newIcon: '/images/new-pr-16.png',
  personalRepoName: 'Personal',
  defaultInterval: 15
};

function getChromeStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (obj) => {
      resolve(obj[key]);
    });
  });
}


function setChromeStorage(key, value) {
  const obj = {};
  obj[key] = value;
  chrome.storage.local.set(obj);
}