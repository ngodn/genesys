var t = require('../test-lib/test.js');
var assert = require('assert');
var Promise = require('bluebird');

describe('Promisified Events: genesys-docs:beforeInses', function() {

  this.timeout(50000);

  after(function(done) {
    return t.destroy(genex, done);
  });

  var genex;
  var coreEventsWork = false;

  it('should implement genesys-docs:beforeInsert handlers properly', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test2',
      modules: {
        'test1': {
          alias: 'test1',
          construct: function(self, options) {
            self.on('genesys-docs:beforeInsert', 'beforeInsertReverseTitle', function(req, doc, options) {
              if (doc.type === 'default') {
                return Promise.delay(50).then(function() {
                  doc.title = doc.title.split('').reverse().join('');
                });
              }
            });
            self.on('genesys:modulesReady', 'modulesReadyCoreEventsWork', function() {
              coreEventsWork = true;
            });
            // Old school callAll works too (for now)
            self.docBeforeInsert = function(req, doc, options, callback) {
              doc.oldSchool = true;
              return setImmediate(callback);
            };
          }
        },
        'genesys-pages': {
          park: [
            {
              type: 'default',
              findMeAgain: true,
              title: 'Test',
              slug: '/test',
              published: true
            }
          ]
        }
      },
      afterInit: function(callback) {
        genex.argv._ = [];
        done();
      }
    });
  });

  it('should find the results', function(done) {
    return genex.docs.db.findOne({ findMeAgain: true }, function(err, doc) {
      assert(!err);
      assert(doc);
      assert(doc.title === 'tseT');
      assert(doc.oldSchool);
      assert(coreEventsWork);
      done();
    });
  });
});
