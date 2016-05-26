function showManage() {
  $('.main').hide();
  $('.manage-ctr').show();
}

function showMain() {
  $('.main').show();
  $('.manage-ctr').hide();
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

  const orgRepoTmpl = orgs =>  `
    ${orgs.map(org => `
      <h4>${org.login}</h4>
      ${repoTmpl(org.login, org.repos)}
    `).join('')}
  `;


  $('.manage-ctr input[type=checkbox]').unbind( "click" );

  let personalProm =  getChromeStorage(config.repositories)
    .then((repos) => {
      // $('.personal-repos').append(repoTmpl(repos));
      $('.org-repos').append(orgRepoTmpl(repos));
    });

  // let orgsProm = getChromeStorage(config.orgs)
  //   .then((orgs) => {
  //     $('.org-repos').append(orgRepoTmpl(orgs));
  //   });

  return Promise.all([personalProm, getChromeStorage(config.selectedRepos)])
    .then((results) => {
      let selectedRepos = results[2] || [];
      selectedRepos.forEach((repoName) => {
        $(`input[name=${repoName}]`).prop('checked', true);
      });

      $('.manage-ctr input[type=checkbox]').on('click', (event) => {
        let repoName = event.currentTarget.name,
          checked = event.currentTarget.checked;
        getChromeStorage(config.selectedRepos)
          .then((repos) => {
            console.log(repos, 'selectedRepos');
            repos = repos || [];
            if (checked) {
              repos.push(repoName);
            } else {
              let indexOfRepo = repos.indexOf(repoName);
              if (indexOfRepo !== -1) {
                repos.splice(indexOfRepo, 1);
              }
            }
            return setChromeStorage(config.selectedRepos, repos);
          });
      });
    });

}

document.addEventListener('DOMContentLoaded', function() {
  $('#manageRepos').on('click', manageRepos);
  $('#goHome').on('click', showMain);
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.reposLoaded) {
    showRepos()
      .then(()=> {
        hideLoading();
      });
  }
});
