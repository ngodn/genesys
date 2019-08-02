var t = require('../test-lib/test.js');
var assert = require('assert');
var request = require('request');

var genex;

describe('Soft Redirects', function() {

  this.timeout(t.timeout);

  after(function(done) {
    return t.destroy(genex, done);
  });

  it('should exist', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      modules: {
        'genesys-express': {
          port: 7900,
          secret: 'test'
        },
        'genesys-pages': {
          park: [
            {
              parkedId: 'child',
              title: 'Child',
              slug: '/child',
              type: 'default',
              published: true
            }
          ]
        }
      },
      afterInit: function(callback) {
        assert(genex.modules['genesys-soft-redirects']);
        genex.argv._ = [];
        return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        done();
      }
    });
  });

  it('should be able to serve the /child page (which also populates historicUrls)', function(done) {
    return request('http://localhost:7900/child', function(err, response, body) {
      assert(!err);
      // Is our status code good?
      assert.equal(response.statusCode, 200);
      // Did we get our page back?
      assert(body.match(/Default Page Template/));
      return done();
    });
  });

  it('should be able to change the URL via db', function() {
    return genex.docs.db.update({ slug: '/child' }, { $set: { slug: '/child-moved' } });
  });

  it('should be able to serve the page at its new URL', function(done) {
    return request('http://localhost:7900/child-moved', function(err, response, body) {
      assert(!err);
      // Is our status code good?
      assert.equal(response.statusCode, 200);
      // Did we get our page back?
      assert(body.match(/Default Page Template/));
      return done();
    });
  });

  it('should be able to serve the page at its old URL too, via redirect', function(done) {
    return request({
      url: 'http://localhost:7900/child',
      followRedirect: false
    }, function(err, response, body) {
      assert(!err);
      // Is our status code good?
      assert.equal(response.statusCode, 302);
      // Are we going to be redirected to our page?
      assert.equal(response.headers['location'], '/child-moved');
      return done();
    });
  });

});

describe('Soft Redirects - with `statusCode` option', function() {

  this.timeout(t.timeout);

  after(function(done) {
    return t.destroy(genex, done);
  });

  it('should exist', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      modules: {
        'genesys-express': {
          port: 7900,
          secret: 'test'
        },
        'genesys-pages': {
          park: [
            {
              parkedId: 'child',
              title: 'Child',
              slug: '/child',
              type: 'default',
              published: true
            }
          ]
        },
        'genesys-soft-redirects': {
          statusCode: 301
        }
      },
      afterInit: function(callback) {
        assert(genex.modules['genesys-soft-redirects']);
        assert.equal(genex.modules['genesys-soft-redirects'].options.statusCode, 301);
        genex.argv._ = [];
        return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        done();
      }
    });
  });

  it('should be able to serve the /child page (which also populates historicUrls)', function(done) {
    return request('http://localhost:7900/child', function(err, response, body) {
      assert(!err);
      // Is our status code good?
      assert.equal(response.statusCode, 200);
      // Did we get our page back?
      assert(body.match(/Default Page Template/));
      return done();
    });
  });

  it('should be able to change the URL via db', function() {
    return genex.docs.db.update({ slug: '/child' }, { $set: { slug: '/child-moved' } });
  });

  it('should be able to serve the page at its old URL too, via redirect', function(done) {
    return request({
      url: 'http://localhost:7900/child',
      followRedirect: false
    }, function(err, response, body) {
      assert(!err);
      // Is our status code good?
      assert.equal(response.statusCode, 301);
      // Are we going to be redirected to our page?
      assert.equal(response.headers['location'], '/child-moved');
      return done();
    });
  });

});
