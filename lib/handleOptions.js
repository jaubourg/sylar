var _ = require( "lodash" );
var compileFP = require( "./filenamePattern" );
var Deferred = require( "JQDeferred" );
var path = require( "path" );

var defaults = {
	root: ".",
	src: "src",
	dest: "dest",
	chmod: 0777,
	exclude: {},
	rename: {},
	filter: {}
};

function handlePath( dir, options ) {
	return path.resolve( options.root, dir );
}

function handlePattern( actionCallback, finalCallback ) {
	return function( items ) {
		var array = [];
		var tmp;
		for( var pattern in items ) {
			if ( items.hasOwnProperty( pattern ) ) {
				tmp = compileFP( pattern );
				tmp.action =
					typeof items[ pattern ] === "function"
					? items[ pattern ]
					: actionCallback( items[ pattern ], pattern );
				array.push( tmp );
			}
		}
		return finalCallback( array );
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
		return res;
	};
}

function reject() {
	return Deferred().reject();
}

var handlers = {
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
};

module.exports = function( options ) {
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
