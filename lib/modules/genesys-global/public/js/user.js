genex.define('genesys-global', {
  extend: 'genesys-pieces',

  afterConstruct: function(self) {
    self.addClickHandlers();
  },

  beforeConstruct: function(self, options) {
    self.options = options;
  },

  construct: function(self, options) {

    self._id = self.options._id;

    self.manage = function() {
      var hasFields = _.find(self.options.schema, function(field) {
        return !field.contextual;
      });
      if ((!hasFields) && (!options.alwaysShowEditor)) {
        // No schema fields to edit, so skip all the way to version management for
        // shared global content like the header and footer rather than
        // displaying an empty modal
        return genex.versions.edit(self._id);
      }
      // Go directly to editing the one and only global piece
      return self.edit(self._id);
    };

    self.addClickHandlers = function() {
      genex.ui.link('genex-versions', 'global', function($button) {
        genex.versions.edit(self._id);
      });
    };

  }
});
