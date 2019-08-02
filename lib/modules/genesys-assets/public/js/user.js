_.extend(genex, {
  enableHtmlPageId: function() {
    if (genex.htmlPageId) {
      $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
        if ((options.type !== 'OPTIONS') && (!options.crossDomain)) {
          jqXHR.setRequestHeader('Apostrophe-Html-Page-Id', genex.htmlPageId);
        }
      });
    }
  }
});
