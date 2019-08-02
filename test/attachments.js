var t = require('../test-lib/test.js');
var assert = require('assert');

var genex;

describe('Attachment', function() {

  after(function(done) {
    return t.destroy(genex, done);
  });

  this.timeout(t.timeout);

  var uploadSource = __dirname + "/data/upload_tests/";
  var uploadTarget = __dirname + "/public/uploads/attachments/";
  var collectionName = 'aposAttachments';

  function wipeIt(callback) {
    deleteFolderRecursive(__dirname + '/public/uploads');

    function deleteFolderRecursive (path) {
      var files = [];
      if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function(file, index) {
          var curPath = path + "/" + file;
          if (fs.lstatSync(curPath).isDirectory()) { // recurse
            deleteFolderRecursive(curPath);
          } else { // delete file
            fs.unlinkSync(curPath);
          }
        });
        fs.rmdirSync(path);
      }
    }

    genex.db.collection(collectionName, function(err, collection) {
      assert(!err);
      assert(collection);
      collection.remove({}, callback);
    });

  }

  // after(wipeIt);

  it('should be a property of the genex object', function(done) {
    this.timeout(t.timeout);
    this.slow(2000);

    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      modules: {
        'apostrophe-express': {
          port: 7900
        }
      },
      afterInit: function(callback) {
        assert(genex.attachments);
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

  describe('wipe', function() {
    it('should clear previous material if any', function(done) {
      wipeIt(done);
    });
  });

  var fs = require('fs');

  describe('accept', function() {

    function accept(filename, callback) {
      return genex.attachments.insert(genex.tasks.getReq(), {
        name: filename,
        path: uploadSource + filename
      }, function(err, info) {
        assert(!err);
        var t = uploadTarget + info._id + '-' + info.name + '.' + info.extension;
        // file should be uploaded
        assert(fs.existsSync(t));

        // make sure it exists in mongo
        genex.db.collection(collectionName).findOne({
          _id: info._id
        }, function(err, result) {
          assert(!err);
          assert(result);

          return callback(result);
        });
      });
    }

    it('should upload a text file using the attachments api when user', function(done) {
      return accept('upload_apos_api.txt', function(result) {
        done();
      });
    });

    it('should upload an image file using the attachments api when user', function(done) {
      return accept('upload_image.png', function(result) {
        done();
      });
    });

    it('should not upload an exe file', function(done) {
      var filename = 'bad_file.exe';

      return genex.attachments.insert(genex.tasks.getReq(), {
        name: filename,
        path: uploadSource + filename
      }, function(err, info) {
        assert(err);
        assert(!info);
        done();
      });
    });

    it('should crop an image file when user', function(done) {
      return accept('crop_image.png', function(result) {
        var crop = { top: 10, left: 10, width: 80, height: 80 };

        return genex.attachments.crop(
          genex.tasks.getReq(),
          result._id,
          crop,
          function(err) {
            assert(!err);

            // make sure it exists in mongo
            genex.db.collection(collectionName).findOne({
              _id: result._id
            }, function(err, result) {
              assert(!err);
              assert(result);
              assert(result.crops.length);
              var t = uploadTarget + result._id + '-' + result.name + '.' + result.crops[0].left + '.' + result.crops[0].top + '.' + result.crops[0].width + '.' + result.crops[0].height + '.' + result.extension;
              assert(fs.existsSync(t));

              done();

            });
          }
        );
      });
    });

    it('should clone an attachment', function(done) {
      return accept('clone.txt', function(result) {

        return genex.attachments.clone(genex.tasks.getReq(), result, function(err, targetInfo) {
          assert(!err);
          assert(targetInfo._id !== result._id);

          // make sure it exists in mongo
          genex.db.collection(collectionName).findOne({
            _id: result._id
          }, function(err, result) {
            assert(!err);
            assert(result);
            var t = uploadTarget + result._id + '-' + result.name + '.' + result.extension;
            assert(fs.existsSync(t));

            done();
          });
        });
      });
    });

    it('should generate the "full" URL when no size specified for image', function() {
      var url = genex.attachments.url({
        group: 'images',
        name: 'test',
        extension: 'jpg',
        _id: 'test'
      });
      assert(url === '/uploads/attachments/test-test.full.jpg');
    });

    it('should generate the "one-half" URL when one-half size specified for image', function() {
      var url = genex.attachments.url({
        group: 'images',
        name: 'test',
        extension: 'jpg',
        _id: 'test'
      }, {
        size: 'one-half'
      });
      assert(url === '/uploads/attachments/test-test.one-half.jpg');
    });

    it('should generate the original URL when "original" size specified for image', function() {
      var url = genex.attachments.url({
        group: 'images',
        name: 'test',
        extension: 'jpg',
        _id: 'test'
      }, {
        size: 'original'
      });
      assert(url === '/uploads/attachments/test-test.jpg');
    });

    it('should generate the original URL when no size specified for pdf', function() {
      var url = genex.attachments.url({
        group: 'office',
        name: 'test',
        extension: 'pdf',
        _id: 'test'
      });
      assert(url === '/uploads/attachments/test-test.pdf');
    });

    it('should save and track docIds properly as part of an apostrophe-image', function() {
      var image = genex.images.newInstance();
      var req = genex.tasks.getReq();
      return genex.attachments.insert(genex.tasks.getReq(), {
        name: 'upload_image.png',
        path: uploadSource + 'upload_image.png'
      })
        .then(function(attachment) {
          assert(attachment);
          image.title = 'Test Image';
          image.attachment = attachment;
          return genex.images.insert(req, image);
        })
        .then(function(image) {
          assert(image);
          return genex.attachments.db.findOne({ _id: image.attachment._id });
        })
        .then(function(attachment) {
          assert(attachment.trash === false);
          assert(attachment.docIds);
          assert(attachment.docIds.length === 1);
          assert(attachment.docIds[0] === image._id);
          assert(attachment.trashDocIds);
          assert(attachment.trashDocIds.length === 0);
          try {
            var fd = fs.openSync(genex.rootDir + '/public' + genex.attachments.url(attachment, { size: 'original' }), 'r');
            assert(fd);
            fs.closeSync(fd);
          } catch (e) {
            assert(false);
          }
          return genex.images.trash(req, image._id);
        })
        .then(function() {
          return genex.attachments.db.findOne({ _id: image.attachment._id });
        })
        .then(function(attachment) {
          assert(attachment.trash);
          assert(attachment.docIds.length === 0);
          assert(attachment.trashDocIds.length === 1);
          try {
            fs.openSync(genex.rootDir + '/public' + genex.attachments.url(attachment, { size: 'original' }), 'r');
          } catch (e) {
            return true;
          }
          throw new Error('should not have been accessible');
        })
        .then(function() {
          return genex.images.rescue(req, image._id);
        })
        .then(function() {
          return genex.attachments.db.findOne({ _id: image.attachment._id });
        })
        .then(function(attachment) {
          assert(!attachment.trash);
          assert(attachment.docIds.length === 1);
          assert(attachment.trashDocIds.length === 0);
          try {
            var fd = fs.openSync(genex.rootDir + '/public' + genex.attachments.url(attachment, { size: 'original' }), 'r');
            assert(fd);
            fs.closeSync(fd);
          } catch (e) {
            assert(false);
          }
        });
    });

  });

});
