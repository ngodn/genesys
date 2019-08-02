genex.utils.widgetPlayers['apostrophe-video'] = function(el, data, options) {

  queryAndPlay(
    el.querySelector('[data-genex-video-player]'),
    genex.utils.assign(data.video, {
      neverOpenGraph: 1
    })
  );

  function queryAndPlay(el, options) {
    genex.utils.removeClass(el, 'genex-oembed-invalid');
    genex.utils.addClass(el, 'genex-oembed-busy');
    if (!options.url) {
      return fail('undefined');
    }
    return query(options, function(err, result) {
      if (err || (options.type && (result.type !== options.type))) {
        return fail(err || 'inappropriate');
      }
      genex.utils.removeClass(el, 'genex-oembed-busy');
      return play(el, result);
    });
  }

  function query(options, callback) {
    return genex.utils.get('/modules/apostrophe-oembed/query', options, callback);
  }

  function play(el, result) {
    var shaker = document.createElement('div');
    shaker.innerHTML = result.html;
    var inner = shaker.firstChild;
    el.innerHTML = '';
    if (!inner) {
      return;
    }
    inner.removeAttribute('width');
    inner.removeAttribute('height');
    el.append(inner);
    // wait for CSS width to be known
    genex.utils.onReady(function() {
      // If oembed results include width and height we can get the
      // video aspect ratio right
      if (result.width && result.height) {
        inner.style.height = ((result.height / result.width) * inner.offsetWidth) + 'px';
      } else {
        // No, so assume the oembed HTML code is responsive.
      }
    });
  }

  function fail(err) {
    genex.utils.removeClass(el, 'genex-oembed-busy');
    genex.utils.addClass(el, 'genex-oembed-invalid');
    if (err !== 'undefined') {
      el.innerHTML = 'Ⓧ';
    } else {
      el.innerHTML = '';
    }
  }

};
