
function setChromeStorage(key, val) {
  var obj = {};
  obj[key] = val;
  chrome.storage.local.set(obj);
}

function removeChromeStorage(key) {
  chrome.storage.local.remove(key);
}

/**
 * Utility for setting up a text input.
 * @param selector - The css selector.
 * @param key - The key where the associated data should be saved.
 * @param placeholder - The placeholder value.
 *
 * @private
 */
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

/**
 * Wire up the fields on the options page.
 */
$(document).ready(function() {
  _initField('#githubAPIKey', config.githubApiKey, 'Github APIKey');
  _initField('#interval', config.interval, config.defaultInterval);

  getChromeStorage(config.useCreated)
    .then((useCreated) => {
      $('#createCheckbox').prop('checked', !!useCreated);
    });

  $('#createCheckbox').click(function() {
    setChromeStorage(config.useCreated, $('#createCheckbox').prop('checked'));
  });

});