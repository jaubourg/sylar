var _ = require( "lodash" );
var compileFP = require( "./filenamePattern" );
var Deferred = require( "JQDeferred" );
var path = require( "path" );

function optionsHandler( defaults, handlers ) {
	return function( options ) {
		options = _.merge( {}, defaults, options );
		_.forOwn( handlers, function( filter, key ) {
			if ( filter ) {
				options[ key ] = filter( options[ key ], options, key );
			} else {
				delete options[ key ];
			}
		} );
		return options;
	};
}

var resolveWithFalse = ( function( dfalse ) {
	return function() {
		return dfalse;
	};
} )( Deferred().resolve( false ) );

function reject() {
	return Deferred().reject();
}

function handlePath( dir, options ) {
	return path.resolve( options.root, dir );
}

function handlePattern( actionCallback, finalCallback ) {
	return function( items, options ) {
		var array = [];
		var tmp;
		for( var pattern in items ) {
			if ( items.hasOwnProperty( pattern ) ) {
				tmp = compileFP( pattern );
				tmp.action =
					typeof items[ pattern ] === "function"
					? items[ pattern ]
					: actionCallback( items[ pattern ], pattern, options );
				array.push( tmp );
			}
		}
		return finalCallback( array, options );
	};
}

function handleFilter( filter ) {
	return function( FENCE, filename ) {
		var defer;
		var promise;
		filter.forEach( function( filter ) {
			if ( filter.test( filename ) ) {
				if ( !promise ) {
					defer = promise = Deferred();
				}
				promise = promise.pipe( filter.action );
			}
		} );
		return defer && function( input, fn ) {
			defer.resolve( input );
			promise.done( fn ).always( FENCE.join() );
		};
	};
}

// get result from exclude/rename option
function handleExcludeRename( option ) {
	return function( path ) {
		var res;
		for ( var i = 0, length = option.length; !res && i < length; i++ ) {
			if ( option[ i ].test( path ) ) {
				res = option[ i ].action( path );
			}
		}
		return Deferred.when( res ).pipe( null, resolveWithFalse );
	};
}

var handleOptions = module.exports = optionsHandler( {
	dest: "dest",
	exclude: {},
	filter: {},
	rename: {},
	root: ".",
	src: "src"
} , {
	src: handlePath,
	dest: handlePath,
	root: false,
	exclude: handlePattern( function( exclude ) {
		return function() {
			return exclude;
		};
	}, handleExcludeRename ),
	filter: handlePattern( function() {
		return reject;
	}, handleFilter ),
	rename: handlePattern( function( expr, pattern ) {
		throw "rename expr for " + pattern + " should be a function, not a " + ( typeof expr );
	}, handleExcludeRename )
} );

handleOptions.template = optionsHandler( {
	data: {},
	filter: {},
	rename: {},
	root: ".",
	select: "*"
}, {
	data: function( data, options ) {
		if ( typeof data === "string" ) {
			data = require( "./sylar" ).data( handlePath( data, options ) );
		} else {
			data = Deferred.when( data || {} );
		}
		return data.fail( function( error ) {
			throw error;
		} );
	},
	select: function( select ) {
		if ( Array.isArray( select ) ) {
			select = select.join( ";" );
		}
		return select;
	},
	filter: function( _filter, options ) {
		var filter = {};
		filter[ options.select ] = function( input ) {
			input = _.template( input );
			return options.data.pipe( function( data ) {
				return input( data );
			} );
		};
		_.merge( filter, _filter );
		return filter;
	},
	rename: function( rename, options ) {
		_.forOwn( rename, function( func, key ) {
			rename[ key ] = typeof func === "function" ? function( norm ) {
				return options.data.then( function( data ) {
					return func( norm, data );
				} );
			} : func; 
		} );
		return rename;
	}
} );
