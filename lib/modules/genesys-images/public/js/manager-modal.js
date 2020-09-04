// Image Gallery

genex.define('genesys-images-manager-modal', {
  extend: 'genesys-pieces-manager-modal',

  construct: function(self, options) {

    // save manager so we can call edit() later
    self.manager = genex.docs.getManager(options.name);

    var superEnableButtonEvents = self.enableButtonEvents;
    self.enableButtonEvents = function() {
      // focus on single click
      self.$el.on('click', '[data-focus-' + options.name + ']', function(e) {
        // If the click was actually on the edit button, we should
        // focus and toggle the selection only if the image was not already
        // part of the selection. Otherwise images disappear from the
        // selection as they are edited which is very confusing. -Tom
        if ($(e.target).attr('data-genex-edit-genesys-image')) {
          var $checkbox = $(this).find('input[type="checkbox"]');
          if ($checkbox.prop('checked')) {
            return;
          }
        }
        e.preventDefault();
        self.focusElement($(this));
      });

      // edit on double click
      self.$el.on('dblclick', '[data-edit-dbl-' + options.name + ']', function() {
        var id = $(this).attr('data-edit-dbl-' + options.name);
        self.manager.edit(id);
      });

      // toggle selection mode on checkmark select
      superEnableButtonEvents();
    };

    self.focusElement = function($el) {
      // set checkbox to :checked, and trigger change event
      var $checkbox = $el.find('input[type="checkbox"]');

      // only toggle if either the checkbox is already checked
      // or the chooser is not full. Always release a checked box
      if ($checkbox.prop('checked') || (!(self.chooser && self.chooser.full))) {
        $el.toggleClass('genex-focus');
        $checkbox.prop('checked', function(i, currentState) { return !currentState; });
        $checkbox.trigger('change');
        $el.toggleClass('genex-focus', $checkbox.prop('checked'));
      }
    };

    var superAfterRefresh = self.afterRefresh;
    self.afterRefresh = function() {
      self.$gridView = self.$el.find('.genex-manage-view');
      self.$gridItems = self.$el.find('.genex-manage-grid-piece');
      superAfterRefresh();
    };

    var superDisplayChoiceInCheckbox = self.displayChoiceInCheckbox;
    self.displayChoiceInCheckbox = function(id, state) {
      var $checkbox = superDisplayChoiceInCheckbox(id, state);
      $checkbox.parent('label').toggleClass('genex-focus', state);
      $checkbox.closest('[data-piece]').toggleClass('genex-focus', state);
      return $checkbox;
    };

  }
});