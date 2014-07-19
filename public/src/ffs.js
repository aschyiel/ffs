//..ffs.js, uly, july2014..

/*jshint supernew:true, laxcomma:true, undef:true */
/*global
  window, XMLHttpRequest, console,
  Uint8Array
*/

/**
* In theory, we can measure musical genre via the following:
* - Zero-Crossing Rate (ZCR) --- ie. correlates to vocals.
* - beats per minute (BPM) ----- ie. EDM is gonna be faster than say, whatever else.
* - frequency-power via gross spectral measurements --- ie. "rap correlates with
*                          strong beats and load bass vs. large low-frequency peaks."
*
*
* @see http://chimera.labs.oreilly.com/books/1234000001552/ch05.html#s05_3
* @see http://webaudioapi.com/samples/script-processor/
* @see http://www.html5rocks.com/en/tutorials/webaudio/intro/
* @see http://joshondesign.com/p/books/canvasdeepdive/chapter12.html
*      http://0xfe.blogspot.com/2011/08/web-audio-spectrum-analyzer.html
*
* Genre Detection:
* @see http://www.academia.edu/4631247/Waveform-Based_Musical_Genre_Classification
*
* Beat Detection
* @see http://stackoverflow.com/questions/657073/how-to-detect-bpm-of-the-song-by-programming
*      http://www.academia.edu/4631247/Waveform-Based_Musical_Genre_Classification
*/
(function(){
//---

var AudioContext = window.AudioContext || window.webkitAudioContext
  , ctx = new AudioContext
  , req = new XMLHttpRequest
  , song_url = 'http://localhost:3000/assets/ghetto_love.mp3'
  ;

req.open( 'GET', song_url, true );
req.responseType = 'arraybuffer';
req.onload = function() {
      console.log( '..onload..' );
      ctx.decodeAudioData(
          req.response,
          function( buf ) {
            if ( !buf ) {
              throw new Error( "Missing audio-buffer --- perhaps the "+
                               "audio-source is invalid? song-url:"+ song_url );
            }
            use_buffer( buf );
          },
          function( err ) {
            console.log( "Error: AudioContext#decodeAudioData --- ", err );
          });
    };
req.send();

/**
* @param {AudioBuffer} buf
* @see https://developer.mozilla.org/en-US/docs/Web/API/AudioContext.createBuffer
* @see https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
*/
function use_buffer( buf ) {
  var src = ctx.createBufferSource();
  src.buffer = buf;

  console.log( '..use_buffer.. audio-buffer:', buf );
//  var pcm_data_channel_0 = buf.getChannelData( 0 );    // raw-data is slow!

  var buffer_size = 4096;
  var pro = ctx.createScriptProcessor( buffer_size );

  var anna = ctx.createAnalyser();
  anna.fftSize = 2048;
  var timeDomain = new Uint8Array( anna.frequencyBinCount );
  //var freqDomain = new Float32Array( anna.frequencyBinCount );

// works.
//  src.connect( ctx.destination );

// also works.
//  src.connect( anna );
//  anna.connect( ctx.destination );

// Gets the events, but audio is silent.
  src .connect( anna );
  anna.connect( pro );
  pro .connect( ctx.destination );

  var zcr_samples = [];

  pro.onaudioprocess = function( e ) {
        //anna.getFloatFrequencyData( freqDomain );
        anna.getByteTimeDomainData( timeDomain );
        zcr_samples.push( get_zcr( timeDomain ) );
      };

  src.onended = function() {
        console.log( '..ended..' );
        console.log( zcr_samples );
      };

  //
  // Sample from the middle of the song.
  //

  var mid = buf.duration / 2;
  var delta = 5;    // 5 seconds we're gonna listen to.
  src.start( 0, mid, delta );
}

/**
* Determines the zero-crossing rate.
*
* @param {Uint8Array} timeDomain - more or less random numbers between 0 and 256 or so.
* @return {Number}
*
* @see http://en.wikipedia.org/wiki/Zero-crossing_rate
*/
function get_zcr( timeDomain ) {
  if ( !timeDomain || !timeDomain.length ) {
    return 0;
  }
  var zcr  = 0
    , i    = timeDomain.length
    , max  = 256
    , z3r0 = max / 2
    , sign = z3r0 < timeDomain[ i ]
    ;
  while ( --i ) {
    if ( sign !== z3r0 < timeDomain[ i ] ) {
      zcr++;
      debugger;
      sign = !sign;
    }
  }
  return zcr;
}

//---
})();
