var async = require('async');

// Properly clean up an genesys instance and drop its
// database collections to create a sane environment for the next test.
// Drops the collections, not the entire database, to avoid problems
// when testing something like a mongodb hosting environment with
// credentials per database.

function destroy(genex, done) {
  if (!genex) {
    done();
    return;
  }
  return async.series([
    drop,
    destroy
  ], function(err) {
    if (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    }
    return done();
  });
  function drop(callback) {
    if (!(genex.db && genex.db.collections)) {
      return callback(null);
    }
    return genex.db.collections(function(err, collections) {
      if (err) {
        return callback(err);
      }

      // drop the collections
      return async.eachSeries(collections, function(collection, callback) {
        if (!collection.collectionName.match(/^system\./)) {
          return collection.drop(callback);
        }
        return setImmediate(callback);
      }, callback);
    });
  }
  function destroy(callback) {
    if (!genex.destroy) {
      return callback(null);
    }
    return genex.destroy(callback);
  }
};

module.exports = {
  destroy: destroy,
  timeout: (process.env.TEST_TIMEOUT && parseInt(process.env.TEST_TIMEOUT)) || 5000
};
