var _ = require('@sailshq/lodash');

module.exports = {
  // Not a real doc type name. We won't actually make
  // cursor instances for this manager. Instead it will
  // only be used to implement joins, and most of the
  // logic for making those polymorphic is in the
  // schemas module.
  name: 'genesys-polymorphic',
  extend: 'genesys-doc-type-manager',
  construct: function(self, options) {
    self.pushAsset('script', 'chooser-modal', { when: 'user' });
    self.pushAsset('stylesheet', 'polymorphic-manager', { when: 'user' });
    self.renderRoute('post', 'polymorphic-chooser-modal', function(req, res, next) {
      var limit = self.genex.launder.integer(req.body.limit);
      var field = req.body.field;
      if (!self.genex.utils.isBlessed(req, _.omit(field, 'hints'), 'join')) {
        return next('notfound');
      }
      var types = _.map(field.withType, function(name) {
        return self.genex.docs.getManager(name);
      });
      return next(null, {
        template: 'chooserModal',
        data: {
          options: self.options,
          limit: limit,
          types: types
        }
      });
    });
  }
};
