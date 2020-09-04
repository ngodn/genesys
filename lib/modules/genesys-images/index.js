// A subclass of `genesys-pieces`, `genesys-images` establishes a library
// of uploaded images in formats suitable for use on the web.
//
// Together with [genesys-images-widgets](https://docs.apostrophecms.org/apostrophe/modules/genesys-images-widgets),
// this module provides a simple way to add downloadable PDFs and the like to
// a website, and to manage a library of them for reuse.
//
// Each `genesys-image` doc has an `attachment` schema field, implemented
// by the [genesys-attachments](https://docs.apostrophecms.org/apostrophe/modules/genesys-images-widgets) module.

module.exports = {
  extend: 'genesys-pieces',
  name: 'genesys-image',
  label: 'Image',
  alias: 'images',
  perPage: 20,
  manageViews: ['grid', 'list'],
  insertViaUpload: true,
  // Means not included in public sitewide search. -Tom
  searchable: false,
  beforeConstruct: function(self, options) {
    options.addFields = [
      {
        type: 'slug',
        name: 'slug',
        label: 'Slug',
        prefix: 'image',
        required: true
      },
      {
        type: 'attachment',
        name: 'attachment',
        label: 'Image File',
        fileGroup: 'images',
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
      },
      {
        name: 'camera',
        label: 'Camera Model',
        type: 'string'
      },
      {
        name: 'captureDate',
        label: 'Capture Date',
        type: 'string'
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
          'creditUrl',
          'camera',
          'captureDate'
        ]
      }
    ].concat(options.arrangeFields || []);

  },
  construct: function(self, options) {
    self.pushAsset('script', 'chooser', { when: 'user' });
    self.pushAsset('script', 'relationship-editor', { when: 'user' });
    self.pushAsset('script', 'manager-modal', { when: 'user' });
    self.pushAsset('script', 'editor-modal', { when: 'user' });
    self.pushAsset('script', 'focal-point-editor', { when: 'user' });
    self.pushAsset('stylesheet', 'user', { when: 'user' });
    require('./lib/api.js')(self, options);
    self.enableHelpers();
  }
};