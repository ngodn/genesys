module.exports = function(self, options) {
  self.pushAssets = function() {
    self.pushAsset('script', 'always', { when: 'always' });
    self.genex.push.browserCall('always', 'genex.searchSuggestions = ?', self.options.suggestions);
  };
};
