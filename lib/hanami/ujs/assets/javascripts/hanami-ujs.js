//
// hanami-ujs (0.1.0)
// vanilla-ujs (1.3.0)
//
// Mon Feb 12 10:45:37 UTC 2018
//

//
// source: confirm.js
//
document.addEventListener('click', function (event) {
  var message, element;

  element = event.target;

  if (matches.call(element, 'a[data-confirm], button[data-confirm], input[data-confirm]')) {
    message = element.getAttribute('data-confirm');
    if (!confirm(message)) {
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }

    return;
  }
}, false);

//
// source: csrf.js
//
var CSRF = {
  token: function () {
    var token = document.querySelector('meta[name="csrf-token"]');
    return token && token.getAttribute('content');
  },
  param: function () {
    var param = document.querySelector('meta[name="csrf-param"]');
    return param && param.getAttribute('content');
  }
};

var sameOrigin = function (url) {
  var a = document.createElement('a'), origin;
  a.href = url;
  origin = a.href.split('/', 3).join('/');

  return window.location.href.indexOf(origin) === 0;
};

window.CSRF = CSRF;

document.addEventListener('ajax:beforeSend', function (e) {
  var token = CSRF.token(), xhr = e.detail;
  if (token)
    xhr.setRequestHeader('X-CSRF-Token', token);
});

document.addEventListener('submit', function (e) {
  var token = CSRF.token(),
      param = CSRF.param(),
      form  = e.target;

  if (matches.call(form, 'form')) {
    if (matches.call(form, 'form[data-remote]'))
      return true;
    if (!form.method || form.method.toUpperCase() == 'GET')
      return true;
    if (!sameOrigin(form.action))
      return true;

    if (param && token && !form.querySelector('input[name='+param+']')) {
      var input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', param);
      input.setAttribute('value', token);

      form.appendChild(input);
    }

    return true;
  }
});

//
// source: disable.js
//
document.addEventListener('click', function (event) {
  var message, element;

  // do not disable on right click. Work on left and middle click
  if (event.which == 3) {
    return;
  }

  element = event.target;

  // do not disable if the element is a submit button and its form has invalid input elements.
  // since failed validations prevent the form from being submitted, we would lock the form permanently
  // by disabling the submit button even though the form was never submitted

  if(element.getAttribute("type") === "submit" && element.form.querySelector(":invalid") !== null) {
    return;
  }

  if (matches.call(element, 'a[data-disable-with], button[data-disable-with], input[data-disable-with]')) {
    message = element.getAttribute('data-disable-with');
    if(!!element.value){
      element.value = message;
    }else{
      element.innerHTML = message;
    }
    // timeout is needed because Safari stops the submit if the button is immediately disabled
    setTimeout(function(){
      element.setAttribute('disabled', 'disabled');
    }, 0);
  }
}, false);

//
// source: form.js
//
document.addEventListener('submit', function(event) {

  var form = event.target;

  if (matches.call(form, 'form[data-remote]')) {
    var before = new CustomEvent('ajax:before', {data: data, bubbles: true});
    form.dispatchEvent(before);

    var url = form.action;
    var method = (form.method || form.getAttribute('data-method') || 'POST').toUpperCase();
    var data = new FormData(form);

    if (CSRF.param() && CSRF.token()) {
      data[CSRF.param()] = CSRF.token();
    }

    var error = function(xhr, target) {
      var errorEvent = new CustomEvent('ajax:error', {detail: xhr, bubbles: true});
      target.dispatchEvent(errorEvent);
    }

    var success = function(xhr, target) {
      var successEvent = new CustomEvent('ajax:success', {detail: xhr, bubbles: true});
      target.dispatchEvent(successEvent);
    }

    if (LiteAjax.ajax({ url: url, method: method, data: data, target: form, success: success, error: error })){
      event.preventDefault();
    } else {
      return true;
    }
  }
});

//
// source: liteajax.js
//
var LiteAjax = (function () {
  var LiteAjax = {};

  LiteAjax.options = {
    method: 'GET',
    url: window.location.href
  };

  LiteAjax.ajax = function (url, options) {
    if (typeof url == 'object') {
      options = url;
      url = undefined;
    }

    options = options || {};

    if(!options.accepts) {
      options.accepts = 'text/javascript, application/javascript, ' +
                        'application/ecmascript, application/x-ecmascript';
    }

    url = url || options.url || location.href || '';
    var data = options.data;
    var target = options.target || document;
    var xhr = new XMLHttpRequest();

    xhr.addEventListener('load', function () {
      var responseType = xhr.getResponseHeader('content-type');
      if(responseType === 'text/javascript; charset=utf-8') {
        eval(xhr.response);
      }

      var event = new CustomEvent('ajax:complete', {detail: xhr, bubbles: true});
      target.dispatchEvent(event);
    });

    if (typeof options.success == 'function')
      xhr.addEventListener('load', function (event) {
        if (xhr.status >= 200 && xhr.status < 300)
          options.success(xhr, target);
      });
      xhr.addEventListener('success', function (event) {
        options.success(xhr, target);
      });

    if (typeof options.error == 'function') {
      xhr.addEventListener('load', function (event) {
        if (xhr.status < 200 || xhr.status >= 300)
          options.error(xhr, target);
      });
      xhr.addEventListener('error', function (event) {
        options.error(xhr, target);
      });
    }

    xhr.open(options.method || 'GET', url);
    xhr.setRequestHeader('X-Requested-With', 'XmlHttpRequest');
    xhr.setRequestHeader('Accept', '*/*;q=0.5, ' + options.accepts);

    if(options.json) {
      xhr.setRequestHeader('Content-type', 'application/json');
      data = JSON.stringify(data);
    }

    var beforeSend = new CustomEvent('ajax:beforeSend', {detail: xhr, bubbles: true});
    target.dispatchEvent(beforeSend);
    xhr.send(data);

    return xhr;
  };

  return LiteAjax;
})();

//
// source: method.js
//
document.addEventListener('click', function(event) {
  var element, url, method, data, handler;

  // Only left click allowed. Firefox triggers click event on right click/contextmenu.
  if (event.button !== 0) {
    return;
  }

  element = event.target;

  if (matches.call(element, 'a[data-method]')) {
    url = element.getAttribute('href');
    method = element.getAttribute('data-method').toUpperCase();
    data = {};

    if (CSRF.param() && CSRF.token()) {
      data[CSRF.param()] = CSRF.token();
    }

    if (matches.call(element, 'a[data-remote]')) {
      handler = xhr;
    } else {
      handler = submit;
    }

    if (handler({ url: url, method: method, data: data, target: element })) {
      event.preventDefault();
    } else {
      return true;
    }
  }

  function submit(options) {
    var form, input, param;

    if (options.method == 'GET') {
      return false;
    }

    form = document.createElement('form');
    form.method = 'POST';
    form.action = options.url;
    form.style.display = 'none';

    for (param in options.data) {
      if (Object.prototype.hasOwnProperty.call(options.data, param)) {
        input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', param);
        input.setAttribute('value', options.data[param]);
        form.appendChild(input);
      }
    }

    if (options.method != 'POST') {
      input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', '_method');
      input.setAttribute('value', options.method);
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    return true;
  }

  function xhr(options) {
    LiteAjax.ajax(options);
    return true;
  }
}, false);

//
// source: polyfills.js
//
var matches = (function(doc) {
  return doc.matchesSelector ||
    doc.webkitMatchesSelector ||
    doc.mozMatchesSelector ||
    doc.oMatchesSelector ||
    doc.msMatchesSelector;
})(document.documentElement);

var CustomEvent = function (event, params) {
  params = params || {bubbles: false, cancelable: false, detail: undefined};
  var evt = document.createEvent('CustomEvent');
  evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
  return evt;
};

CustomEvent.prototype = window.CustomEvent.prototype;

window.CustomEvent = CustomEvent;