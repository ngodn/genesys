// Pushes utility methods to the browser as the `genex.utils` singleton. This module
// is separate from [genesys-utils](https://docs.apostrophecms.org/apostrophe/modules/genesys-utils) because that
// module is initialized very early, before it is possible to push assets to the browser.

module.exports = {
  construct: function(self, options) {
    self.pushAsset('script', 'lean', { when: 'lean' });
    self.pushAsset('script', 'always');
    // Extend the lean genex.utils object with the properties of the
    // legacy moog one, so that everybody sees what they expect to see
    self.genex.push.browserCall('always', 'genex.utils.assign(genex.utils, genex.create("genesys-browser-utils"))');
  }
};
