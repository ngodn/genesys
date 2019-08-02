module.exports = {
  construct: function(self, options) {
    // Set property
    self.color = 'red';

    // Attach to genex
    self.genex.test = self;
  }
};
