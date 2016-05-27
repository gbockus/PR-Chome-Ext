function showManage() {
  $('.main').hide();
  $('.manage-ctr').show();
}

function showMain() {
  $('.main').show();
  $('.manage-ctr').hide();
  refreshPRs();
}

function manageRepos() {
  showManage();
  showLoading();
  chrome.runtime.sendMessage({getRepos: true});
}

function showLoading() {
  $('.loading').show();
}

function hideLoading() {
  $('.loading').hide();
}

function getFormattedDate(dateStr) {
  return moment(dateStr).format('M/D/YYYY hh:mm A');
}

function getChangedCls(oldList, newList, repo, title) {
  let oldItem = _.find(oldList, {'repoName': repo});
  let newItem = _.find(newList, {'repoName': repo});
  if (oldItem && newItem) {
    let oldPr = _.find(oldItem.prs, {'title': title});
    let newPr = _.find(newItem.prs, {'title': title});
    if (oldPr && newPr) {
      if (_.isEqual(oldPr, newPr)) {
        return '';
      }
    }
  }
  return 'pr-changed';
}

const prsTpl = (oldPrs, prsList) => `
  ${prsList.map((prItem) => `
    <h4 class="prs-h4">${prItem.repoName}</h4>
      ${prItem.prs.map((pr)=> `
        <a class="pr-ctr ${getChangedCls(oldPrs, prsList, prItem.repoName, pr.title)}" href="${pr.url}">
          <img class="pr-img" src="${pr.userAvatar}"/>
          <div class="pr-deets">
                <div class="pr-title">${pr.title}</div>
                <div class="pr-sub">
                  <div class="pr-username">${pr.username}</div>
                  <div>${getFormattedDate(pr.updatedAt)}</div>
                </div>
          </div>
        </a>

      `).join('')}
  `).join('')}
`;

function updatePRs() {
  let prsCtr = $('.prs-ctr');
  prsCtr.empty();

  Promise.all([getChromeStorage(config.oldPrs), getChromeStorage(config.prs)])
    .then(([oldPrs, prList]) => {
      prsCtr.append(prsTpl(oldPrs, prList));
      hideLoading();
      });
  }

function showRepos() {
  const repoTmpl = (orgName, repositories) => `
        <table>
        ${repositories.map(repo => `
            <tr>
              <td><div class="repo-name-ctr">${repo.name}</div></td>
              <td align="right" class="checkbox-ctr"><input name="${orgName}-${repo.name}" type="checkbox"></td>
            </tr>
        `).join('')}
        </table>
    `;

  /*
   <input class="search-input" name="${org.login}" type="search"/>
   <button class="search-btn"></button>
   */
  const orgRepoTmpl = orgs =>  `
    ${orgs.map(org => `
    <div class="org-ctr">
      <div class="org-tbar">
        <h4>${org.login}</h4>
        <div class="flex-it"></div>
      </div>
      ${repoTmpl(org.login, org.repos)}
    </div>
    `).join('')}
  `;


  $('.manage-ctr input[type=checkbox]').unbind( "click" );

  let personalProm =  getChromeStorage(config.repositories)
    .then((repos) => {
      $('.org-repos').empty().append(orgRepoTmpl(repos));
    });


  return Promise.all([personalProm, getChromeStorage(config.selectedRepos)])
    .then((results) => {
      let selectedRepos = results[1] || [];
      selectedRepos.forEach((repoName) => {
        $(`input[name=${repoName}]`).prop('checked', true);
      });

      $('.manage-ctr input[type=checkbox]').on('click', (event) => {

        let repoName = event.currentTarget.name,
          checked = event.currentTarget.checked;
        getChromeStorage(config.selectedRepos)
          .then((repos) => {
            repos = repos || [];
            if (checked) {
              repos.push(repoName);
            } else {
              let indexOfRepo = repos.indexOf(repoName);
              if (indexOfRepo !== -1) {
                repos.splice(indexOfRepo, 1);
              }
            }
            setChromeStorage(config.selectedRepos, repos);

          });
      });
    });

}

function refreshPRs() {
  showLoading();
  chrome.runtime.sendMessage({getPRs: true});
}

document.addEventListener('DOMContentLoaded', function() {
  $('#manageRepos').on('click', manageRepos);
  $('#goHome').on('click', showMain);
  $('#refreshPRs').on('click', refreshPRs);
  updatePRs();
  chrome.browserAction.setIcon({path: config.oldIcon});

  $('body').on('click', 'a', function(){
    chrome.tabs.create({url: $(this).attr('href')});
    return false;
  });
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.reposLoaded) {
    showRepos()
      .then(()=>{
        hideLoading();
      });
  } else if (request.prsUpdated) {
    updatePRs();
  }
});

