var t = require('../test-lib/test.js');
var assert = require('assert');
var async = require('async');
var Promise = require('bluebird');
var _ = require('@sailshq/lodash');
var genex;

describe('Locks', function() {

  this.timeout(t.timeout);

  after(function(done) {
    return t.destroy(genex, done);
  });

  it('should be a property of the genex object', function(done) {
    this.timeout(t.timeout);
    this.slow(2000);

    genex = require('../index.js')({
      root: module,
      shortName: 'test',
      modules: {
        'genesys-express': {
          port: 7900
        },
        // Make some subclasses of the locks module. NORMALLY A BAD IDEA. But
        // we're doing it to deliberately force them to contend with each other,
        // rather than just throwing an error saying "hey you have this lock now"
        'genesys-locks-1': {
          extend: 'genesys-locks',
          alias: 'locks1'
        },
        'genesys-locks-2': {
          extend: 'genesys-locks',
          alias: 'locks2'
        },
        'genesys-locks-3': {
          extend: 'genesys-locks',
          alias: 'locks3'
        }
      },
      afterInit: function(callback) {
        assert(genex.modules['genesys-locks']);
        assert(genex.modules['genesys-locks-1']);
        assert(genex.modules['genesys-locks-2']);
        assert(genex.modules['genesys-locks-3']);

        // In tests this will be the name of the test file,
        // so override that in order to get genesys to
        // listen normally and not try to run a task. -Tom
        genex.argv._ = [];
        return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        done();
      }
    });
  });

  it('cleanup', function(done) {
    genex.locks.db.remove({}, function(err) {
      assert(!err);
      done();
    });
  });

  it('should allow a single lock without contention uneventfully', function(done) {
    var locks = genex.modules['genesys-locks'];
    return async.series([ lock, unlock ], function(err) {
      assert(!err);
      done();
    });
    function lock(callback) {
      return locks.lock('test', callback);
    }
    function unlock(callback) {
      return locks.unlock('test', callback);
    }
  });

  it('should allow two differently-named locks uneventfully', function(done) {
    var locks = genex.modules['genesys-locks'];
    return async.series([ lock1, lock2, unlock1, unlock2 ], function(err) {
      assert(!err);
      done();
    });
    function lock1(callback) {
      return locks.lock('test1', callback);
    }
    function unlock1(callback) {
      return locks.unlock('test1', callback);
    }
    function lock2(callback) {
      return locks.lock('test2', callback);
    }
    function unlock2(callback) {
      return locks.unlock('test2', callback);
    }
  });

  it('should flunk a second lock by the same module', function(done) {
    var locks = genex.modules['genesys-locks'];
    return async.series([ lock, lockAgain, unlock, unlockAgain ], function(err) {
      assert(!err);
      done();
    });
    function lock(callback) {
      return locks.lock('test', callback);
    }
    function lockAgain(callback) {
      return locks.lock('test', function(err) {
        // SHOULD fail
        assert(err);
        return callback(null);
      });
    }
    function unlock(callback) {
      return locks.unlock('test', callback);
    }
    function unlockAgain(callback) {
      return locks.unlock('test', function(err) {
        // SHOULD fail
        assert(err);
        return callback(null);
      });
    }
  });

  it('four parallel lock calls via the different modules should all succeed but not simultaneously', function(done) {
    var one = genex.modules['genesys-locks'];
    var two = genex.modules['genesys-locks-1'];
    var three = genex.modules['genesys-locks-2'];
    var four = genex.modules['genesys-locks-3'];
    var active = 0;
    var successful = 0;
    attempt(one);
    attempt(two);
    attempt(three);
    attempt(four);
    function attempt(locks) {
      return locks.lock('test', function(err) {
        assert(!err);
        active++;
        assert(active === 1);
        setTimeout(release, 75 + Math.random() * 50);
      });
      function release() {
        // We have to decrement this before we start the call to
        // locks.unlock because otherwise the callback for one of our
        // peers' insert attempts may succeed before the callback for
        // remove, leading to a false positive for test failure. -Tom
        active--;
        return locks.unlock('test', function(err) {
          assert(!err);
          successful++;
          if (successful === 4) {
            done();
          }
        });
      }
    }
  });
  it('four parallel lock calls via the different modules should all succeed but not simultaneously, even when the idleTimeout is short', function(done) {
    var one = genex.modules['genesys-locks'];
    var two = genex.modules['genesys-locks-1'];
    var three = genex.modules['genesys-locks-2'];
    var four = genex.modules['genesys-locks-3'];
    var active = 0;
    var successful = 0;
    attempt(one);
    attempt(two);
    attempt(three);
    attempt(four);
    function attempt(locks) {
      return locks.lock('test', { idleTimeout: 50 }, function(err) {
        assert(!err);
        active++;
        assert(active === 1);
        setTimeout(release, 75 + Math.random() * 50);
      });
      function release() {
        // We have to decrement this before we start the call to
        // locks.unlock because otherwise the callback for one of our
        // peers' insert attempts may succeed before the callback for
        // remove, leading to a false positive for test failure. -Tom
        active--;
        return locks.unlock('test', function(err) {
          assert(!err);
          successful++;
          if (successful === 4) {
            done();
          }
        });
      }
    }
  });

  it('with promises: should flunk a second lock by the same module', function() {
    var locks = genex.modules['genesys-locks'];
    return Promise.try(function() {
      return locks.lock('test');
    }).then(function() {
      return locks.lock('test')
        .catch(function(err) {
          // SHOULD fail
          assert(err);
        });
    }).then(function() {
      return locks.unlock('test');
    }).then(function() {
      return locks.unlock('test')
        .catch(function(err) {
          // SHOULD fail
          assert(err);
        });
    });
  });

  it('withLock method should run a function inside a lock', function() {
    var locks = genex.modules['genesys-locks'];
    return locks.withLock('test-lock', function() {
      return Promise.delay(50).then(function() {
        return 'result';
      });
    }).then(function(result) {
      assert(result === 'result');
    });
  });

  it('withLock method should be able to run again (lock released)', function() {
    var locks = genex.modules['genesys-locks'];
    return locks.withLock('test-lock', function() {
      return Promise.delay(50).then(function() {
        return 'result';
      });
    }).then(function(result) {
      assert(result === 'result');
    });
  });

  it('withLock method should hold the lock (cannot relock within fn)', function() {
    var locks = genex.modules['genesys-locks'];
    return locks.withLock('test-lock', function() {
      return Promise.delay(50).then(function() {
        return locks.lock('test-lock').then(function() {
          assert(false);
        }).catch(function(e) {
          assert(e);
        });
      });
    });
  });

  it('callbacks: withLock method should run a function inside a lock', function(done) {
    var locks = genex.modules['genesys-locks'];
    return locks.withLock('test-lock', function(callback) {
      return setTimeout(function() {
        return callback(null, 'result');
      }, 50);
    }, function(err, result) {
      assert(!err);
      assert(result === 'result');
      done();
    });
  });

  it('all locks should be gone from the database', function() {
    var locks = genex.modules['genesys-locks'];
    return locks.db.find({}).toArray().then(function(locks) {
      assert(!locks.length);
      assert(!_.keys(locks.intervals).length);
    });
  });

});
