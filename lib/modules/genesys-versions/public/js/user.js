// A singleton that provides a jQuery click handler to open the
// version editor when [data-genex-versions-page="id"] is clicked,
// and also an `edit` method to be invoked by
// [genesys-pieces-editor-modal](https://docs.apostrophecms.org/apostrophe/modules/genesys-pieces/browser-genesys-pieces-editor-modal).

genex.define('genesys-versions', {

  extend: 'genesys-context',

  beforeConstruct: function(self, options) {
    self.options = options;
  },

  afterConstruct: function(self) {
    self.addLinks();
  },

  construct: function(self) {
    self.addLinks = function() {
      genex.ui.link('genex-versions', 'page', function() {
        self.edit(genex.pages.page._id);
      });
      // pieces subclasses can be many and varied, so they add
      // their own links to trigger the versions editor.
    };

    self.edit = function(id, afterRevert) {
      if (!afterRevert) {
        afterRevert = function() {
          window.location.reload(true);
        };
      }
      genex.create('genesys-versions-editor', {
        action: self.action,
        _id: id,
        afterRevert: afterRevert
      });
    };

    genex.versions = self;
  }
});
