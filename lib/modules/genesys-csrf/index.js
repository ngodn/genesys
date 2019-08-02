module.exports = {
  afterConstruct: function(self) {
    self.enableMiddleware();
  },
  construct: function(self, options) {
    self.enableMiddleware = function () {
      // Angular-style CSRF protection. See also the
      // genesys-express csrf.exceptions option. -Tom
      var expressModule = self.genex.modules['genesys-express'];
      if (expressModule.options.csrf !== false) {
        // We install this as the middleware of this module rather than in genesys-express
        // itself in order to run it at a specific time, in particular after login so we can check req.user
        // within the csrf middleware
        self.expressMiddleware = expressModule.csrf;
      }
    };
  }
};
