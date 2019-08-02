$(function() {
  $('body').on('click', '[data-genex-search-filter]', function() {
    $(this).closest('form').submit();
  });
  $('body').on('keyup', '[data-genex-search-field]', function (e) {
    if (e.keyCode === 13) {
      $(this).closest('form').submit();
      return false;
    }
  });
});

genex.on('notfound', function(info) {
  $(function() {
    var url = '/search';
    if (genex.searchSuggestions === false) {
      // Explicitly disabled
      return;
    }
    if (genex.searchSuggestions && genex.searchSuggestions.url) {
      url = genex.searchSuggestions.url;
    }
    $.get(url, { q: info.suggestedSearch }, function(html) {
      $('[data-genex-notfound-search-results]').html(html);
    });
  });
});
