genex.define('apostrophe-users', {
  extend: 'apostrophe-pieces',

  construct: function(self, options) {
    var superClickHandlers = self.clickHandlers;
    self.clickHandlers = function() {
      superClickHandlers();
      $('body').on('click', '[data-genex-logout]', function() {
        document.location.href = genex.prefix + '/logout';
      });
    };
  }
});
