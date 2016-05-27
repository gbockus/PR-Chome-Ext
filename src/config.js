const storageKey = 'gh-pr-mon';

// The config object shared by all parts of the extension.
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
  useCreated: `${storageKey}-prs-use-created`,

  oldIcon: '/images/no-pr-16.png',
  newIcon: '/images/new-pr-16.png',
  personalRepoName: 'Personal',
  defaultInterval: 15
};

/**
 * Utility for getting a value from Chrome storage.
 */
function getChromeStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (obj) => {
      resolve(obj[key]);
    });
  });
}

/**
 * Utility for saving a value to Chrome storage.
 */
function setChromeStorage(key, value) {
  const obj = {};
  obj[key] = value;
  chrome.storage.local.set(obj);
}