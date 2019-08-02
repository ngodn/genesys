genex.define('genesys-video-widgets', {
  extend: 'genesys-widgets',
  construct: function(self, options) {
    self.play = function($widget, data, options) {
      var request = _.assign({}, data.video, { neverOpenGraph: 1 });
      return genex.oembed.queryAndPlay($widget.find('[data-genex-video-player]'), request);
    };
  }
});
