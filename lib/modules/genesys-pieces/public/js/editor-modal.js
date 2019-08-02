// An editor modal for creating and updating pieces. An instance of this modal is created
// each time you click "Add" or click to edit an existing piece. Relies on
// [apostrophe-schemas](https://docs.apostrophecms.org/apostrophe/modules/apostrophe-schemas) to edit the fields.

genex.define('apostrophe-pieces-editor-modal', {
  extend: 'apostrophe-modal',

  beforeConstruct: function(self, options) {
    if (!options.source) {
      if (options.create) {
        options.source = 'create-modal';
      } else {
        options.source = 'editor-modal';
      }
    }
  },

  construct: function(self, options) {
    self.schema = options.schema;
    self._id = options._id;
    self.name = options.name;
    self.copying = options.copying;
    self.manager = options.manager;
    self.beforeShow = function(callback) {
      self.$form = self.$el.find('[data-genex-form]');
      self.$form.on('change', self.onChange);

      self.link('genex-trash', function($el) {
        self.trash($el);
      });

      self.link('genex-rescue', function($el) {
        self.rescue($el);
      });

      self.link('genex-copy', function($el) {
        self.copy($el);
      });

      self.link('genex-versions', function($el) {
        self.versions($el);
      });

      if (self._id) {
        return self.edit(self._id, callback);
      } else {
        return self.create(callback);
      }
    };

    self.edit = function(_id, callback) {
      return genex.docs.lockAndWatch(_id, function(err) {
        if (err) {
          return callback(err);
        }
        return self.open('retrieve', { _id: _id }, callback);
      });
    };

    self.create = function(callback) {
      var piece = genex.schemas.newInstance(self.schema);
      if (self.options.copying) {
        _.assign(piece, self.options.copying);
        delete piece._id;
      }
      return self.populate(piece, callback);
    };

    self.open = function(verb, data, callback) {
      self.api(verb, data, function(result) {
        if (result.status === 'notfound') {
          genex.notify('That item does not exist.', { type: 'error' });
          return callback('error');
        } else if (result.status !== 'ok') {
          genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
          return callback('error');
        }
        self._id = result.data._id;
        var object = result.data;
        var $trash = self.$el.find('[data-genex-trash]');
        var $rescue = self.$el.find('[data-genex-rescue]');
        if (object.trash) {
          $trash.hide();
        } else {
          $rescue.hide();
        }
        return self.populate(object, callback);
      }, function() {
        genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
        return callback('network');
      });
    };

    self.populate = function(piece, callback) {
      return async.series({
        beforePopulate: function(callback) {
          return self.beforePopulate(piece, callback);
        },
        populate: function(callback) {
          return genex.schemas.populate(self.$form, self.schema, piece, callback);
        },
        afterPopulate: function(callback) {
          return self.afterPopulate(piece, callback);
        }
      }, callback);
    };

    self.beforePopulate = function(piece, callback) {
      return setImmediate(callback);
    };

    self.afterPopulate = function(piece, callback) {
      return setImmediate(callback);
    };

    self.saveContent = function(callback) {
      var piece = {
        _id: self._id
      };

      return async.series({
        before: function(callback) {
          return self.beforeConvert(piece, callback);
        },
        convert: function(callback) {
          return genex.schemas.convert(self.$form, self.schema, piece, callback);
        },
        after: function(callback) {
          return self.afterConvert(piece, callback);
        }
      }, function(err) {
        if (err) {
          return callback(err);
        }
        var verb = piece._id ? 'update' : 'insert';
        if (self.copying) {
          // Give the server side a chance to copy in any
          // anonymous areas, which would not be a part
          // of the schema
          piece._copyingId = self.copying._id;
        }
        self.api(verb, piece, function(result) {
          if (result.status !== 'ok') {
            genex.notify(self.getErrorMessage(result.status), { type: 'error' });
            return callback('error');
          }
          self.unsavedChanges = false;
          // Make the saved piece available to methods like copy()
          self.savedPiece = result.data;
          return self.displayResponse(result, callback);
        }, function() {
          genex.notify('An error occurred. Please try again', { type: 'error', dismiss: true });
          return callback(err);
        });
      });
    };

    self.getErrorMessage = function(err) {
      genex.utils.error(err);
      return 'An error occurred. Please try again.';
    };

    self.beforeConvert = function(piece, callback) {
      return setImmediate(callback);
    };

    self.afterConvert = function(piece, callback) {
      return setImmediate(callback);
    };

    // Update the display in response to this item being saved.
    //
    // If the piece is brand new and the server provided
    // a `_url` property and set `contextual: true` for this
    // type of piece, or the piece has been updated and
    // genex.pages.piece._id (the in-context piece) matches the
    // id of the piece just edited, go to `_url`.
    //
    // In any case, the main content area is refreshed and the manage
    // view, if open, refreshes its list (`genex.change` is invoked).
    // This will all make sense if the URL hasn't changed, and do no
    // harm if it has.

    self.displayResponse = function(result, callback) {
      if (self.manager.options.contextual) {
        if ((self.options.create && result.data._url) ||
          (genex.contextPiece && result.data._url && (result.data._id === genex.contextPiece._id))) {
          // If the response contains a `_url`, we should redirect to the
          // _url to edit the piece contextually
          window.location.href = result.data._url;
        }
      }
      if (self.options.create) {
        // genex event so the chooser can figure out it should auto-select this
        genex.emit('pieceInserted', result.data);
      }
      genex.change(result.data);
      return setImmediate(callback);
    };

    self.onChange = function(e) {
      if (!self.unsavedChanges) {
        self.unsavedChanges = true;
      }
    };

    self.trash = function($el, next) {
      if (self.trashing || !confirm("Are you sure you want to trash this " + self.options.label + "?")) {
        return;
      }

      var piece = {
        _id: self._id
      };

      self.trashing = true;
      $el.addClass('genex-busy');

      self.api('trash', piece, function(result) {
        self.trashing = false;
        $el.removeClass('genex-busy');
        if (result.status !== 'ok') {
          genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
          if (next) {
            return next('error');
          }
          return;
        }
        genex.change(self.name);
        genex.modalSupport.closeTopModal();
        if (next) {
          return next(null);
        }

        // Redirect to list view if we are on the the page of piece we deleted
        if (genex.contextPiece && genex.contextPiece._id === piece._id) {
          window.location.href = genex.pages.page._url;
        }

      }, function(err) {
        self.trashing = false;
        $el.removeClass('genex-busy');
        genex.notify('An error occurred. Please try again', { type: 'error', dismiss: true });
        if (next) {
          return next(err);
        }

      });
    };

    self.rescue = function($el, next) {
      if (self.rescuing) {
        return;
      }

      self.rescuing = true;

      var piece = {
        _id: self._id
      };

      $el.addClass('genex-busy');

      self.api('rescue', piece, function(result) {
        self.rescuing = false;
        if (result.status !== 'ok') {
          genex.notify('An error occurred. Please try again.', { type: 'error', dismiss: true });
          if (next) {
            return next('error');
          }
          return;
        }
        genex.change(self.name);
        genex.modalSupport.closeTopModal();
        if (next) {
          return next(null);
        }

      }, function(err) {
        $el.removeClass('genex-busy');
        genex.notify('An error occurred. Please try again', { type: 'error', dismiss: true });
        if (next) {
          return next(err);
        }

      });
    };

    self.versions = function($el) {
      genex.versions.edit(self._id, function() {
        // After reverting, the easiest way to roll back the
        // editor modal is to just cancel it and open another one
        // with the same moog type and options. We also use
        // genex.change to signal to the list view and anything
        // else that cares. -Tom
        self.hide();
        genex.change(self.name);
        genex.create(self.__meta.name, self.options);
      });
    };

    // Save this modal, then open a new modal to create a new piece of
    // this type that starts out as a copy of the current piece

    self.copy = function($el) {
      // We must save successfully before we can start a new editor for the copy
      // Stub out displayResponse so contextual pieces don't refresh the page,
      // preventing our callback from ever being invoked
      var superDisplayResponse = self.displayResponse;
      self.displayResponse = function(result, callback) {
        return callback(null);
      };
      return self.save(function(err) {
        // Restore displayResponse in case this modal lives on
        self.displayResponse = superDisplayResponse;
        if (err) {
          return;
        }
        // This modal should close now, launch a new modal
        // for a new piece
        var _options = _.clone(self.options);
        _options.copying = self.savedPiece;
        _options.create = true;
        delete _options._id;
        delete _options.source;
        genex.create(self.__meta.name, _options);
      });
    };

    var superAfterHide = self.afterHide;
    self.afterHide = function() {
      superAfterHide();
      if (self._id) {
        genex.docs.unlock(self._id, function() {});
      }
    };

  }
});
