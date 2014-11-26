import ui.View as View;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;
import ui.ViewPool as ViewPool;

// math and random utilities
var floor = Math.floor;
var random = Math.random;
var choose = function(arr) { return arr[floor(random() * arr.length)]; };
var rollFloat = function(mn, mx) { return mn + random() * (mx - mn); };
var rollInt = function(mn, mx) { return floor(mn + random() * (1 + mx - mn)); };

// image object and config data cache
var imgCache = {};

// the Parallax Class
exports = Class(function() {
	var layerPool;
	var piecePool;

	/**
	 * init: the constructor function of Parallax
	 * ~ accepts an opts object parameter with these optional properties
	 *     ~ rootView: the parent of all parallax layer views (REQUIRED)
	 *     ~ layerCtor: the constructor used for layers, default is LayerView
	 *     ~ layerInitCount: number of layers to init in the pool, default is 0
	 *     ~ pieceCtor: the constructor used for pieces, default is ImageView
	 *     ~ pieceInitCount: number of pieces to init in the pool, default is 0
	 */
	this.init = function(opts) {
		// layers' parent: its dimensions determine recycling/spawning of pieces
		this.rootView = opts.rootView || opts.parent || opts.superview;
		// layer views: recycled and initialized from config on reset
		layerPool = new ViewPool({
			ctor: opts.layerCtor || LayerView,
			initCount: opts.layerInitCount || 0
		});
		// image views placed on layers: recycled as layers move
		piecePool = new ViewPool({
			ctor: opts.pieceCtor || ImageView,
			initCount: opts.pieceInitCount || 0
		});
	};

	/**
	 * reset: prepares the parallax for use based on provided config
	 * ~ see README.md for details on config parameter
	 */
	this.reset = function(config) {
		this.releaseLayers();
		this.initializeLayers(config);
	};

	/**
	 * releaseLayers: release all parallax views to their respective pools
	 */
	this.releaseLayers = function() {
		layerPool.forEachActiveView(function(layer, i) {
			layer.pieces.length = 0;
			layer.removeFromSuperview();
			layerPool.releaseView(layer);
		}, this);
		piecePool.forEachActiveView(function(piece, i) {
			piece.removeFromSuperview();
			piecePool.releaseView(piece);
		}, this);
	};

	/**
	 * initializeLayers: prepare layers based on config for a fresh parallax
	 * ~ see README.md for details on config parameter
	 */
	this.initializeLayers = function(config) {
		for (var i = 0, len = config.length; i < len; i++) {
			var layer = layerPool.obtainView({ parent: this.rootView });
			layer.reset(config[i], i);
		}
	};

	/**
	 * update: should be called once per tick with updated coordinates
	 * ~ x: the horizontal coordinate of the parallax, starts at 0
	 * ~ y: the vertical coordinate of the parallax, starts at 0
	 */
	this.update = function(x, y) {
		layerPool.forEachActiveView(function(layer, i) {
			var layerX = layer.style.x = ~~(x * layer.speedRatioHorz);
			layer.releaseHorz && this.releasePiecesHorz(layer, layerX);
			layer.spawnHorz && this.spawnPiecesHorz(layer, layerX);
			var layerY = layer.style.y = ~~(y * layer.speedRatioVert);
			layer.releaseVert && this.releasePiecesVert(layer, layerY);
			layer.spawnVert && this.spawnPiecesVert(layer, layerY);
		}, this);
	};

	/**
	 * releasePiecesHorz: release pieces out of rootView's horizontal bounds
	 * ~ layer: the layer whose pieces we're checking
	 * ~ x: the position of the layer relative to rootView
	 */
	this.releasePiecesHorz = function(layer, x) {
		var dx = x - layer.x;
		var rvs = this.rootView.style;
		var pieces = layer.pieces;
		var finished = false;

		if (dx > 0) {
			while (pieces.length && !finished) {
				var piece = pieces[pieces.length - 1];
				if (piece.style.x >= -x + rvs.width) {
					piecePool.releaseView(pieces.pop());
				} else {
					finished = true;
				}
			}
		} else if (dx < 0) {
			while (pieces.length && !finished) {
				var piece = pieces[0];
				if (piece.style.x + piece.style.width <= -x) {
					piecePool.releaseView(pieces.shift());
				} else {
					finished = true;
				}
			}
		}
	};

	/**
	 * releasePiecesVert: release pieces out of rootView's vertical bounds
	 * ~ layer: the layer whose pieces we're checking
	 * ~ y: the position of the layer relative to rootView
	 */
	this.releasePiecesVert = function(layer, y) {
		var dy = y - layer.y;
		var rvs = this.rootView.style;
		var pieces = layer.pieces;
		var finished = false;

		if (dy > 0) {
			while (pieces.length && !finished) {
				var piece = pieces[pieces.length - 1];
				if (piece.style.y >= -y + rvs.height) {
					piecePool.releaseView(pieces.pop());
				} else {
					finished = true;
				}
			}
		} else if (dy < 0) {
			while (pieces.length && !finished) {
				var piece = pieces[0];
				if (piece.style.y + piece.style.height <= -y) {
					piecePool.releaseView(pieces.shift());
				} else {
					finished = true;
				}
			}
		}
	};

	// TODO: generalize spawn logic
	this.spawnPieces = function(layer, y) {
		var pieceOptions = layer.pieceOptions;
		while (layer.y >= -y - BG_HEIGHT) {
			if (layer.ordered) {
				var index = layer.pieceIndex;
				layer.pieceIndex++;
				if (layer.pieceIndex >= pieceOptions.length) {
					layer.pieceIndex = 0;
				}
				layer.spawnPiece(pieceOptions[index], piecePool);
			} else {
				layer.spawnPiece(choose(pieceOptions), piecePool);
			}
		}
	};
});

// TODO: generalize layer class and bring up-to-date with parallax changes
var LayerView = exports.LayerView = Class(View, function() {
	var sup = View.prototype;

	this.init = function(opts) {
		sup.init.call(this, opts);

		this.x = 0;
		this.y = 0;
		this.xSpawnMin = 0;
		this.xSpawnMax = 0;
		this.ySpawnMin = 0;
		this.ySpawnMax = 0;
		this.index = 0;
		this.ordered = false;
		this.pieceIndex = 0;
		this.pieceOptions = null;
		this.gapRange = null;
		this.speedRatio = 1;
		this.pieces = [];
	};

	this.reset = function(config, index) {
		this.x = 0;
		this.y = 0;
		this.xSpawnMin = 0;
		this.xSpawnMax = 0;
		this.ySpawnMin = 0;
		this.ySpawnMax = 0;
		this.index = index;
		this.ordered = config.ordered || false;
		this.pieceIndex = 0;
		this.pieceOptions = config.pieceOptions;
		this.gapRange = config.gapRange || null;
		this.speedRatio = config.speedRatio || 1;

		var s = this.style;
		s.width = config.width || 1;
		s.height = config.height || 1;
		s.zIndex = config.zIndex || 1;

		// process layer image data
		var pieceOptions = config.pieceOptions;
		for (var i = 0; i < pieceOptions.length; i++) {
			var piece = pieceOptions[i];
			!imgCache[piece.id] && this.cacheImage(piece);
		}
	};

	this.cacheImage = function(data) {
		var imgData = imgCache[data.id] = {};
		var img = imgData.image = new Image({ url: data.image });
		var b = img.getBounds();
		imgData.x = data.x || 0;
		imgData.y = data.y || 0;
		imgData.width = data.width || b.width + b.marginLeft + b.marginRight;
		imgData.height = data.height || b.height + b.marginTop + b.marginBottom;
		imgData.anchorX = data.anchorX || imgData.width / 2;
		imgData.anchorY = data.anchorY || imgData.height / 2;
		imgData.scale = data.scale !== void 0 ? data.scale : 1;
		imgData.opacity = data.opacity !== void 0 ? data.opacity : 1;
		imgData.flipX = data.flipX || false;
		imgData.compositeOperation = data.compositeOperation || "";
		imgData.xRange = data.xRange;
	};

	this.spawnPiece = function(data, pool) {
		var imgData = imgCache[data.id];
		var piece = pool.obtainView({
			parent: this,
			x: this.x + imgData.x,
			y: this.y + imgData.y,
			anchorX: imgData.anchorX,
			anchorY: imgData.anchorX,
			width: imgData.width,
			height: imgData.height,
			scale: imgData.scale,
			opacity: imgData.opacity
		});
		this.pieces.push(piece);
		// only call setImage if we have to
		if (piece.currImage !== imgData.image) {
			piece.currImage = imgData.image;
			piece.setImage(imgData.image);
		}
		// update misc. style properties
		piece.style.flipX = imgData.flipX;
		piece.style.compositeOperation = imgData.compositeOperation;
		// apply random xRange
		var xRange = data.xRange;
		var x = xRange ? rollInt(xRange.min, xRange.max) - imgData.width / 2 : 0;
		piece.style.x += x;
		// next spawn with a one pixel overlap to avoid layer tears
		var gapRange = this.gapRange;
		var gap = gapRange ? rollInt(gapRange.min, gapRange.max) : 0;
		this.y -= (imgData.height - 1) + gap;
	};
});
