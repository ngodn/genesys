var t = require('../test-lib/test.js');
var assert = require('assert');
var genex;

describe('Email', function() {

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
        'apostrophe-express': {
          port: 7900
        },
        'apostrophe-email': {
          nodemailer: {
            streamTransport: true,
            buffer: true,
            newline: 'unix'
          }
        },
        'email-test': {}
      },
      afterInit: function(callback) {
        assert(genex.modules['apostrophe-email']);
        // In tests this will be the name of the test file,
        // so override that in order to get apostrophe to
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

  it('can send email on behalf of a module', function(done) {
    genex.modules['email-test'].email(genex.tasks.getReq(),
      'welcome',
      {
        name: 'Fred Astaire'
      },
      {
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Welcome Aboard'
      },
      function(err, info) {
        assert(!err);
        assert(info);
        var message = info.message.toString();
        assert(message.match(/Fred Astaire/));
        assert(message.match(/Subject: Welcome Aboard/));
        assert(message.match(/From: test@example\.com/));
        assert(message.match(/To: recipient@example\.com/));
        assert(message.match(/\[http:\/\/example\.com\/\]/));
        done();
      }
    );
  });
  it('can do it with promises', function() {
    return genex.modules['email-test'].email(genex.tasks.getReq(),
      'welcome',
      {
        name: 'Fred Astaire'
      },
      {
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Welcome Aboard'
      }
    ).then(function(info) {
      assert(info);
      var message = info.message.toString();
      assert(message.match(/Fred Astaire/));
      assert(message.match(/Subject: Welcome Aboard/));
      assert(message.match(/From: test@example\.com/));
      assert(message.match(/To: recipient@example\.com/));
      assert(message.match(/\[http:\/\/example\.com\/\]/));
      return true;
    });
  });
});
