// example of a widget manager with a play method.
// You don't need this file at all if you
// don't need a player.

genex.define('genesys-images-widgets', {
  extend: 'genesys-pieces-widgets',
  construct: function(self, options) {
    self.play = function($widget, data, options) {
      $widget.projector(options);
    };
  }
});
