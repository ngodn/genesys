module.exports = function(self, options) {

  self.pushAsset('script', 'user', { when: 'user' });
  self.pushAsset('script', 'editor', { when: 'user' });

  self.pushAsset('stylesheet', 'user', { when: 'user' });

  var browserOptions = {
    action: self.action,
    messages: {
      tryAgain: self.genex.i18n.__('Server error, please try again.')
    }
  };

  self.genex.push.browserCall('user', 'genex.create("apostrophe-versions", ?)', browserOptions);

};
