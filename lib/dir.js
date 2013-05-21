var Fence = require( "fence" );
var fs = require( "fs" );
var path = require( "path" );

function list( dir, options ) {
	options = options || {};
	return Fence( function( FENCE, release ) {
		( function explore( dir ) {
			fs.readdir( dir, FENCE.join( function( error, filenames ) {
				if ( error ) {
					if ( error.errno !== 34 ) {
						abort( error );
					}
					return;
				}
				filenames.forEach( function( filename ) {
					filename = path.join( dir, filename );
					fs.stat( filename, FENCE.join.errorFirst( function( stats ) {
						if ( options.recursion === false || !stats.isDirectory() ) {
							FENCE.notify( filename, stats );
						} else {
							explore( filename );
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
	} ).progress( function( filename, stats ) {
		if ( stats.isDirectory() ) {
			this.join( rm( filename ) );
		} else {
			fs.unlink( filename, this.join() );
		}
	} ).pipe( function() {
		return Fence( function( FENCE, release ) {
			fs.rmdir( dir, FENCE.join( function( error ) {
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
		return list( dir ).progress( function( filename, stats ) {
			if ( !stats.isFile() ) {
				return;
			}
			fs.readFile( filename, this.join.errorFirst( function( content ) {
				content = content.toString();
				var ext = path.extname( filename );
				get( path.dirname( filename ) )[ path.basename( filename, ext ) ] =
					( ext === ".json" )
					? JSON.parse( content )
					: content;
			} ) );
		} ).pipe( function() {
			return get( dir );
		} );
	},
	mkCached: function() {
		var promises = {};
		return function mkdir( dir ) {
			dir = path.resolve( dir );
			return promises[ dir ] || ( promises[ dir ] = Fence( function( FENCE, release ) {
				fs.exists( dir, FENCE.join( function( exists ) {
					if ( !exists ) {
						FENCE.join( mkdir( path.dirname( dir ) ).done( function() {
							fs.mkdir( dir, FENCE.join.errorFirst() );
						} ) );
					}
				} ) );
				release();
			} ).promise() );
		};
	}
};
