var _ = require('@sailshq/lodash');

module.exports = function(self, options) {
  self.pushAssets = function() {
    self.pushAsset('script', 'user', { when: 'user' });
  };

  self.pushCreateSingleton = function() {
    _.defaults(options, { browser: {} });
    _.extend(options.browser, {
      action: self.action,
      trashInSchema: self.options.trashInSchema
    });
    self.genex.push.browserCall('user', 'genex.docs = genex.create("apostrophe-docs", ?)', options.browser);
  };

};
