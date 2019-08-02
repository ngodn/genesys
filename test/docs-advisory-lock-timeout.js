var t = require('../test-lib/test.js');
var assert = require('assert');
var genex;

describe('Docs Advisory Lock Timeout', function() {

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
        'genesys-express': {
          secret: 'xxx',
          port: 7900
        },
        'genesys-docs': {
          advisoryLockTimeout: 2
        },
        'test-people': {
          extend: 'genesys-doc-type-manager',
          name: 'test-person',
          addFields: [
            {
              name: '_friend',
              type: 'joinByOne',
              withType: 'test-person',
              idField: 'friendId',
              label: 'Friend'
            }
          ]
        }
      },
      afterInit: function(callback) {
        assert(genex.docs);
        genex.argv._ = [];
        return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        done();
      }
    });
  });

  it('should be able to use db to insert documents', function(done) {
    var testItems = [
      {
        _id: 'lori',
        slug: 'lori',
        published: true,
        type: 'test-person',
        firstName: 'Lori',
        lastName: 'Pizzaroni',
        age: 32,
        alive: true
      },
      {
        _id: 'larry',
        slug: 'larry',
        published: true,
        type: 'test-person',
        firstName: 'Larry',
        lastName: 'Cherber',
        age: 28,
        alive: true
      },
      {
        _id: 'carl',
        slug: 'carl',
        published: true,
        type: 'test-person',
        firstName: 'Carl',
        lastName: 'Sagan',
        age: 62,
        alive: false,
        friendId: 'larry'
      }
    ];

    genex.docs.db.insert(testItems, function(err) {
      assert(!err);
      done();
    });
  });

  it('should be able to lock a document', function(done) {
    var req = genex.tasks.getReq();
    genex.docs.lock(req, 'lori', 'abc', function(err) {
      assert(!err);
      done();
    });
  });

  it('should not be able to lock a document with a different contextId right away', function(done) {
    var req = genex.tasks.getReq();
    genex.docs.lock(req, 'lori', 'def', function(err) {
      assert(err);
      assert(err === 'locked');
      done();
    });
  });

  it('should be able to lock a document with a different contextId after 3 seconds with a timeout of 2', function(done) {
    var req = genex.tasks.getReq();
    setTimeout(attempt, 3000);
    function attempt() {
      genex.docs.lock(req, 'lori', 'def', function(err) {
        assert(!err);
        done();
      });
    }
  });

  // Now `def` has the lock

  it('should not be able to lock a document with a different contextId after 3 seconds with a timeout of 2 if there is a refresh each second', function(done) {
    var req = genex.tasks.getReq();
    var interval = setInterval(refresh, 1000);
    setTimeout(attempt, 3000);
    function attempt() {
      genex.docs.lock(req, 'lori', 'ghi', function(err) {
        assert(err);
        assert(err === 'locked');
        clearInterval(interval);
        done();
      });
    }
    function refresh() {
      genex.docs.verifyLock(req, 'lori', 'def', function(err) {
        assert(!err);
      });
    }
  });

});
