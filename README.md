# Sylar

Sylar is a utility function that recursively copies the content of a folder into another location, eventually transforming the content in the process.

_Latest version of Sylar is version 0.1.0_

## Installation

* use npm: `npm install sylar`
* or put `sylar` as a dependency in `package.json` 

Sylar itself depends on :
* [JQDeferred](http://github.com/jaubourg/jquery-deferred-for-node), an automated port of jQuery Deferreds to node
* [fence](http://github.com/jaubourg/fence), a jQuery Deferreds utility,
* [lodash](http://github.com/bestiejs/lodash) which you probably know about alreay ;)

Once Sylar is installed, `require` it in your code:

```javascript
var sylar = require( "sylar" );
```

## Usage

```javascript
sylar( {
	src: "path/to/source/folder",
	dest: "path/to/destination/folder",
	exclude: {
		"*.tmp;*.bin;**/inlineImages/**": true
	},
	filter: {
		"*.css;*.js;*.json": sylar.template( data )
	}
} ).done( function() {
	console.log( "Eveything has been copied" );
} ).fail( function( error ) {
	console.log( "An error occured", error );
} );
```
