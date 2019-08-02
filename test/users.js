var t = require('../test-lib/test.js');
var assert = require('assert');
var _ = require('@sailshq/lodash');

var genex;

describe('Users', function() {

  // Password hashing can be slow
  this.timeout(20000);

  after(function(done) {
    return t.destroy(genex, done);
  });

  // EXISTENCE

  it('should initialize', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      modules: {
        'genesys-express': {
          secret: 'xxx',
          port: 7900
        }
      },
      afterInit: function(callback) {
        assert(genex.modules['genesys-users']);
        genex.argv._ = [];
        assert(genex.users.safe.remove);
        return genex.users.safe.remove({}, callback);
        // return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        done();
      }
    });
  });

  var janeOne;

  // Test pieces.newInstance()
  it('should be able to insert a new user', function(done) {
    assert(genex.users.newInstance);
    var user = genex.users.newInstance();
    assert(user);

    user.firstName = 'Jane';
    user.lastName = 'Doe';
    user.title = 'Jane Doe';
    user.username = 'JaneD';
    user.password = '123password';
    user.email = 'jane@aol.com';

    assert(user.type === 'genesys-user');
    assert(genex.users.insert);
    genex.users.insert(genex.tasks.getReq(), user, function(err) {
      assert(!err);
      janeOne = user;
      done();
    });

  });

  // verify a user's password
  // fail to verify the wrong password
  // fail to insert another user with the same email address
  // succeed in updating a user's property
  // verify a user's password after that user has been updated
  // change an existing user's password and verify the new password
  // verify that the user doc does not contain a password property at all

  // retrieve a user by their username
  it('should be able to retrieve a user by their username', function(done) {
    genex.users.find(genex.tasks.getReq(), { username: 'JaneD' })
      .toObject(function(err, user) {
        assert(!err);
        assert(user);
        assert(user.username === 'JaneD');
        done();
      }
      );
  });

  it('should verify a user password', function(done) {
    genex.users.find(genex.tasks.getReq(), { username: 'JaneD' })
      .toObject(function(err, user) {
        assert(!err);
        assert(user);
        assert(user.username === 'JaneD');

        genex.users.verifyPassword(user, '123password', function(err) {
          assert(!err);
          done();
        });
      });
  });

  it('should not verify an incorrect user password', function(done) {
    genex.users.find(genex.tasks.getReq(), { username: 'JaneD' })
      .toObject(function(err, user) {
        assert(!err);
        assert(user);
        assert(user.username === 'JaneD');

        genex.users.verifyPassword(user, '321password', function(err) {
          assert(err);
          done();
        });
      });
  });

  it('should not be able to insert a new user if their email already exists', function(done) {
    assert(genex.users.newInstance);
    var user = genex.users.newInstance();
    assert(user);

    user.firstName = 'Dane';
    user.lastName = 'Joe';
    user.title = 'Dane Joe';
    user.username = 'DaneJ';
    user.password = '321password';
    user.email = 'jane@aol.com';
    assert(user.type === 'genesys-user');

    assert(genex.users.insert);
    genex.users.insert(genex.tasks.getReq(), user, function(err) {
      assert(err);
      done();
    });
  });

  it('should be able to move a user to the trash', function(done) {
    genex.users.trash(genex.tasks.getReq(), janeOne._id, function(err) {
      assert(!err);
      return genex.docs.db.findOne({_id: janeOne._id, trash: true}, function(err, doc) {
        assert(!err);
        assert(doc);
        done();
      });
    });
  });

  it('should be able to insert a user with a previously used email if the other is in the trash', function(done) {
    var user = genex.users.newInstance();

    user.firstName = 'Dane';
    user.lastName = 'Joe';
    user.title = 'Dane Joe';
    user.username = 'DaneJ';
    user.password = '321password';
    user.email = 'jane@aol.com';
    genex.users.insert(genex.tasks.getReq(), user, function(err) {
      assert(!err);
      done();
    });
  });

  it('should be able to rescue the first user from the trash and the email should be deduplicated', function(done) {
    genex.users.rescue(genex.tasks.getReq(), janeOne._id, function(err) {
      assert(!err);
      return genex.docs.db.findOne({ _id: janeOne._id, trash: { $ne: true } }, function(err, doc) {
        assert(!err);
        assert(doc);
        assert(doc.email.match(/deduplicate.*jane/));
        done();
      });
    });
  });

  it('there should be two users in the safe at this point and neither with a null username', function(done) {
    genex.users.safe.find({}).toArray(function(err, docs) {
      assert(!err);
      assert(docs.length === 2);
      _.each(docs, function(doc) {
        assert(doc.username);
      });
      done();
    });
  });

  it('should be able to move a user to the trash', function(done) {
    genex.users.trash(genex.tasks.getReq(), janeOne._id, function(err) {
      assert(!err);
      return genex.docs.db.findOne({_id: janeOne._id, trash: true}, function(err, doc) {
        assert(!err);
        assert(doc);
        done();
      });
    });
  });

  it('should be able to insert a user with a previously used username if the other is in the trash', function(done) {
    var user = genex.users.newInstance();

    user.firstName = 'Jane';
    user.lastName = 'Doe';
    user.title = 'Jane Doe';
    user.username = 'JaneD';
    user.password = '321password';
    user.email = 'somethingelse@aol.com';
    genex.users.insert(genex.tasks.getReq(), user, function(err) {
      assert(!err);
      done();
    });
  });

  it('should be able to rescue the first user from the trash and the username should be deduplicated', function(done) {
    genex.users.rescue(genex.tasks.getReq(), janeOne._id, function(err) {
      assert(!err);
      return genex.docs.db.findOne({ _id: janeOne._id, trash: { $ne: true } }, function(err, doc) {
        assert(!err);
        assert(doc);
        assert(doc.username.match(/deduplicate.*JaneD/));
        done();
      });
    });
  });

  it('there should be three users in the safe at this point and none with a null username', function(done) {
    genex.users.safe.find({}).toArray(function(err, docs) {
      assert(!err);
      assert(docs.length === 3);
      _.each(docs, function(doc) {
        assert(doc.username);
      });
      done();
    });
  });

  it('should succeed in updating a users property', function(done) {
    genex.users.find(genex.tasks.getReq(), { username: 'JaneD' })
      .toObject(function(err, user) {
        assert(!err);
        assert(user);
        assert(user.username === 'JaneD');
        user.firstName = 'Jill';
        genex.users.update(genex.tasks.getReq(), user, function(err) {
          assert(!err);
          genex.users.find(genex.tasks.getReq(), { _id: user._id })
            .toObject(function(err, user) {
              assert(!err);
              assert(user);
              assert(user.firstName === 'Jill');
              done();
            });
        });
      });
  });

  it('should verify a user password after their info has been updated', function(done) {
    genex.users.find(genex.tasks.getReq(), { username: 'JaneD' })
      .toObject(function(err, user) {
        assert(!err);
        assert(user);
        assert(user.username === 'JaneD');

        genex.users.verifyPassword(user, '321password', function(err) {
          assert(!err);
          done();
        });
      });
  });

  // change an existing user's password and verify the new password
  it('should change an existing user password and verify the new password', function(done) {
    genex.users.find(genex.tasks.getReq(), { username: 'JaneD' })
      .toObject(function(err, user) {
        assert(!err);
        assert(user);
        assert(user.username === 'JaneD');
        assert(!user.password);
        user.password = 'password123';
        genex.users.update(genex.tasks.getReq(), user, function(err) {
          assert(!err);
          genex.users.find(genex.tasks.getReq(), { username: 'JaneD' })
            .toObject(function(err, user) {
              assert(!err);
              assert(user);
              genex.users.verifyPassword(user, 'password123', function(err) {
                assert(!err);
                done();
              });
            });
        });
      });
  });

});
