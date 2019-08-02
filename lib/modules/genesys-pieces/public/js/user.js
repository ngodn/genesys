// The browser-side doc type manager for a type of piece. Provides jQuery event handlers
// for edit, rescue, create and version rollback based on data attributes that can
// appear anywhere, which is useful for contextual pieces.

genex.define('genesys-pieces', {

  extend: 'genesys-doc-type-manager',

  afterConstruct: function(self) {
    self.clickHandlers();
  },

  construct: function(self, options) {

    self.options = options;
    self.name = self.options.name;

    self.clickHandlers = function() {
      genex.adminBar.link(self.__meta.name, function() {
        self.manage();
      });
      // The rest of these are not part of the admin bar, follow our own convention
      genex.ui.link('genex-manage', self.name, function($button, _id) {
        self.manage();
      });
      genex.ui.link('genex-edit', self.name, function($button, _id) {
        self.edit(_id);
      });
      genex.ui.link('genex-rescue', self.name, function($button, _id) {
        self.rescue(_id);
      });
      genex.ui.link('genex-create', self.name, function($button) {
        self.create();
      });
      genex.ui.link('genex-publish', self.name, function($button, id) {
        var piece = { _id: id };
        self.api('publish', piece, function(data) {
          if (data.status !== 'ok') {
            return genex.notify('An error occurred while publishing the page: ' + data.status, { type: 'error' });
          }
          // Go to the new page
          window.location.reload(true);
        });
      });
      genex.ui.link('genex-versions', self.name, function($button, id) {
        genex.versions.edit(id, function() {
          genex.change(self.name);
        });
      });
      genex.ui.link('genex-trash', self.name, function($button, id) {
        if (!confirm("Are you sure you want to trash this " + self.options.label + "?")) {
          return;
        }

        var piece = {
          _id: id
        };

        genex.ui.globalBusy(true);

        return self.api('trash', piece, function(result) {
          genex.ui.globalBusy(false);
          if (result.status !== 'ok') {
            genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
            return;
          }
          window.location.href = genex.pages.page._url;
        }, function() {
          genex.ui.globalBusy(false);
          genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });

        });
      });
    };

    self.manage = function() {
      return self.getTool('manager-modal');
    };

    self.edit = function(_id) {
      return self.getTool('editor-modal', { _id: _id });
    };

    self.create = function() {
      return self.getTool('editor-modal', { create: true });
    };

    self.rescue = function(_id) {
      if (self.rescuing) {
        return;
      }
      self.rescuing = true;
      genex.ui.globalBusy(true);
      self.api('rescue', { _id: _id }, function(result) {
        self.rescuing = false;
        genex.ui.globalBusy(false);
        if (result.status !== 'ok') {
          genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
          return;
        } else {
          genex.notify('That item has been rescued from the trash.', { type: 'success', dismiss: 3 });
        }
        genex.change(self.name);
      }, function() {
        self.rescuing = false;
        genex.ui.globalBusy(false);
        genex.notify('An error occurred. Please try again', { type: 'error', dismiss: true });

      });
    };

    self.launchBatchPermissionsModal = function(data, callback) {
      return genex.create('genesys-pieces-batch-permissions-modal',
        _.assign({}, self.options, {
          schema: self.options.batchPermissionsSchema,
          manager: self,
          body: data,
          after: callback
        })
      );
    };

  }
});
