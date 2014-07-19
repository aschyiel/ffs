//..ffs/server/server.js, uly, july2014..

// Originally written to just serve up mp3 files for testing.

var express = require( 'express' );

var app = express();
app.use( express.static( __dirname + '/public' ) );

var server = app.listen( 3000, function() {
  console.log( 'running dummy node (express) server.' );
});
