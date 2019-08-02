// editor for an area. See enableAreas() method
// in user.js for where this is invoked.
//

genex.define('apostrophe-areas-editor', {
  extend: 'apostrophe-context',

  afterConstruct: function(self) {
    self.init();
  },

  construct: function(self, options) {

    self.options = options;
    self.$el = self.options.$el;
    self.$body = $('body');
    self.action = genex.areas.options.action;

    self.resetEl = function($el) {
      self.$el = $el;
      if (self.$selected && self.$selected.length) {
        self.$selected = self.$el.find('[data-genex-widget-id="' + self.$selected.data('genex-widget-id') + '"]', '[data-genex-area]');
      }
      self.init();
    };

    self.init = function() {
      self.options.widgets = self.options.widgets || {};
      // So we don't reinitialize it on every call to enableAll()
      self.$el.attr('data-initialized', 'true');
      // So serialize can be invoked from the outside world
      self.$el.data('editor', self);
      // Receive options from the DOM too
      _.extend(self.options, JSON.parse(self.$el.attr('data-options')));
      if (self.options.virtual) {
        // virtual area, in a new piece in a modal for instance.
        // Make it easy for child areas to detect this fact
        // and avoid trying to autosave on their own
        self.$el.attr('data-genex-area-virtual', '1');
      }
      genex.areas.register(self.$el.attr('data-doc-id'), self.$el.attr('data-dot-path'), self);
      var canceled = false;
      self.$el.parents('[data-genex-area]').each(function() {
        if (canceled) {
          return;
        }
        var $parent = $(this);
        var pdi = $parent.attr('data-doc-id') || '';
        var pdp = $parent.attr('data-dot-path') || '';
        var di = self.$el.attr('data-doc-id') || '';
        var dp = self.$el.attr('data-dot-path') || '';
        if ((pdi === di) && ((pdp + '.') === dp.substr(0, pdp.length + 1))) {
          self.$el.removeAttr('data-autosave');
          canceled = true;
        }
      });
      self.$controls = self.$el.findSafe('[data-genex-area-controls]', '[data-genex-widget]');

      self.addEmptyClass();
      self.linkWidgetsToAreaEditor();
      self.enhanceExistingWidgetControls();
      self.registerClickHandlers();
      self.registerEventHandlers();
      self.enableHideControlsOnRichTextStart();
      self.enableInterval();
      self.previousData = self.serialize();
    };

    self.addEmptyClass = function() {
      if (self.$el.find('[data-genex-widgets]').html() === "") {
        self.$el.addClass('genex-empty');
      }
    };

    self.enhanceExistingWidgetControls = function() {
      var $widgets = self.getWidgets();
      $widgets.each(function() {
        var $widget = $(this);
        self.enhanceWidgetControls($widget);
        self.addAreaControls($widget);
      });
      self.respectLimit();
    };

    self.registerClickHandlers = function() {
      self.link('genex-add-item', self.startAutosavingHandler(self.addItem));
      self.link('genex-edit-item', self.startAutosavingHandler(self.editItem));
      self.link('genex-move-item', self.startAutosavingHandler(self.moveItem));
      self.link('genex-trash-item', self.startAutosavingHandler(self.trashItem));
      self.link('genex-clone-item', self.startAutosavingHandler(self.cloneItem));
      self.$el.on('change', '[data-schema-widget-control-label]', self.startAutosavingHandler(self.changedSchemaWidgetControl));
    };

    self.registerEventHandlers = function() {

      self.$body.on('aposCloseMenus', function() {
        self.dismissContextContentMenu();
      });
      self.on('aposRichTextStarting', function() {
        // Stop any previously active editor
        self.stopEditingRichText();
      });
      self.$el.mouseover(function(e) {
        self.$el.addClass('genex-hover');
        e.stopPropagation();
      });
      self.$el.mouseout(function(e) {
        self.$el.removeClass('genex-hover');
        e.stopPropagation();
      });
    };

    // Activate the autosave mechanism, if it is not already
    // operating. This method is invoked for you by
    // `startAutosaving` and `startAutosavingThen`, which
    // also obtain a session lock on the document first for
    // the current user.

    self.registerAutosave = function() {
      if (self.autosaving) {
        return;
      }
      if (self.$el.is('[data-autosave]')) {
        // Self-saving. Used for areas on regular pages. Areas in snippets
        // will be queried for their content at the time the snippet is saved
        if (!self.previousData) {
          self.previousData = self.serialize();
        }
        self.autosaving = true;
      }
    };

    // Add a new widget to the area. `$el` should be the widget wrapper
    // of the widget that should immediately precede it, or null if
    // we are adding at the top. `type` should be the widget type's name
    // property, such as `apostrophe-rich-text` (note no suffix).
    // `data` may be an object with existing properties, or null.
    // `callback`, if present, is invoked after the widget has been
    // added to the DOM.

    self.addItem = function($el, type, data, callback) {
      self.$el.removeClass('genex-empty');

      // If this is not empty then we want to append the new item after this item.
      // If it is empty then we want to prepend it to the area (we used the content menu
      // at the top of the area, rather than one nested in an item).
      self.$selected = $el.parentsUntil('[data-genex-area]').filter('[data-genex-widget-wrapper]', self.$el).find('[data-genex-widget]').first();
      // We may have come from a context content menu associated with a specific item;
      // if so dismiss it, but note we waited until after calling closest() to figure out
      // if the click came from such a menu
      self.dismissContextContentMenu($el);

      // If there are any initial content items, remove them on selecting
      // your first widget. Right now, we're parsing the data-options through
      // self.options and using self.options.initialContent or what we think is
      // the default from aposLocals.
      self.removeInitialContent(self.$el, true);

      return self.addWidget(type, data, callback);
    };

    self.editItem = function($el) {
      var $widget = $el.closest('[data-genex-widget]');
      if ($widget) {
        self.editWidget($widget);
        return false;
      }
    };

    self.cloneItem = function($el) {
      var $widget = $el.closest('[data-genex-widget]');
      if ($widget) {
        self.cloneWidget($widget);
        return false;
      }
    };

    self.moveItem = function($el) {
      // We move the widget wrapper, with its associated area controls
      var $wrapper = $el.closest('[data-genex-widget-wrapper]');
      var direction = $el.data('genex-move-item');

      if (direction === 'up') {
        $wrapper.prev().before($wrapper);
      } else if (direction === 'down') {
        $wrapper.next().after($wrapper);
      } else if (direction === 'top') {
        $wrapper.parent().children(':first').before($wrapper);
      } else if (direction === 'bottom') {
        $wrapper.parent().children(':last').after($wrapper);
      }
      genex.emit('widgetMoved', $wrapper.find('[data-genex-widget]'));
    };

    self.trashItem = function($el) {
      var $widget = $el.closest('[data-genex-widget]');
      self.stopEditingRichText();
      self.removeAreaControls($widget);

      var $wrapper = $widget.parent('[data-genex-widget-wrapper]');
      var $undoer = self.fromTemplate('[data-genex-undo-remove-widget]');
      $undoer.find('[data-genex-widget-type-label]').text(genex.areas.getWidgetManager($widget.attr('data-genex-widget')).label);
      $wrapper.before($undoer).detach();
      var undoerTimeout;
      $undoer.on('click', function() {
        $undoer.replaceWith($wrapper);
        self.checkEmptyAreas();
        self.respectLimit();
        clearTimeout(undoerTimeout);
        return false;
      });
      self.checkEmptyAreas();
      self.respectLimit();
      undoerTimeout = setTimeout(function() {
        $undoer.fadeOut(function() {
          $undoer.remove();
          // It is unclear how to drop all jQuery data associated
          // with a detached (rather than removed) element, so
          // add it back hidden for a moment and use remove, which
          // definitely cleans up those things
          $wrapper.hide();
          $('body').append($wrapper);
          $wrapper.remove();
        });
      }, 7000);
      genex.emit('widgetTrashed', $widget);
    };

    self.getWidgets = function() {
      return self.$el.findSafe('[data-genex-widget]', '[data-genex-area]');
    };

    // Disable area controls interactions while certain menus are open
    self.disableAreaControls = function() {
      $('body').find('[data-genex-widget-controls]').addClass('genex-area-widget-controls--disabled');
    };

    self.enableAreaControls = function() {
      $('body').find('[data-genex-widget-controls]').removeClass('genex-area-widget-controls--disabled');
    };

    self.dismissContextContentMenu = function() {
      $('body').unbind('click', self.dismissContextContentMenu);
      $(window).unbind('keyup', self.dismissContextContentMenuKeyEvent);

      self.$el.find('[data-genex-dropdown]').removeClass('genex-active');
      self.$el.find('.genex-area-controls').removeClass('genex-active');
      self.$el.removeClass('genex-context-content-menu-active');
      // It is now OK to show this again without worrying about
      // menu interactions being suppressed due to stacking order issues. -Tom
      $('.genex-context-menu-container').removeClass('genex-content-menu-active');
      self.enableAreaControls();
    };

    self.dismissContextContentMenuKeyEvent = function (e) {
      if (e.keyCode === 27) {
        self.dismissContextContentMenu();
      }
    };

    self.linkWidgetsToAreaEditor = function() {
      // Every item should know its area editor so we can talk
      // to other area editors after drag-and-drop
      var $widgets = self.getWidgets();
      $widgets.each(function() {
        var $widget = $(this);
        $widget.data('areaEditor', self);
      });
    };

    self.removeInitialContent = function($el, entireItem) {
      if (entireItem) {
        // We added a real item to an area that only contains a
        // placeholder item which should be removed in its entirety
        $el.find('[data-genex-widget="apostrophe-rich-text"]:has([data-initial-content])').remove();
      } else {
        // We started editing such an item. Don't trash it,
        // just remove the initial content <p> tag
        $el.find('[data-initial-content]').remove();
      }
    };

    self.stopEditingRichText = function() {
      if (!self.$activeRichText) {
        return;
      }
      genex.areas.getWidgetManager('apostrophe-rich-text').stopEditing(self.$activeRichText);
      self.$activeRichText = undefined;
    };

    // Implementation detail of `addItem`, should not be called directly.
    // Adds the given widget wrapper to the DOM, respecting the limit.

    self.insertWidget = function($wrapper) {
      var $widget = $wrapper.children('[data-genex-widget]').first();
      self.fixInsertedWidgetDotPaths($widget);
      self.insertItem($wrapper);
      self.enhanceWidgetControls($widget);
      self.respectLimit();
      genex.emit('enhance', $widget);
    };

    // A newly inserted widget that contains subareas cannot autosave
    // correctly as part of the parent unless its doc id and
    // dot path are correctly set to show that relationship. But
    // render-widget has no way of knowing how to set these for us,
    // so we need to fix them up
    self.fixInsertedWidgetDotPaths = function($widget) {
      var $areas = $widget.findSafe('[data-genex-area]', '[data-genex-widget]');
      var id = self.$el.attr('data-doc-id');
      var p = self.$el.attr('data-dot-path');
      var ordinal = 0;
      var found = false;
      // Which widget are we among the widgets in this area?
      // We need to count those without making big assumptions
      // about the markup. So walk widgets found without crossing
      // into a nested area until we find ourselves. -Tom
      var $peers = self.$el.findSafe('[data-genex-widget]', '[data-genex-area]');
      $peers.each(function() {
        if (found) {
          return;
        }
        if (this !== $widget[0]) {
          ordinal++;
        } else {
          found = true;
        }
      });
      try {
        var data = JSON.parse($widget.attr('data') || '{}');
        data.__docId = id;
        data.__dotPath = p + '.items.' + ordinal;
        $widget.attr('data', JSON.stringify(data));
      } catch (e) {
        // Do not fail outright if the widget has a very unusual
        // data storage mode
        genex.utils.warn(e);
      }
      $areas.each(function() {
        var $area = $(this);
        var wid = $area.attr('data-doc-id');
        var wp = $area.attr('data-dot-path');
        if (wid.substr(0, 1) === 'w') {
          $area.attr('data-doc-id', id);
          var dotPath = p + '.items.' + ordinal + '.' + wp;
          $area.attr('data-dot-path', dotPath);
        }
      });
    };

    self.enhanceWidgetControls = function($widget) {
      var $controls = $widget.findSafe('[data-genex-widget-controls]', '[data-genex-area]');
      if (self.options.limit === 1) {
        $controls.addClass('genex-limit-one');
      }
      self.checkEmptyWidget($widget);
      $widget.parent('[data-genex-widget-wrapper]').draggable(self.draggableSettings);
      self.updateAllSchemaWidgetControlChoices($widget);
    };

    self.addAreaControls = function($widget) {
      $widget.parent('[data-genex-widget-wrapper]').append(self.$controls.clone().removeAttr('data-genex-area-controls-original'));
    };

    self.removeAreaControls = function($widget) {
      $widget.parent('[data-genex-widget-wrapper]').find('[data-genex-area-controls]').remove();
    };

    self.checkEmptyWidget = function($widget) {
      var type = $widget.attr('data-genex-widget');
      if (genex.areas.getWidgetManager(type).isEmpty($widget)) {
        $widget.addClass('genex-empty');
      }
    };

    // Replace an existing widget, preserving any classes and
    // attributes specific to the area editor. Typically
    // called by the widget's editor on save, so it can change
    // attributes of the widget element itself

    self.replaceWidget = function($old, $wrapper) {
      var $widget = $wrapper.findSafe('[data-genex-widget]', '[data-genex-area]');
      var data = genex.areas.getWidgetData($widget);
      genex.areas.setWidgetData($widget, data);
      $old.replaceWith($widget);
      self.enhanceWidgetControls($widget);
      $widget.parent('[data-genex-widget-wrapper]').attr('class', $wrapper.attr('class'));
      self.fixInsertedWidgetDotPaths($widget);
      $widget.data('areaEditor', self);
      genex.emit('enhance', $widget);
    };

    // $item whould be a widget wrapper, not just the widget itself
    self.insertItem = function($item) {
      $item.find('[data-genex-widget]:first').data('areaEditor', self);
      if (self.$selected && self.$selected.length) {
        self.$selected.parent('[data-genex-widget-wrapper]').after($item);
      } else {
        self.$el.find('[data-genex-widgets]:first').prepend($item);
      }
      self.addAreaControls($item.findSafe('[data-genex-widget]', '[data-genex-area]'));
    };

    // This method recreates separators throughout the entire page as appropriate
    // to the element being dragged.
    self.addSeparators = function($draggable) {
      var $areas = self.getDroppableAreas($draggable);

      $areas.each(function() {
        var $area = $(this);
        var $ancestor = $draggable.closest('[data-genex-area]');
        var i;

        atTop();
        after();

        function atTop() {
          // Drop zone at the top of every area, unless we are dragging the top item
          // in that particular area

          if (($area[0] === $ancestor[0]) && (!$draggable.prev().length)) {
            return;
          }
          $area.find('[data-genex-widgets]:first').prepend(self.newSeparator());
        }

        function after() {
          var $widgets = $area.findSafe('[data-genex-widget-wrapper]', '[data-genex-area]');
          $(window).trigger('aposDragging', [$widgets]);
          // Counter so we can peek ahead
          i = 0;
          $widgets.each(function() {
            var $widget = $(this);
            if (!(($widgets[i] === $draggable[0]) || (((i + 1) < $widgets.length) && ($widgets[i + 1] === $draggable[0])))) {
              $widget.after(self.newSeparator());
            }
            i++;
          });
        }

      });

      $('[data-genex-drag-item-separator]:not(.genex-template)').droppable(self.separatorDropSettings);
      setImmediate(function() {
        $areas.addClass('genex-dragging');
      });
    };

    self.removeSeparators = function() {
      $(window).trigger('aposStopDragging');
      $('[data-genex-area]').removeClass('genex-dragging');
      $('[data-genex-refreshable] [data-genex-drag-item-separator]')
        .off('transitionend webkitTransitionEnd oTransitionEnd')
        .on('transitionend webkitTransitionEnd oTransitionEnd', function() {
          $(this).remove();
        }
        );
    };

    self.getDroppableAreas = function($draggable) {
      var $widget = $draggable.find('[data-genex-widget]').first();
      // Only the current area, and areas that are not full; also
      // rule out areas that do not allow the widget type in question
      return $('[data-genex-area]').filter(function() {
        var editor = $(this).data('editor');
        if ((editor && !editor.limitReached()) || ($widget.data('areaEditor') === editor)) {
          var movableOptionKey = [$widget.attr('data-genex-widget'), 'controls', 'movable'];
          var hasWidget = _.has(editor.options.widgets, $widget.attr('data-genex-widget'));

          if (hasWidget && (_.has(editor.options.widgets, movableOptionKey) ? _.get(editor.options.widgets, movableOptionKey) : true)) {
            return true;
          }
        }
      });
    };

    self.newSeparator = function() {
      var $separator = self.fromTemplate('[data-genex-drag-item-separator]');
      return $separator;
    };

    self.editWidget = function($widget) {
      self.stopEditingRichText();
      self.$selected = $widget;
      var type = self.$selected.attr('data-genex-widget');
      var data = genex.areas.getWidgetData($widget);
      data._errorPath = $widget.data('errorPath');
      data._error = $widget.data('error');
      var originalData = _.clone(data);
      var options = self.options.widgets[type] || {};

      genex.areas.getWidgetManager(type).edit(
        data,
        options,
        function(data, callback) {
          $.jsonCall(self.action + '/render-widget',
            {
              dataType: 'html'
            },
            {
              data: data,
              originalData: originalData,
              options: options,
              type: type
            }, function(html) {
            // This rather intense code works around
            // various situations in which jquery is
            // picky about HTML
              var $newWidget = $($.parseHTML($.trim(html), null, true));
              self.replaceWidget(self.$selected, $newWidget);
              return callback(null, $newWidget.findSafe('[data-genex-widget]', '[data-genex-area]'));
            });
        }
      );
    };

    self.cloneWidget = function($widget) {
      self.stopEditingRichText();
      self.$selected = $widget;
      var type = self.$selected.attr('data-genex-widget');
      var options = self.options.widgets[type] || {};
      // Recursively set new widget ids for this widget and its descendants
      // with the same docId
      newIds($widget);
      var data = genex.areas.getWidgetData($widget);
      $.jsonCall(self.action + '/render-widget',
        {
          dataType: 'html'
        },
        {
          data: data,
          originalData: data,
          options: options,
          type: type
        }, function(html) {
          // This rather intense code works around
          // various situations in which jquery is
          // picky about HTML
          var $wrapper = $($.parseHTML($.trim(html), null, true));
          self.insertWidget($wrapper);
          self.checkEmptyAreas();
        }
      );
      function newIds($widget) {
        var id = genex.utils.generateId();
        $widget.attr('data-genex-widget-id', id);
        var data = genex.areas.getWidgetData($widget);
        data._id = id;
        var docId = data.__docId;
        genex.areas.setWidgetData($widget, data);
        var $descendants = $widget.find('[data-genex-widget]');
        $descendants.each(function() {
          var $widget = $(this);
          var data = genex.areas.getWidgetData($widget);
          if (data.__docId === docId) {
            newIds($(this));
          }
        });
      }
    };

    self.checkEmptyAreas = function() {
      $('[data-genex-area]').each(function() {
        var $el = $(this);
        if ($el.find('[data-genex-widget]').length === 0) {
          $el.addClass('genex-empty');
        } else {
          $el.removeClass('genex-empty');
        }
      });
      return false;
    };

    // This method is an implementation detail of `addItem` and should not be called directly.
    //
    // Insert a widget of the given type with the given initial data (may be null)
    // and, optionally, invoke a callback after adding to the DOM.

    self.addWidget = function(type, data, callback) {
      self.stopEditingRichText();
      var options = self.options.widgets[type] || {};
      var originalData = _.clone(data);
      genex.areas.getWidgetManager(type).edit(
        data || {},
        options,
        function(data, saved) {
          $.jsonCall(self.action + '/render-widget',
            {
              dataType: 'html'
            },
            {
              data: data,
              originalData: originalData,
              options: options,
              type: type
            }, function(html) {
              // This rather intense code works around
              // various situations in which jquery is
              // picky about HTML
              var $wrapper = $($.parseHTML($.trim(html), null, true));
              self.insertWidget($wrapper);
              self.checkEmptyAreas();
              saved(null, $wrapper.findSafe('[data-genex-widget]', '[data-genex-area]'));
              return callback && callback(null);
            }
          );
        }
      );
    };

    self.draggableSettings = {
      handle: '[data-genex-drag-item]',
      revert: 'invalid',
      refreshPositions: true,
      cancel: false,
      tolerance: 'pointer',
      start: function(event, ui) {
        self.stopEditingRichText();
        // If the limit has been reached, we can only accept
        // drags from the same area
        var $item = $(event.target);
        self.enableDroppables($item);
      },
      stop: function(event, ui) {
        self.disableDroppables();
      }
    };

    self.enableDroppables = function($draggable) {
      self.addSeparators($draggable);
    };

    self.disableDroppables = function($draggable) {
      self.removeSeparators();
    };

    self.separatorDropSettings = {
      accept: '[data-genex-widget-wrapper]',
      activeClass: 'genex-active',
      hoverClass: 'genex-hover',
      tolerance: 'pointer',

      drop: function(event, ui) {
        // TODO: after the drop we should re-render the dropped item to
        // reflect the options of its new parent area
        var $item = $(ui.draggable);
        // Get rid of the hardcoded position provided by jquery UI draggable,
        // but don't remove the position: relative without which we can't see the
        // element move when we try to drag it again later
        $item.css({
          'height': '',
          'left': '',
          'top': '',
          'width': ''
        });
        var $oldWidget = $item.find('[data-genex-widget]');
        var oldEditor = self;
        var $newArea = $(event.target).closest('[data-genex-area]');
        var newEditor = $newArea.data('editor');
        $oldWidget.data('areaEditor', newEditor);
        self.disableDroppables();
        oldEditor.startAutosavingThen(function() {
          $(event.target).after($item);
          newEditor.startAutosavingThen(function() {
            newEditor.reRenderWidget($item, function(err) {
              if (err) {
                genex.notify('An error occurred.', { type: 'error' });
                return;
              }
              newEditor.respectLimit();
            });
          });
        });
        self.checkEmptyAreas();
      }
    };

    // Get the server to re-render a widget for us, applying the
    // options appropriate to its new area for instance. The callback
    // is optional.

    self.reRenderWidget = function($wrapper, callback) {
      self.stopEditingRichText();
      var $widget = $wrapper.find('[data-genex-widget]');
      var type = $widget.attr('data-genex-widget');
      var data = genex.areas.getWidgetData($widget, true);
      var originalData = _.clone(data);
      var options = self.options.widgets[type] || {};
      genex.ui.globalBusy(true);
      return $.jsonCall(self.action + '/render-widget',
        {
          dataType: 'html'
        },
        {
          data: data,
          originalData: originalData,
          options: options,
          type: type
        }, function(html) {
          genex.ui.globalBusy(false);
          // This rather intense code works around
          // various situations in which jquery is
          // picky about HTML
          var $newWidget = $($.parseHTML($.trim(html), null, true));
          self.replaceWidget($widget, $newWidget);
          return callback && callback(null);
        }, function(err) {
          genex.ui.globalBusy(false);
          return callback && callback(err);
        }
      );
    };

    // Serialize the editor to an array of items, exactly as expected for
    // storage in an area.
    self.serialize = function() {
      var items = [];
      self.getWidgets().each(function() {
        var $item = $(this);
        var item = genex.areas.getWidgetData($item);
        items.push(item);
      });
      // use clonePermanent so we don't mistake differences in
      // dynamic, informational properties for real differences.
      // prevents false positives and extra versions. -Tom
      return genex.utils.clonePermanent(items);
    };

    // Called every 5 seconds. Default version checks for empty areas
    // and autosaves if needed in appropriate cases.

    self.onInterval = function() {
      self.checkEmptyAreas();
      self.saveIfNeeded();
    };

    // Returns a JSON-friendly object ready for
    // submission to the `save-area` route, if
    // the area is autosaving, has modifications
    // when compared to `self.previousData` and is present
    // in the DOM. In all other circumstances
    // this method returns `null`. Calling code should
    // set `self.previousData` to the `items` property
    // of the returned object, if and only if it succeeds
    // in actually saving the data. This ensures that
    // retries are made automatically in the event
    // of network errors.

    self.prepareAutosaveRequest = function() {
      if (!self.autosaving) {
        // This area does not autosave
        // (it does not invoke the save-area route)
        return null;
      }
      // Die gracefully if the area has been removed from the DOM
      if (!self.$el.closest('body').length) {
        clearInterval(self.saveInterval);
        return null;
      }
      var items = self.serialize();
      // Use _.isEqual because it ignores the order of properties. Differences
      // in property order in JSON were causing a false positive on every page load,
      // generating a proliferation of versions on the server side.
      if (_.isEqual(items, self.previousData)) {
        return null;
      }
      self.previousData = items;
      return {
        docId: self.$el.attr('data-doc-id'),
        dotPath: self.$el.attr('data-dot-path'),
        options: genex.areas.getAreaOptions(self.$el),
        items: items
      };
    };

    // If the area editor believes its content has changed, send it to the
    // save-area route. If `sync` is true, make a synchronous AJAX call
    // (for bc only; we now use the saveAllIfNeededAndUnlock method of
    // the areas module singleton for faster synchronous saves on page unload).
    //
    // `callback` is optional and is invoked when the work is complete,
    // or immediately if there is no work to do.
    //
    // If the document cannot be saved because it has been locked
    // by another user, tab or window, a message is displayed to
    // the user and the page is refreshed to reflect the current
    // content and avoid a cascade of such messages.

    self.saveIfNeeded = function(sync, callback) {
      var request = self.prepareAutosaveRequest();
      if (!request) {
        return callback && callback(null);
      }
      $.jsonCall(
        self.options.action + '/save-area',
        {
          async: !sync
        },
        request,
        function(result) {
          if (result.status !== 'ok') {
            if ((result.status === 'locked') || (result.status === 'locked-by-me')) {
              // genex.notify unsuitable because this is quite modal.
              // TODO: implement an genex.alert that displays
              // modally, then invokes a callback
              alert(result.message);
              $(window).off('beforeunload');
              window.location.reload(true);
            } else {
              if (result.status !== 'error') {
                // The server is telling us that validation constraints
                // are unmet. How is that possible? Because the browser
                // was not enforcing them at one point, or because
                // the constraints were added later. Open the most relevant
                // widget's modal via the provided dot path
                var path = result.status.split(/\./);
                var $el = self.$el;
                var $lastWidget;
                var failing = false;
                var unconsumed = [];

                // Last element is the error name, not part of the path.
                var errorName = path.pop();

                _.each(path, function(c) {
                  if (failing) {
                    // Once we've found the widget that needs fixing, push the
                    // rest of the path into `unconsumed`,
                    // e.g., field name, array item number
                    unconsumed.push(c);
                  } else {
                    if (c.match(/^\d+$/)) {
                      $el = $el.findSafe('[data-genex-widget]', '[data-genex-widget]').eq(parseInt(c));
                      if ($el.length) {
                        $lastWidget = $el;
                      } else {
                        unconsumed.push(c);
                        failing = true;
                      }
                    } else {
                      $el = $el.findSafe('[data-genex-area][data-dot-path$=".' + c + '"]', '[data-genex-widget]');
                      if (!$el[0]) {
                        unconsumed.push(c);
                        failing = true;
                      }
                    }
                  }
                });
                if ($lastWidget.length) {
                  var $area = $lastWidget.closest('[data-genex-area]');
                  $lastWidget.data('errorPath', unconsumed);
                  $lastWidget.data('error', errorName);
                  $area.data('editor').editWidget($lastWidget);
                  genex.notify('Incomplete or incorrect information was provided. Please review.');
                } else {
                  genex.notify('An error occurred saving the document.', { type: 'error' });
                }
              } else {
                genex.notify('An error occurred saving the document.', { type: 'error' });
              }
              return callback && callback(result.status);
            }
            return;
          }
          self.previousData = request.items;
          genex.emit('areaEdited', self.$el);
          return callback && callback(null);
        },
        function(err) {
          return callback && callback(err);
        }
      );
    };

    // For bc only. Working version of this logic is inside
    // the drop handler.
    self.changeOwners = function($item) {
    };

    self.respectLimit = function() {
      var $toggles = self.$el.find('[data-content-menu-toggle]');
      if (self.limitReached()) {
        self.$el.addClass('genex-limit-reached');
        $toggles.addClass('genex-disabled');
      } else {
        self.$el.removeClass('genex-limit-reached');
        $toggles.removeClass('genex-disabled');
      }
    };

    self.limitReached = function() {
      var count = self.getWidgets().length;
      return (self.options.limit && (count >= self.options.limit));
    };

    self.fromTemplate = function(sel) {
      return genex.areas.fromTemplate(sel);
    };

    self.enableHideControlsOnRichTextStart = function() {
      self.$el.off('aposRichTextStarted');
      self.on('aposRichTextStarted', function(e) {
        self.$activeRichText = $(e.target);
        self.dismissContextContentMenu();
        $(e.target).find('[data-genex-area-item-buttons]:first').hide();
      });
      // self.$el.off('aposRichTextStopped');
      // self.on('aposRichTextStopped', function(e) {
      //   var $widget = $(e.target);
      // });
      self.on('aposRichTextActive', function(state) {
        self.$el.addClass('genex-rich-text-active');
      });
      self.on('aposRichTextInactive', function() {
        self.$el.removeClass('genex-rich-text-active');
      });
    };

    // Override default apostrophe-context functionality because we
    // need to use $.onSafe, for the sake of nested areas.

    self.link = function(action, callback) {
      var attribute;
      attribute = 'data-' + genex.utils.cssName(action);
      var attributeSel = '[' + attribute + ']';
      self.on('click', attributeSel, function() {
        callback($(this), $(this).attr(attribute));
        return false;
      });
    };

    // This is a wrapper for $.onSafe that avoids events that are actually
    // happening in nested areas. -Tom and Sam

    self.on = function(eventType, selector, fn) {
      if (arguments.length === 2) {
        fn = selector;
        selector = undefined;
        self.$el.onSafe(eventType, '[data-genex-area]', fn);
      } else {
        self.$el.onSafe(eventType, selector, '[data-genex-area]', fn);
      }
    };

    // Given a method such as `self.addItem`, this method returns
    // a new function that will first ensure the user has a session lock
    // on the document, then initiate autosave for the area, and
    // finally invoke the callback.
    //
    // If necessary the user is given the option to shatter a lock belonging
    // to another user.
    //
    // If an error occurs, such as the user declining to steal
    // a session lock, `callback` is invoked with an error rather than null.

    self.startAutosaving = function(callback) {
      // Bug fix for working with areas inside piece modals:
      // if autosaving is not appropriate for this area,
      // we should not attempt to get a lock either.
      // (Autosaving only makes sense for existing documents
      // being edited in context on the page.)
      //
      // However, if our parent area is autosaving,
      // we should trigger `startAutosaving` on that instead.
      if (!self.$el.is('[data-autosave]')) {
        var $closest = self.$el.closest('[data-genex-area][data-autosave]');
        if ($closest.length) {
          return $closest.data('editor').startAutosaving(callback);
        }
        return callback(null);
      }
      var _id = self.$el.attr('data-doc-id');
      if ((!_id) || self.options.virtual) {
        return callback(null);
      }
      if (self.$el.closest('[data-genex-area-virtual]').length) {
        // Also look for virtual parent areas and stand down
        // if found; they will recursively save our contents
        return callback(null);
      }
      return genex.docs.lockAndWatch(_id, function(err) {
        if (err) {
          return callback(err);
        }
        return succeed();
      });
      function succeed() {
        self.registerAutosave();
        return callback(null);
      }
    };

    // Similar to `startAutosaving`, this method
    // obtains a context lock and starts autosaving of
    // the area, then invokes the given function,
    // invoking it with the given array of arguments.
    // Does not invoke `fn` at all if startAutosaving
    // fails. Part of the implementation of `startAutosavingHandler`.

    self.startAutosavingThen = function(fn, args) {
      return self.startAutosaving(function(err) {
        if (!err) {
          fn.apply(null, args);
        } else {
          genex.utils.error(err);
        }
      });
    };

    // Returns a function that invokes `startAutosavingThen`
    // with the given function and passes on the arguments
    // given to it. Useful as an event handler.

    self.startAutosavingHandler = function(fn) {
      return function() {
        return self.startAutosavingThen(fn, Array.prototype.slice.call(arguments));
      };
    };

    // Establish the so-called `saveInterval`, which actually
    // also carries out the check for empty areas and can
    // be expanded to do more by extending `onInterval`. Note
    // that this interval is established for all areas the
    // user can edit, not just those that autosave.

    self.enableInterval = function() {
      self.saveInterval = setInterval(self.onInterval, 5000);
    };

    self.changedSchemaWidgetControl = function(event) {
      var $el = $(event.target);
      var $widget = $el.closest('[data-genex-widget]');
      var value = $el.val();
      var name = $el.attr('name');
      var data = genex.areas.getWidgetData($widget);
      if ($el.attr('data-type') === 'select') {
        data[name] = value;
      } else {
        var matches;
        var operator;
        if (value === '') {
          data[name] = [];
        } else if (value.match(/^[+-]/)) {
          matches = value.match(/^([+-]) (.*)$/);
          operator = matches[1];
          value = matches[2];
          if (operator === '+') {
            data[name] = (data[name] || []).concat([ value ]);
          } else if (operator === '-') {
            data[name] = _.without(data[name] || [], value);
          }
        } else {
          data[name] = [ value ];
        }
      }
      genex.areas.setWidgetData($widget, data);
      self.reRenderWidget($widget.closest('[data-genex-widget-wrapper]'));
      return false;
    };

    self.updateAllSchemaWidgetControlChoices = function($widget) {
      var data = genex.areas.getWidgetData($widget);
      $widget.find('.genex-area-widget-controls:first [data-schema-widget-control-label]').each(function() {
        var $control = $(this);
        var name = $control.attr('name');
        self.updateSchemaWidgetControlChoices($widget, name, data[name] || []);
      });
    };

    // The dropdown acts as a multiple selector, biased toward
    // the more common use case where only one choice is made.
    // Until you make a choice it looks like a single-select situation.
    // The multiple-select capability can be seen when you pull it
    // down again.

    self.updateSchemaWidgetControlChoices = function($widget, name, selected) {

      var $controls = $widget.findSafe('[data-genex-widget-controls]', '[data-genex-area]');
      var $select = $controls.find('[name="' + name + '"]:first');
      var widgetType = $widget.attr('data-genex-widget');
      var manager = genex.areas.getWidgetManager(widgetType);
      var field = _.find(manager.schema, { name: name });

      return async.series([
        getChoices
      ], function(err) {
        if (err) {
          genex.notify(err, { type: 'error' });
          return;
        }
        return renderChoices();
      });

      function getChoices(callback) {

        if ($select.data('choices')) {
          return callback(null);
        }

        if ((typeof field.choices) !== 'string') {
          captureLabelsAndChoices();
          return callback(null);
        }

        genex.ui.globalBusy(true);
        return $.jsonCall(genex.schemas.action + '/choices', {
          field: field
        }, function(result) {
          genex.ui.globalBusy(false);
          if (result.status !== 'ok') {
            return callback(result.status);
          }
          $select.data('choices', _.pluck(result.choices, 'value'));
          var labels = {};
          _.each(result.choices, function(choice) {
            labels[choice.value] = choice.label;
          });
          $select.data('labels', labels);
          return callback(null);
        }, callback);

      }

      function renderChoices() {
        var choices = $select.data('choices');
        var labels = $select.data('labels');
        $select.html('');

        if (field.type === 'select') {
          addChoices();
          $select.val(selected);
        } else {
          if (selected.length === 0) {
            add('', '');
            addChoices();
          } else {
            add('__', 'current', _.map(selected, function(value) {
              return labels[value];
            }).join(', '));
            _.each(choices, function(choice) {
              if (_.includes(selected, choice)) {
                add('- ', choice, '✓ ' + labels[choice]);
              } else {
                add('+ ', choice, labels[choice]);
              }
            });
            add('', '');
          }
          $select.selectedIndex = 0;
        }

        function addChoices() {
          _.each(choices, function(choice) {
            return add('', choice);
          });
        }
        function add(prefix, value, label) {
          var $option = $('<option></option>');
          $option.attr('value', prefix + value);
          if ((value === '') && (!(label || labels[value]))) {
            $option.text($select.attr('data-schema-widget-control-label'));
          } else {
            $option.text(label || labels[value]);
          }
          $select.append($option);
        }
      }

      function captureLabelsAndChoices() {
        var choices = [];
        var labels = {};
        $select.find('option').each(function() {
          var value = $(this).attr('value');
          labels[value] = $(this).text();
          if (value) {
            choices.push(value);
          }
        });
        $select.data('choices', choices);
        $select.data('labels', labels);
      }

    };

  }

});
