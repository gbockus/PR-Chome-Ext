
function setChromeStorage(key, val) {
  var obj = {};
  obj[key] = val;
  chrome.storage.local.set(obj);
}

function removeChromeStorage(key) {
  chrome.storage.local.remove(key);
}

function _initField(selector, key, placeholder) {
  const $input = $(selector);
  const $reset = $input.next('.reset');
  $input.attr('placeholder', placeholder);

  // load value from local storage
  chrome.storage.local.get(key, function(result) {
    const value = result[key];
    if (value) {
      $input.val(value);
    } else {
      $reset.prop('disabled', true);
    }
  });

  // handle input change
  // save and validate
  $input.keyup(() => {
    const value = $input.val();
    if (value && value.trim().length) {
      setChromeStorage(key, value);
      $reset.prop('disabled', false);
    } else {
      removeChromeStorage(key);
      $reset.prop('disabled', true);
    }
  });

  // reset value
  $reset.click(() => {
    removeChromeStorage(key);
    $reset.prop('disabled', true);
    $input.val('');
  });
}

$(document).ready(function() {
  _initField('#githubAPIKey', config.githubApiKey, 'Github APIKey');
  _initField('#githubUsername', config.githubUserName, 'Github UserName');
  _initField('#githubPassword', config.githubPassword, 'Github Password');
  _initField('#interval', config.interval, config.defaultInterval);

});