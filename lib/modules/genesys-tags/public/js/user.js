genex.define('apostrophe-tags', {
  extend: 'apostrophe-context',
  afterConstruct: function(self) {
    self.enableClickHandlers();
  },
  construct: function(self, options) {
    self.enableClickHandlers = function() {
      genex.adminBar.link('apostrophe-tags', function() {
        self.manage();
      });
    };

    self.manage = function() {
      genex.create('apostrophe-tags-manager-modal', options);
    };
  }
});
