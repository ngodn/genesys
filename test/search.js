var t = require('../test-lib/test.js');
var assert = require('assert');
var _ = require('@sailshq/lodash');

var genex;

describe('Search', function() {

  this.timeout(t.timeout);

  after(function(done) {
    return t.destroy(genex, done);
  });

  // EXISTENCE

  it('should be a property of the genex object', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      modules: {
        'apostrophe-express': {
          secret: 'xxx',
          port: 7900
        },
        'events': {
          extend: 'apostrophe-pieces',
          name: 'event',
          label: 'Event'
        }
      },
      afterInit: function(callback) {
        assert(genex.search);
        genex.argv._ = [];
        return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        done();
      }
    });
  });

  it('should add highSearchText, highSearchWords, lowSearchText, searchSummary to all docs on insert', function(done) {
    var req = genex.tasks.getReq();
    genex.docs.insert(req, {
      title: 'Testing Search Event',
      type: 'event',
      tags: ['search', 'test', 'pizza'],
      slug: 'search-test-event',
      published: true
    }, function(err) {
      assert(!err);

      genex.docs.find(req, { slug: 'search-test-event' }).toObject(function(err, doc) {
        assert(!err);
        assert(doc.highSearchText);
        assert(doc.highSearchWords);
        assert(doc.lowSearchText);
        assert(doc.searchSummary !== undefined);

        assert(doc.lowSearchText.match(/pizza/));
        assert(doc.highSearchText.match(/testing/));
        assert(_.contains(doc.highSearchWords, 'test', 'pizza', 'testing'));
        done();
      });

    });
  });

});
