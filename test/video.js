var t = require('../test-lib/test.js');
var assert = require('assert');

var genex;

describe('Video Field', function() {

  after(function(done) {
    return t.destroy(genex, done);
  });

  this.timeout(t.timeout);

  it('should be a property of the genex object', function(done) {

    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      modules: {
        'genesys-express': {
          port: 7900
        }
      },
      afterInit: function(callback) {
        assert(genex.videoFields);
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

  it('schema field should accept a valid video', function(done) {
    var req = genex.tasks.getReq();
    var object = {
      url: 'https://www.youtube.com/watch?v=mrVSt0pbo1g&t=38s',
      title: 'Simpsons: The PTA Has Disbanded!',
      thumbnail: 'http://youtube.com/imaginary-thumbnail.png'
    };
    var schema = [
      {
        name: 'video',
        type: 'video'
      }
    ];
    var output = {};
    genex.schemas.convert(
      req,
      schema,
      'form',
      {
        video: object
      },
      output,
      function(err) {
        assert(!err);
        assert(output.video.url === 'https://www.youtube.com/watch?v=mrVSt0pbo1g&t=38s');
        done();
      }
    );
  });

  it('schema field should not panic if video is absent', function(done) {
    var req = genex.tasks.getReq();
    var schema = [
      {
        name: 'video',
        type: 'video'
      }
    ];
    var output = {};
    genex.schemas.convert(
      req,
      schema,
      'form',
      {},
      output,
      function(err) {
        assert(!err);
        assert(!output.video);
        done();
      }
    );
  });

  it('schema field should complain if video is absent and required', function(done) {
    var req = genex.tasks.getReq();
    var schema = [
      {
        name: 'video',
        type: 'video',
        required: true
      }
    ];
    var output = {};
    genex.schemas.convert(
      req,
      schema,
      'form',
      {},
      output,
      function(err) {
        assert(err);
        assert(err === 'video.required');
        assert(!output.video);
        done();
      }
    );
  });

});
