var Fence = require( "fence" );
var fs = require( "fs" );
var path = require( "path" );

// Adds a sub-join that aborts when a first argument is given to a callback
// (just like node does most of the time)
// Also, filters out this value (simplifies code heavily, should be in fence proper)
function joinAbortOnError( join, abort ) {
	return function( arg ) {
		if ( !arg || typeof arg === "function" ) {
			return join( function( error ) {
				return error ? abort( error ) : arg && arg.apply( this, [].slice.call( arguments, 1 ) );
			} );
		} else {
			return join( arg );
		}
	}
}

function list( dir, options, callback ) {
	if ( !callback ) {
		callback = options;
		options = {};
	}
	return Fence( function( join, release, abort ) {
		join.abortOnError = joinAbortOnError( join, abort );
		( function explore( dir ) {
			fs.readdir( dir, join( function( error, files ) {
				if ( error ) {
					if ( error.errno !== 34 ) {
						abort( error );
					}
					return;
				}
				files.forEach( function( file ) {
					file = path.join( dir, file );
					fs.stat( file, join.abortOnError( function( stats ) {
						if ( options.recursion === false || !stats.isDirectory() ) {
							callback( file, stats, join, abort );
						} else {
							explore( file );
						}
					} ) );
				} );
			} ) ); 
		} )( dir );
		release();
	} );
}

function rm( dir ) {
	return list( dir, {
		recursion: false
	}, function( filename, stats, join ) {
		if ( stats.isDirectory() ) {
			join( rm( filename ) );
		} else {
			fs.unlink( filename, join() );
		}
	} ).pipe( function() {
		return Fence( function( join, release, abort ) {
			fs.rmdir( dir, join( function( error ) {
				if ( error && error.errno !== 34 ) {
					abort( error );
				}
			} ) );
			release();
		} );
	} );
}

function objectPath( baseDir ) {
	var cache = {};
	cache[ baseDir ] = {};
	return function get( dir ) {
		if ( !( dir in cache ) ) {
			cache[ dir ] = get( path.dirname( dir ) )[ path.basename( dir ) ] = {};
		}
		return cache[ dir ];
	}
}

module.exports = {
	ls: list,
	rm: rm,
	read: function( dir ) {
		dir = path.resolve( dir );
		var get = objectPath( dir );
		return list( dir, function( filename, stats, join ) {
			if ( stats.isFile() ) {
				fs.readFile( filename, join.abortOnError( function( content ) {
					content = content.toString();
					var ext = path.extname( filename );
					get( path.dirname( filename ) )[ path.basename( filename, ext ) ] =
						( ext === ".json" )
						? JSON.parse( content )
						: content;
				} ) );
			}
		} ).then( function() {
			return get( dir );
		} );
	},
	mkCached: function() {
		var promises = {};
		return function mkdir( dir ) {
			dir = path.resolve( dir );
			return promises[ dir ] || ( promises[ dir ] = Fence( function( join, release, abort ) {
				fs.exists( dir, join( function( exists ) {
					if ( !exists ) {
						join( mkdir( path.dirname( dir ) ).done( function() {
							fs.mkdir( dir, joinAbortOnError( join, abort )() );
						} ) );
					}
				} ) );
				release();
			} ).promise() );
		};
	}
};
