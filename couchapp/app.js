var couchapp = require('couchapp');
var path = require('path');

ddoc = {
  _id:'_design/app',

  rewrites : [{
    from:"/",
    to:'index.html'
  }],

  views: {
    sample: {
      map: function(doc) {
        emit(doc.id, doc);
      }
    }
  },

  filters: {
    sample: function(doc, req) {
      return !!doc.a;
    }
  },

  lists: {
    sample: function(head, req) {
      function stringify(o) { return JSON.stringify(o, null, '  '); }
      var row;
      while (row = getRow()){}
      return stringify(head) + '\n' + stringify(req);
    }
  },

  shows: {
    sample: function(doc, req) {
      return JSON.stringify({ doc: doc, req: req }, null, '  ');
    }
  },

  validate_doc_update: function (newDoc, oldDoc, userCtx) {
    if (newDoc.error) {
      throw 'you cant create a doc with an error property';
    }
  }
};

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;