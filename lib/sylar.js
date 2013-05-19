var Deferred = require( "JQDeferred" );
var dir = require( "./dir" );
var fs = require( "fs" );
var handleOptions = require( "./handleOptions" );
var path = require( "path" );

var sylar = module.exports = function( options ) {
	options = handleOptions( options );
	var mkdir = dir.mkCached();
	// First, we delete dest tree
	return dir.rm( options.dest ).pipe( function() {
		// Then, we inspect source tree
		return dir.ls( options.src, function( src, stats, join, abort ) {
			// We only handle files
			if ( !stats.isFile() ) {
				return;
			}
			// Get normalized (unix-like) path
			var norm = options.src === "/" ? src : src.substr( options.src.length );
			if ( path.sep !== "/" ) {
				norm = norm.replace( path.sep, "/" );
			}
			// Test for exclusion
			if ( options.exclude( norm ) ) {
				return;
			}
			// Get the destination filename
			var dest = path.join( options.dest, options.rename( norm ) || norm );
			// Make sure we have the parent directory
			join( mkdir( path.dirname( dest ) ).done( function() {
				var filter = options.filter( norm, join );
				// If we have a filter
				if ( filter ) {
					// Read input, apply filter, write to dest
					fs.readFile( src, join.abortOnError( function( input ) {
						filter( input.toString(), function( output ) {
							fs.writeFile( dest, output, join.abortOnError() );
						} );
					} ) );
				} else {
					// else, just copy the file from src to dest
					var r = fs.createReadStream( src ).pipe( fs.createWriteStream( dest ) );
					r.on( "end", join );
					r.on( "error", abort );
				}
			} ) );
		} );
	} );
};

sylar.data = dir.read;
