var _ = require('@sailshq/lodash');

module.exports = {

  extend: 'apostrophe-pieces-cursor',

  construct: function(self, options) {

    self.addFilter('minSize', {
      finalize: function() {
        var minSize = self.get('minSize');
        if (!minSize) {
          return;
        }
        var $nin = _.filter(_.keys(self.genex.attachments.sized), function(key) {
          return self.genex.attachments.sized[key];
        });
        var criteria = {
          $or: [
            {
              'attachment.extension': { $nin: $nin }
            },
            {
              'attachment.width': { $gte: minSize[0] },
              'attachment.height': { $gte: minSize[1] }
            }
          ]
        };
        self.and(criteria);
      },
      safeFor: 'public',
      launder: function(a) {
        if (!Array.isArray(a)) {
          return undefined;
        }
        if (a.length !== 2) {
          return undefined;
        }
        return [ self.genex.launder.integer(a[0]), self.genex.launder.integer(a[1]) ];
      }
    });

  }

};
