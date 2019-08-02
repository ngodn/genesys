// This module attaches an instance of the [launder](https://npmjs.org/package/launder)
// npm module as `genex.launder`. The `genex.launder` object is then used throughout
// Apostrophe to sanitize user input.

module.exports = {
  construct: function(self, options) {
    self.genex.launder = require('launder')(options);
  }
};
