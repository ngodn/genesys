genex.define('genesys-any-page-manager', {
  extend: 'genesys-doc-type-manager',

  construct: function(self, options) {

    var superGetTool = self.getTool;
    self.getTool = function(name, options, callback) {
      if (name === 'manager-modal') {
        return genex.pages.chooserModal(options);
      }
      return superGetTool(name, options, callback);
    };

    var superGetToolType = self.getToolType;
    self.getToolType = function(name) {
      if (name === 'manager-modal') {
        return 'genesys-pages-reorganize';
      }
      return superGetToolType(name);
    };
  }
});
