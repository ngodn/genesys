var _ = require('@sailshq/lodash');

// A subclass of `genesys-pieces`, `genesys-files` establishes a library
// of uploaded files, which may be of any type acceptable to the
// [genesys-attachments](https://docs.apostrophecms.org/apostrophe/modules/genesys-attachments) module.
// Together with [genesys-files-widgets](https://docs.apostrophecms.org/apostrophe/modules/genesys-file-widgets),
// this module provides a simple way to add downloadable PDFs and the like to
// a website, and to manage a library of them for reuse.

module.exports = {
  extend: 'genesys-pieces',
  name: 'genesys-file',
  label: 'File',
  alias: 'files',
  insertViaUpload: true,
  beforeConstruct: function(self, options) {
    options.addFields = [
      {
        type: 'slug',
        name: 'slug',
        label: 'Slug',
        prefix: 'file',
        required: true
      },
      {
        type: 'attachment',
        name: 'attachment',
        label: 'File',
        required: true
      },
      {
        type: 'string',
        name: 'description',
        label: 'Description',
        textarea: true
      },
      {
        type: 'string',
        name: 'credit',
        label: 'Credit'
      },
      {
        type: 'url',
        name: 'creditUrl',
        label: 'Credit URL'
      }
    ].concat(options.addFields || []);
    options.arrangeFields = [
      {
        name: 'basics',
        label: 'Basics',
        fields: [
          'attachment',
          'title',
          'slug',
          'published',
          'tags'
        ]
      },
      {
        name: 'info',
        label: 'Info',
        fields: [
          'description',
          'credit',
          'creditUrl'
        ]
      }
    ].concat(options.arrangeFields || []);
  },
  construct: function (self, options) {
    self.addUrls = function (req, files, callback) {
      _.each(files, function (file) {
        file._url = self.genex.attachments.url(file.attachment);
      });
      return callback(null);
    };
  }
};
