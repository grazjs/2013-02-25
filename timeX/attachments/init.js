////////////////////////////////////////////////////////////////////////////////
// startup
window.addEventListener('hashchange', function() {
  timeX.navigate(window.location.hash);
});

  // keep session alive
(function() {
  setInterval(function() {
    timeX.request({ url: './' });
  }, 5 * 60 * 1000);
}());

timeX.request({
  method: 'GET',
  url: '/_session'
}, function(res) {
  //res.status === 200
  var session = JSON.parse(res.responseText);
  if (!session.userCtx.name) {
    // show login
    return timeX.navigate('login');
  }

  timeX.env = session.userCtx;

  // init NAV
  var text = timeX.getTemplateById('info')(session.userCtx);
  timeX.els.nav.innerHTML = text;

  var button = timeX.els.nav.querySelector('button');
  if (!button) { return; }
  button.addEventListener('click', function(){
    timeX.request({
      method: 'DELETE',
      url: '/_session'
    }, function(xhr) {
      // JSON.parse(xhr.responseText).ok
      timeX.reset();
    });
  });
  // end NAV

  // load data
  var doneLoading = 0;
  function done() {
    doneLoading += 1;
    if (doneLoading === 2) {
      timeX.navigate(window.location.hash);
    }
  }

  timeX.request({
    url: '_view/project'
  }, function(xhr) {
    var response = JSON.parse(xhr.responseText);
    timeX.stores.project = response.rows.map(function(row) { return row.value; });
    done();
  });
  timeX.request({
    url: '_view/category'
  }, function(xhr) {
    var response = JSON.parse(xhr.responseText);
    timeX.stores.category = response.rows.map(function(row) { return row.value; });
    done();
  });
  // end
});

