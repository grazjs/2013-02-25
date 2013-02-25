var timeX = {};

timeX.getTemplateById = function (id) {
  return Mustache.compile(document.getElementById(id).innerHTML);
};

timeX.idGen = (function() {
  var proj, cat, entry;
  proj = cat = entry = 0;

  return {
    project: function() { return 'project_' + proj++; },
    category: function() { return 'category_' + cat++; },
    entry: function() { return 'entry_' + entry++; }
  };
}());

timeX.stores = {
  project: [],
  category: []
};

timeX.els = {
  nav: document.querySelector('.nav'),
  body: document.querySelector('#body')
};

timeX.request = function(options, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open(options.method || 'GET', options.url);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== xhr.DONE) { return; }
    if (callback) { callback(xhr, options); }
  };

  if (options.json) {
    xhr.setRequestHeader('content-type', 'application/json');
    return xhr.send(JSON.stringify(options.json));
  }

  if (options.params) {
    var params = '';
    Object.keys(options.params).forEach(function(key) {
      params += (params ? '&' : '') +
        encodeURIComponent(key) + '=' + encodeURIComponent(options.params[key]);
    });
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
    return xhr.send(params);
  }

  xhr.send();
};

timeX.extractFormData = function(form) {
  var allEls = form.querySelectorAll('[name]');

  var obj = { _id: form.id };
  for (var i = 0; i < allEls.length; i++) {
    var el = allEls[i];
    var value = el.getAttribute('data-value') || el.value;
    if (el.value) {
      obj[el.name] = value;
    }
  }
  if (obj._id.indexOf('_') !== -1) {
    delete obj._id;
  }
  return obj;
};

timeX.saveFormHandler = function(e){
  e.preventDefault();

  var form = this.parentNode;
  var obj = timeX.extractFormData(form);

  timeX.request({
    method: 'POST',
    url: 'api',
    json: obj
  },
  function(xhr) {
    var response = JSON.parse(xhr.responseText);
    if (!response.ok) { return; }

    delete response.ok;
    Object.keys(response).forEach(function(key) {
      obj[key] = response[key];
    });
    timeX.stores[obj.type].push(obj);

    window.location.reload();
  });
};

timeX.parseDate = function(value) {
  var result;
  [{
    format: 'HH:mm',
    adjust: function(value) {
      var now = moment();
      value.add('y', now.year()).add('M', now.month()).add('d', now.date() - 1);
    }
  }, {
    format: 'DD HH:mm',
    adjust: function(value) {
      var now = moment();
      value.add('y', now.year()).add('M', now.month());
    }
  }, {
    format: 'YYYY-MM-DD HH:mm',
    adjust: function(value) {}
  }].sort(function(d1, d2){
    function r(d) { return Math.abs(d.format.length - value.length); }
    return r(d1) - r(d2);
  }).some(function(d) {
    result = moment(value, d.format);
    if (result === null) { return false; }
    d.adjust(result);
    return result.isValid();
  });

  return result;
};


timeX.route = {};
timeX.route.start = function() {
  timeX.els.body.innerHTML = timeX.getTemplateById('start')({
    admin: timeX.env.roles.indexOf('_admin') !== -1
  });
};
timeX.route.login = function() {
  timeX.els.body.innerHTML = timeX.getTemplateById('login')();
  var button = timeX.els.body.querySelector('button');
  button.addEventListener('click', function(e) {
    e.preventDefault();

    var form = this.parentNode;
    var allEls = form.querySelectorAll('[name]');

    var obj = {};
    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      if (el.value) {
        obj[el.name] = el.value;
      }
    }

    timeX.request({
      method: 'POST',
      url: '/_session',
      params: obj
    }, function(xhr) {
      var res = JSON.parse(xhr.responseText);
      if (res.error) {
        return form.querySelector('.msg').innerHTML = res.reason;
      }
      timeX.reset();
    });
  });
};
timeX.route.project = function() {
  timeX.els.body.innerHTML = timeX.getTemplateById('projects')({
    projects: timeX.stores.project.map(function(project) {
      var result = JSON.parse(JSON.stringify(project));
      return result;
    })
  });

  var table = timeX.els.body.querySelector('table');

  var newProject = timeX.els.body.querySelector('tfoot button');
  newProject.addEventListener('click', function(){
    this.parentNode.removeChild(this);

    var id = timeX.idGen.project();
    table.insertAdjacentHTML('afterend',
      timeX.getTemplateById('editProject')({
        _id: id
      })
    );

    var form = document.getElementById(id);
    var saveButton = form.querySelector('button');
    saveButton.addEventListener('click', timeX.saveFormHandler);
  });

  var buttons = timeX.els.body.querySelectorAll('tbody button');
  [].forEach.call(buttons, function(button) {
    button.addEventListener('click', function(e) {
      var id = this.parentNode.parentNode.id;
      window.location.hash = 'project/' + id;
    });
  });
};
timeX.route.editProject = function(projId) {
  var project = timeX.stores.project.filter(function(proj) {
    return proj._id === projId;
  })[0];
  timeX.els.body.innerHTML = timeX.getTemplateById('editProject')(project);
  var form = document.getElementById(project._id);
  var saveButton = form.querySelector('button');
  saveButton.addEventListener('click', timeX.saveFormHandler);

  var categories = timeX.stores.category.filter(function(c) {
    return c.project === projId;
  });

  var catHtml = timeX.getTemplateById('categories')({ categories: categories });
  timeX.els.body.insertAdjacentHTML('beforeend', catHtml);

  var buttons = timeX.els.body.querySelectorAll('tbody button');
  [].forEach.call(buttons, function(button) {
    button.addEventListener('click', function(e) {
      var id = this.parentNode.parentNode.id;
      window.location.hash = 'category/' + id;
    });
  });

  var newCategory = timeX.els.body.querySelector('tfoot button');
  newCategory.addEventListener('click', function() {

    var id = timeX.idGen.category();

    this.insertAdjacentHTML('beforebegin',
      timeX.getTemplateById('editCategory')({
        _id: id,
        project: projId
      })
    );

    var form = document.getElementById(id);
    form.querySelector('button').addEventListener('click', timeX.saveFormHandler);

    this.parentNode.removeChild(this);
  });
};
timeX.route.editCategory = function(catId) {
  var project = timeX.stores.category.filter(function(cat) {
    return cat._id === catId;
  })[0];
  timeX.els.body.innerHTML = timeX.getTemplateById('editCategory')(project);
  var form = document.getElementById(project._id);
  var saveButton = form.querySelector('button');
  saveButton.addEventListener('click', timeX.saveFormHandler);
};
timeX.route.entry = function() {

  timeX.els.body.innerHTML = ''; // TODO: proper

  function addLine(entry) {

    entry = entry || {
      _id: timeX.idGen.entry(),
      user: timeX.env.name
    };

    var isNew = entry._id.indexOf('_') !== -1;
    var projects = timeX.stores.project.map(function(p) {
      return { key: p._id, value: p.name };
    });
    var categories = timeX.stores.category.filter(function(c) {
      return c.project === entry.project;
    }).map(function(c) {
      return { key: c._id, value: c.name };
    });

    entry.projects = projects;
    entry.categories = categories;

    timeX.els.body.insertAdjacentHTML(isNew ? 'afterbegin' : 'beforeEnd',
      timeX.getTemplateById('entry')(entry)
    );
    var entryEl = document.getElementById(entry._id);

    var projEl = entryEl.querySelector('[name=project]');
    var catEl = entryEl.querySelector('[name=category]');

    projEl.addEventListener('change', function() {
      var validCat = timeX.stores.category.filter(function(cat) {
        return cat.project === projEl.value;
      }).map(function(cat){
        return { key: cat._id, value: cat.name };
      });

      catEl.innerHTML = Mustache.compile(
        '<option value=""></option>' +
        '{{#categories}}' +
        '<option value="{{key}}">{{value}}</option>' +
        '{{/categories}}')({categories: validCat});
    });
    var startEl = entryEl.querySelector('[name=start]');
    var endEl = entryEl.querySelector('[name=end]');
    var durationEl = entryEl.querySelector('.duration');

    function processDate() {
      var value = timeX.parseDate(this.value);
      if (!value || !value.isValid()) { return; }
      this.value = value.format('YYYY-MM-DD HH:mm');
      this.setAttribute('data-value', value._d.toJSON());

      // updateDuration
      if (!startEl.value || !endEl.value) { return; }

      var startDate = new Date(startEl.getAttribute('data-value'));
      var endDate = new Date(endEl.getAttribute('data-value'));

      if (startDate > endDate) {
        return durationEl.value = 'invalid';
      }

      var diff = endDate - startDate;
      var hour = Math.floor(diff / 36e5);
      var min = Math.floor((diff % 36e5) / 6e4);

      durationEl.value = hour + 'h ' + ('0' + min).slice(-2);
    }
    startEl.addEventListener('change', processDate);
    endEl.addEventListener('change', processDate);

    var saveButton = entryEl.querySelector('button.save');
    saveButton.addEventListener('click', function(e) {
      e.preventDefault();

      entry = timeX.extractFormData(entryEl);

      timeX.request({
        url: 'api',
        method: 'POST',
        json: entry
      }, function(xhr) {

        var response = JSON.parse(xhr.responseText);
        if (response.ok) {
          delete response.ok;
          Object.keys(response).forEach(function(key) {
            entry['_' + key] = response[key];
          });
          entryEl.id = entry._id;
          entryEl.querySelector('input[name="_rev"]').value = entry._rev;
          entryEl.querySelector('button.delete').style.display = '';

          if (isNew) { addLine(); }

        } else {
          timeX.notify(response.reason);
        }
      });

    });

    var deleteButton = entryEl.querySelector('button.delete');
    if (isNew) {
      deleteButton.style.display = 'none';
    }

    deleteButton.addEventListener('click', function(e) {
      e.preventDefault();

      timeX.request({
        method: 'DELETE',
        url: 'api/' + entry._id + '?rev=' + entry._rev
      }, function(xhr) {
        var response = JSON.parse(xhr.responseText);
        if (response.ok) {
          entryEl.parentNode.removeChild(entryEl);
        } else {
          timeX.notify(response.reason);
        }
      });
    });

    // init values
    function fillDate(el) {
      var value = moment(el.getAttribute('data-value'));
      if (!value) { return; }
      el.value = value.format('YYYY-MM-DD HH:mm');
    }
    fillDate(startEl);
    fillDate(endEl);
    processDate.call(endEl);
    if (entry.project) {
      entryEl.querySelector('select[name="project"]').value = entry.project;
    }
    if (entry.category) {
      entryEl.querySelector('select[name="category"]').value = entry.category;
    }

    if (isNew) { startEl.focus(); }
  }

  addLine();

  timeX.request({
    url: '_view/entry?'+
      'startkey=["' +
        timeX.env.name +
      '","' +
        new Date().toJSON().substring(0,8) +
      '"]' +
      '&' +
      'endkey=["' +
        timeX.env.name +
      '","' +
        new Date().toJSON().substring(0,8) + '4' +
      '"]'
  }, function(xhr) {
    JSON.parse(xhr.responseText).rows.map(function(row) {
      return row.value;
    }).sort(function(e1, e2) {
      return new Date(e2.start) - new Date(e1.start);
    }).forEach(function(data) {
      addLine(data);
    });
  });
};

timeX.route.changePassword = function() {
  var url = '/_users/org.couchdb.user:' + timeX.env.name;
  timeX.els.body.innerHTML = 'please stand by while loading';
  timeX.request({
    url: url
  }, function(res) {

    var user = JSON.parse(res.responseText);
    timeX.els.body.innerHTML = timeX.getTemplateById('changePassword')();
    var form = timeX.els.body.querySelector('form');
    var saveButton = form.querySelector('button');

    saveButton.addEventListener('click', function(e) {
      e.preventDefault();
      var pwd1 = form.querySelector('input[name="newPassword1"]').value;
      var pwd2 = form.querySelector('input[name="newPassword2"]').value;

      if (pwd1 !== pwd2){
        form.querySelector('label').innerHTML = 'password does not match';
        return;
      }
      user.password = pwd1;

      timeX.request({
        url: url,
        method: 'PUT',
        json: user
      }, function(xhr) {
        var response = JSON.parse(xhr.responseText);
        if (response.ok) {
          form.querySelector('label').innerHTML =
            'password updated, please hit [F5]';
        }
      });
    });
  });
};

timeX.navigate = function(route) {
  route = route.replace(/^#?/, '').toLowerCase();
  switch (true) {
    case /^$/.test(route):
      timeX.route.start();
      break;

    case /^login$/.test(route):
      timeX.route.login();
      break;

    case /^project$/.test(route):
      timeX.route.project();
      break;

    case /^project\/[0-9a-f]{32}$/.test(route):
      timeX.route.editProject(route.substring(8));
      break;

    case /^category\/[0-9a-f]{32}$/.test(route):
      timeX.route.editCategory(route.substring(9));
      break;

    case /^entry$/.test(route):
      timeX.route.entry();
      break;

    case /^changePassword$/i.test(route):
      timeX.route.changePassword();
      break;

    default:
      timeX.els.body.innerHTML = 'route not found';
      break;
  }
};

timeX.reset = function() {
  window.location.hash = '';
  window.location.reload();
};

timeX.notify = function(text) {
  var notify = document.getElementById('notify');
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  notify.appendChild(div);

  setTimeout(function() {
    notify.removeChild(div);
  }, 10 * 1000);
};
