//..index.js, uly, july2014..

/**
* The "main" routine that happens on page load within our song-analyzer demo.
*/

window.onload = function() {
//--

  var ffs = new FFS();
  ffs.analyze(
  { 'song_url': 'http://localhost:3000/assets/ghetto_love.mp3'
  , 'onresults': onresults
  });

  function onresults( results ) {
    console.log( 'Resulting averages:', results );
  }

//--
};
