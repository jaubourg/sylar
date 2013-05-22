var Deferred = require( "JQDeferred" );
var dir = require( "./dir" );
var fs = require( "fs" );
var handleOptions = require( "./handleOptions" );
var path = require( "path" );

var sylar = module.exports = function( options ) {
	options = handleOptions( options );
	var mkdir = dir.mkCached();
	// First, we delete dest tree
	return Deferred( function( defer ) {
		dir.rm( options.dest ).done( function() {
			// Then, we inspect source tree
			return dir.ls( options.src ).progress( defer.notify, function( src, stats ) {
				// We only handle files
				if ( !stats.isFile() ) {
					return;
				}
				// Keep track of the fence
				var FENCE = this;
				// Get normalized (unix-like) path
				var norm = options.src === "/" ? src : src.substr( options.src.length );
				if ( path.sep !== "/" ) {
					norm = norm.replace( path.sep, "/" );
				}
				// Test for exclusion & renaming
				FENCE.join( options.exclude( norm ).pipe( function( exclude ) {
					return !exclude && options.rename( norm ).pipe( function( rename ) {
						return rename || norm;
					} );
				} ).done( function( dest ) {
					if ( !dest ) {
						return;
					}
					// Get the destination filename
					dest = path.join( options.dest, dest );
					// Make sure we have the parent directory
					FENCE.join( mkdir( path.dirname( dest ) ).done( function() {
						var filter = options.filter( FENCE, norm );
						// If we have a filter
						if ( filter ) {
							// Read input, apply filter, write to dest
							fs.readFile( src, FENCE.join.errorFirst( function( input ) {
								filter( input.toString(), function( output ) {
									fs.writeFile( dest, output, FENCE.join.errorFirst() );
								} );
							} ) );
						} else {
							// else, just copy the file from src to dest
							var r = fs.createReadStream( src ).pipe( fs.createWriteStream( dest ) );
							r.on( "end", FENCE.join() );
							r.on( "error", FENCE.abort );
						}
					} ) );
				} ) );
			} ).done( defer.resolve ).fail( defer.reject );
		} );
	} ).promise();
};

sylar.data = dir.read;

sylar.template = function( options ) {
	return sylar( handleOptions.template( options ) );
};
