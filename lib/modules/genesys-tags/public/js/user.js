genex.define('genesys-tags', {
  extend: 'genesys-context',
  afterConstruct: function(self) {
    self.enableClickHandlers();
  },
  construct: function(self, options) {
    self.enableClickHandlers = function() {
      genex.adminBar.link('genesys-tags', function() {
        self.manage();
      });
    };

    self.manage = function() {
      genex.create('genesys-tags-manager-modal', options);
    };
  }
});
