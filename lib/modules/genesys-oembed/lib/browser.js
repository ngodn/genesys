var _ = require('@sailshq/lodash');

module.exports = function(self, options) {

  // Push assets to the browser. Called by `afterConstruct`.

  self.pushAssets = function() {
    self.pushAsset('script', 'always', { when: 'always' });
    self.pushAsset('stylesheet', 'always', { when: 'always' });
  };

  // Create the browser-side `genex.oembed` singleton, enabling
  // calls to `genex.oembed.query` and `genex.oembed.queryAndPlay`.
  // Called by `afterConstruct`.

  self.pushCreateSingleton = function() {
    _.defaults(options, { browser: {} });
    _.extend(options.browser, {
      action: self.action
    });
    self.genex.push.browserCall('always', 'genex.create(?, ?)', self.__meta.name, options.browser);
  };

};
