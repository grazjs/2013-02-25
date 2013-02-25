var path = require('path');

ddoc = {
  _id: '_design/app',
  rewrites: [{
    from: "/",
    to: 'index.html'
  }, {
    from: "/api",
    to: '../../'
  }, {
    from: "/api/*",
    to: '../../*'
  }, {
    from: "/*",
    to: '*'
  }],

  views: {
    project: {
      map: function(doc) {
        if (doc.type !== 'project') { return; }
        emit(null, doc);
      }
    },
    category: {
      map: function(doc) {
        if (doc.type !== 'category') { return; }
        emit(doc.project, doc);
      }
    },
    entry: {
      map: function(doc) {
        if (doc.type !== 'entry') { return; }
        emit([doc.user, doc.start], doc);
      }
    },
    entryByDay: {
      map: function(doc) {
        if (doc.type !== 'entry') { return; }
        var start = new Date(doc.start);
        var end = new Date(doc.end);

        // split by day
        var day = 24 * 60 * 60 * 1000;
        var now = start;
        while (now < end) {
          var old = now;
          now = Math.min(
            (Math.floor(now / day) + 1) * day,
            end);

          emit([
            doc.user,
            new Date(old).toJSON().substring(0, 10)
          ],
            now - old
          );

        }
      },
      reduce: function(keys, values) {
        return sum(values);
      }
    }
  },

  validate_doc_update: function (newDoc, oldDoc, userCtx) {

    var isAdmin = userCtx.roles.indexOf('_admin') !== -1;

    if (isAdmin) {
      return; // has all rights
    }

    var isTimeXadmin = userCtx.roles.indexOf('timeXadmin') !== -1;
    var isTimeXuser = userCtx.roles.indexOf('timeXuser') !== -1;

    if (!isTimeXuser) {
      throw 'you must have the timeXuser role';
    }

    if (!newDoc.type && !newDoc._deleted) {
      throw 'all documents must have a type';
    }

    if (!isAdmin && oldDoc && !newDoc._deleted && oldDoc.type !== newDoc.type) {
      throw 'document type can not be changed';
    }

    if (!isTimeXadmin && newDoc.type === 'project'){
      throw 'only timeXadmin can edit projects';
    }
    if (!isTimeXadmin && newDoc.type === 'category') {
      throw 'only timeXadmin can edit categoryies';
    }

    if (newDoc.type === 'entry') {
      if (!newDoc.user) {
        throw 'you need to set a user';
      }
      if (newDoc.user !== userCtx.name) {
        throw 'you can only create entries for your own user';
      }
      if (!newDoc.start || isNaN(new Date(newDoc.start).getTime())) {
        throw 'start is no valid date';
      }
      if (!newDoc.end || isNaN(new Date(newDoc.end).getTime())) {
        throw 'end is no valid date';
      }
    }
  },

  __attachments: [{
    root: path.join(__dirname, 'attachments'),
    prefix: undefined
  }]
};

module.exports = ddoc;