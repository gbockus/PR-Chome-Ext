const storageKey = 'gh-pr-mon';
const config = {
  githubApiKey: `${storageKey}-gh-api-key`,
  githubUserName: `${storageKey}-gh-username`,
  githubPassword: `${storageKey}-gp-password`,
  repositories: `${storageKey}-repos`,
  orgs: `${storageKey}-orgs`,
  selectedRepos: `${storageKey}-selected-repos`
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