//..ffs.js, uly, july2014..

/*jshint supernew:true, laxcomma:true, undef:true */
/*global
  window, XMLHttpRequest, console, setTimeout,
  Uint8Array, Float32Array,
  _
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
* Converts a frequency-domain index value into an actually frequency (Hz);
* Gets declared dynamically, because it is sensitive to the analyzer-node.
*
* @see http://stackoverflow.com/questions/4364823/how-to-get-frequency-from-fft-result
*
* @type {Closure}
* @param {int} The frequency-domain (zero-based) index.
* @return The frequency in Hertz.
*/
var as_frequency = null;

/**
* @param {AudioBuffer} buf
* @see https://developer.mozilla.org/en-US/docs/Web/API/AudioContext.createBuffer
* @see https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
*/
function use_buffer( buf ) {
  var src = ctx.createBufferSource();
  src.buffer = buf;

  console.log( '..use_buffer.. audio-buffer:', buf );
  var buffer_size = 4096
    , pro  = ctx.createScriptProcessor( buffer_size )
    , anna = ctx.createAnalyser()
    ;

  var fft_size    = anna.fftSize = 2048
    , sample_rate = buf.sampleRate
    ;

  //
  // Declare last-minute closures.
  //

  as_frequency = function( idx ) {
        return idx * sample_rate / fft_size;
      };

  /** Temporary data lists. */
  var time_domain = new Uint8Array(   anna.frequencyBinCount )
    , freq_domain = new Float32Array( anna.frequencyBinCount )
    ;

  // FIXME: Gets the events, but audio is silent?
  src .connect( anna );
  anna.connect( pro );
  pro .connect( ctx.destination );

  /** A place to store results per sample/iteration. */
  var samples =
  { 'zcr':      []
  , 'centroid': []
  , 'rolloff':  []
  };

  pro.onaudioprocess = function( e ) {
        anna.getFloatFrequencyData( freq_domain );
        anna.getByteTimeDomainData( time_domain );
        samples.zcr     .push( get_zcr(      time_domain ) );
        samples.centroid.push( get_centroid( freq_domain ) );
        samples.rolloff .push( get_rolloff(  freq_domain ) )
      };

  src.onended = _.once( function() {
        console.log( 'onended' );
        var avg =
        { 'zcr':      mean( samples.zcr )
        , 'centroid': mean( samples.centroid )
        , 'rolloff':  mean( samples.rolloff )
        };
        console.log( 'Resulting averages:', avg );
      });

  //
  // Sample from the middle of the song.
  //

  var mid = buf.duration / 2;
  var delta = 3;    // Note: 2.2 seconds is the minimum sample-duration required for detecting 60+ bpm.
  src.start( 0, mid, delta );

  // WORKAROUND: Sometimes the on-ended event doesn't fire.
  setTimeout( src.onended, delta * 2 * 1000 );
}

/**
* Determines the zero-crossing rate.
*
* @param {Uint8Array} time_domain - more or less random numbers between 0 and 256 or so.
* @return {Number}
*
* @see http://en.wikipedia.org/wiki/Zero-crossing_rate
*/
function get_zcr( time_domain ) {
  if ( !time_domain || !time_domain.length ) {
    return 0;
  }
  var zcr  = 0
    , i    = time_domain.length
    , max  = 256
    , z3r0 = max / 2
    , sign = z3r0 < time_domain[ i ]
    ;
  while ( --i ) {
    if ( sign !== z3r0 < time_domain[ i ] ) {
      zcr++;
      sign = !sign;
    }
  }
  return zcr;
}

/**
* The Centroid is a measure of spectral brightness;
* Alludes to musical timbre.
*
* @param {Float32Array} freq_domain The sound represented by the frequency-domain post FFT.
* @see http://en.wikipedia.org/wiki/Spectral_centroid
* @see Tzanetakis.pdf
*/
function get_centroid( freq_domain ) {
  // GOTCHA: Working indirectly via frequency-indices.
  var combined_weighted_frequencies = _.reduce( freq_domain, function( sum, amp, idx ) {
        return sum + amp * idx;
      });
  var combined_magnitude = _.reduce( freq_domain, function( sum, amp ) {
        return sum + amp;
      }); 
  return as_frequency( combined_weighted_frequencies / combined_magnitude );
}

/**
* Returns the average value for a given list of values.
*/
function mean( li ) {
  var sum = _.reduce( li, function( sum, it ) {
        return sum + ( it || 0 );
      });
  return sum / li.length;
}

/**
* An indication of the spectral shape; defined as follows:
*   The R-value at which 85% of the frequencies
*   have been integrated (zero-based frequency-bin).
*
* @return {Number} The frequency of said r-value.
*/
function get_rolloff( freq_domain ) {
  var total_magnitude = _.reduce( freq_domain, function( sum, amp ) {
        return sum + amp;
      });
  var target  = 0.85 * total_magnitude
    , sum     = 0
    , r       = null

      /** Returns true if we've met our target. */
    , has_found_it = ( target > 0 )?
          function() {
            return sum > target;
          } : function () {
            return sum < target;
          }
    ;
  _.each( freq_domain, function( amp, idx ) {
        sum += amp;
        if ( has_found_it() ) {
          r = idx;
          return false;    // Break out of the for-each-loop.
        }
      });
  return ( r )?
      as_frequency( r ) : null;
}

//---
})();
