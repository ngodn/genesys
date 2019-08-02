genex.define('genesys-tags-manager-modal', {
  extend: 'genesys-modal',
  source: 'manager',
  construct: function(self, options) {
    self.beforeShow = function(callback) {
      self.$results = self.$el.find('[data-genex-tags-view]');
      self.$search = self.$el.find('[data-genex-tag-add-field]');
      self.addClickHandlers();
      self.$search.on('keyup', function() {
        self.refresh();
      });
      return self.refresh(callback);
    };

    self.addClickHandlers = function() {
      self.link('genex-tag-add', self.add);
      self.link('genex-tag-rename', self.rename);
      self.link('genex-tag-edit', self.edit);
      self.link('genex-tag-delete', self.delete);
    };

    self.refresh = function(callback) {
      // TODO implement options
      var listOptions = {};
      if (self.$search.val()) {
        listOptions.contains = self.$search.val();
      }
      if (!listOptions.contains || !listOptions.contains.length) {
        listOptions.all = true;
      }
      self.beforeRefresh(listOptions);
      return self.api('listTags', listOptions, function(response) {
        if (response.status !== 'ok') {
          genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
          return;
        }
        self.$results.html(response.data.results);
        genex.emit('enhance', self.$results);
        self.resizeContentHeight();
        self.afterRefresh();
        if (callback) {
          return callback();
        }
      });
    };

    self.add = function($el) {
      var value = $el.siblings('[data-genex-tag-add-field]').val();
      if (value) {
        return self.api('addTag', { tag: value }, function(response) {
          if (response.status !== 'ok') {
            genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
            return;
          }
          // Reset value, since we added the tag
          self.$search.val('');
          self.refresh();
        });
      } else {
        genex.notify('Please, fill in the input before adding a tag.', { type: 'error', dismiss: true });
      }
    };

    self.edit = function($el, value) {
      self.$el.find('[data-genex-tag]')
        .removeClass('genex-active')
        .find('input')
        .attr('disabled', true);
      $el.parents('[data-genex-tag]')
        .addClass('genex-active')
        .find('input')
        .attr('disabled', false)
        .focus();
    };

    self.rename = function($el, value) {
      var $tag = $el.parents('[data-genex-tag]');
      var tag = $tag.data('genex-tag');
      var newTag = $tag.find('input').val();
      if (tag === newTag) {
        return;
      }
      return self.api('renameTag', { tag: tag, newTag: newTag }, function(response) {
        if (response.status !== 'ok') {
          genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
          return;
        }
        self.refresh();
      });
    };

    self.delete = function($el, value) {
      if (!confirm('Are you sure you want to delete this tag?')) {
        return;
      }
      return self.api('deleteTag', { tag: value }, function(response) {
        if (response.status !== 'ok') {
          genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
          return;
        }
        self.refresh();
      });
    };

    self.beforeRefresh = function(options) {
      // Overridable hook
    };

    self.afterRefresh = function() {
      // Overridable hook
    };
  }
});
