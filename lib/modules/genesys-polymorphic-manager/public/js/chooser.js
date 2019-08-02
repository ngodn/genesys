genex.define('genesys-polymorphic-manager-chooser', {
  extend: 'genesys-doc-type-manager-chooser',
  autocomplete: false,
  construct: function(self, options) {
    self.launchBrowser = function() {
      return self.convertInlineRelationships(function(err) {
        if (err) {
          genex.notify('Please address errors first.', { type: 'error' });
          return;
        }
        return genex.create('genesys-polymorphic-manager-manager-modal', {
          chooser: self,
          action: self.action,
          body: {
            limit: self.limit,
            field: self.field
          },
          transition: 'slide'
        });
      });
    };
  }
});
