// Provide a way to group [genesys-users](https://docs.apostrophecms.org/genesys/modules/genesys-users) together
// and assign permissions to them. This module is always active "under the hood," even if
// you take advantage of the `groups` option of `genesys-users` to skip a separate
// admin bar button for managing groups. **To make an admin bar button available
// for managing groups, do NOT set the `groups` option when configuring the
// `genesys-users` module. That option configures a hardcoded list of groups
// as a simplified alternative.**
//
// By default the `published` schema field is removed. As a general rule we believe
// that conflating users and groups, who can log into the website, with public directories
// of people most often leads to confusion. Use a separate subclass of pieces to
// represent departments, etc.
//
// If you do add the `published` field back you will need to extend the cursor to make
// `published(true)` the default again.
//
// This module is **not** intended to be extended with new subclass modules, although
// you may implicitly subclass it at project level to change its behavior.

var _ = require('@sailshq/lodash');
var Promise = require('bluebird');

module.exports = {

  alias: 'groups',
  extend: 'genesys-pieces',
  name: 'genesys-group',
  label: 'Group',
  pluralLabel: 'Groups',
  // Means not included in public sitewide search. -Tom
  searchable: false,
  // You can't give someone permission to edit groups because that
  // allows them to make themselves an admin. -Tom
  adminOnly: true,
  addFields: [
    {
      type: 'joinByArrayReverse',
      name: '_users',
      label: 'Users',
      idsField: 'groupIds',
      withType: 'genesys-user',
      ifOnlyOne: true
    },
    {
      type: 'checkboxes',
      name: 'permissions',
      label: 'Permissions',
      // This gets patched at modulesReady time
      choices: []
    }
  ],

  beforeConstruct: function(self, options) {
    options.removeFields = (options.minimumRemoved || [ 'published' ])
      .concat(options.removeFields || []);

    options.removeFilters = [ 'published' ]
      .concat(options.removeFilters || []);

    options.arrangeFields = [
      {
        name: 'permissions',
        label: 'Permissions',
        fields: [ 'permissions' ]
      }
    ].concat(options.arrangeFields || []);
  },

  afterConstruct: function(self) {
    self.enableAddGroupTask();
  },

  construct: function(self, options) {

    self.modulesReady = function() {
      self.composeBatchOperations();
      self.setPermissionsChoices();
      self.addToAdminBarIfSuitable();
    };

    self.setPermissionsChoices = function() {
      var permissions = _.find(self.schema, { name: 'permissions' });
      if (!permissions) {
        return;
      }
      permissions.choices = self.genex.permissions.getChoices();
    };

    self.addToAdminBar = function() {};

    // Adds an admin bar button if and only if the `genesys-users` module
    // is not using its `groups` option for simplified group administration.

    self.addToAdminBarIfSuitable = function() {
      if (self.genex.users.options.groups) {
        // Using the simplified group choice menu, so
        // there is no managing of groups by the end user
      } else {
        self.genex.adminBar.add(self.__meta.name, self.pluralLabel, self.isAdminOnly() ? 'admin' : ('edit-' + self.name), { after: 'genesys-users' });
      }
    };

    self.enableAddGroupTask = function() {
      self.genex.tasks.add(self.__meta.name,
        'add',
        'Usage: node app genesys-groups:add groupname permission1 permission2...\n\nTo list available permissions, run:\n\nnode app genesys-permissions:list',
        function(genex, argv) {
          var req = self.genex.tasks.getReq();
          var groupname = argv._[1];
          if (!groupname) {
            throw 'You must specify a group name.';
          }
          var permissions = argv._.slice(2);
          return Promise.try(function() {
            _.each(permissions, function(permission) {
              if (!_.contains(_.pluck(self.genex.permissions.getChoices(), 'value'), permission)) {
                throw 'The permission ' + permission + ' does not exist. Use node app genesys-permissions:list to list available permissions.';
              }
            });
            return self.find(req, { title: groupname }).toObject().then(function(exists) {
              if (exists) {
                throw 'Group already exists.';
              }
            }).then(function() {
              return self.insert(req, {
                title: groupname,
                permissions: permissions
              });
            });
          });
        }
      );
    };
  }

};
