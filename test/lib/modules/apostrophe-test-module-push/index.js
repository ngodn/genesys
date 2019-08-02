module.exports = {
  construct: function(self, options) {
    // Set property
    self.color = 'red';

    // Push an asset
    self.pushAsset('stylesheet', 'test', { when: 'always' });

    // Attach to genex
    self.genex.test = self;
  }
};
