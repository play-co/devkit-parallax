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
var pieceCache = {};

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
			// populate initial layers to fill the screen
			this.moveLayerLeft(layer, 0);
			this.moveLayerUp(layer, 0);
		}
	};

	/**
	 * update: should be called once per tick with updated coordinates
	 * ~ x: the horizontal coordinate of the parallax, starts at 0
	 * ~ y: the vertical coordinate of the parallax, starts at 0
	 */
	this.update = function(x, y) {
		layerPool.forEachActiveView(function(layer, i) {
			var layerX = ~~(x * layer.xMultiplier);
			var dx = layerX - layer.style.x;
			if (dx > 0) {
				this.moveLayerRight(layer, dx);
			} else if (dx < 0) {
				this.moveLayerLeft(layer, dx);
			}

			var layerY = ~~(y * layer.yMultiplier);
			var dy = layerY - layer.style.y;
			if (dy > 0) {
				this.moveLayerDown(layer, dy);
			} else if (dy < 0) {
				this.moveLayerUp(layer, dy);
			}
		}, this);
	};

	/**
	 * moveLayerRight: updates layer position, spawns and releases pieces
	 * ~ layer: the layer to move
	 * ~ dx: how far to move
	 */
	this.moveLayerRight = function(layer, dx) {
		var x = layer.style.x += dx;
		var rvs = this.rootView.style;

		if (layer.xCanRelease) {
			// release pieces that have been pushed too far right
			var pieces = layer.pieces;
			var finished = false;
			while (pieces.length && !finished) {
				var piece = pieces[pieces.length - 1];
				if (piece.style.x >= -x + rvs.width) {
					layer.xSpawnMax = piece.style.x;
					piecePool.releaseView(pieces.pop());
				} else {
					finished = true;
				}
			}
		}

		if (layer.xCanSpawn) {
			// spawn to the left if necessary
			var pieceOptions = layer.pieceOptions;
			while (layer.xSpawnMin > -x) {
				if (layer.ordered) {
					var index = layer.pieceIndex++;
					if (layer.pieceIndex === pieceOptions.length) {
						layer.pieceIndex = 0;
					}
					layer.spawnPieceLeft(pieceOptions[index], piecePool);
				} else {
					layer.spawnPieceLeft(choose(pieceOptions), piecePool);
				}
			}
		}
	};

	/**
	 * moveLayerLeft: updates layer position, spawns and releases pieces
	 * ~ layer: the layer to move
	 * ~ dx: how far to move
	 */
	this.moveLayerLeft = function(layer, dx) {
		var x = layer.style.x += dx;
		var rvs = this.rootView.style;

		if (layer.xCanRelease) {
			// release pieces that have been pushed too far left
			var pieces = layer.pieces;
			var finished = false;
			while (pieces.length && !finished) {
				var piece = pieces[0];
				if (piece.style.x + piece.style.width <= -x) {
					layer.xSpawnMin = piece.style.x + piece.style.width;
					piecePool.releaseView(pieces.shift());
				} else {
					finished = true;
				}
			}
		}

		if (layer.xCanSpawn) {
			// spawn to the left if necessary
			var pieceOptions = layer.pieceOptions;
			while (layer.xSpawnMax < -x + rvs.width) {
				if (layer.ordered) {
					var index = layer.pieceIndex++;
					if (layer.pieceIndex === pieceOptions.length) {
						layer.pieceIndex = 0;
					}
					layer.spawnPieceRight(pieceOptions[index], piecePool);
				} else {
					layer.spawnPieceRight(choose(pieceOptions), piecePool);
				}
			}
		}
	};

	/**
	 * moveLayerDown: updates layer position, spawns and releases pieces
	 * ~ layer: the layer to move
	 * ~ dy: how far to move
	 */
	this.moveLayerDown = function(layer, dy) {
		var y = layer.style.y += dy;
		var rvs = this.rootView.style;

		if (layer.yCanRelease) {
			// release pieces that have been pushed too far right
			var pieces = layer.pieces;
			var finished = false;
			while (pieces.length && !finished) {
				var piece = pieces[pieces.length - 1];
				if (piece.style.y >= -y + rvs.height) {
					layer.ySpawnMax = piece.style.y;
					piecePool.releaseView(pieces.pop());
				} else {
					finished = true;
				}
			}
		}

		if (layer.yCanSpawn) {
			// spawn to the left if necessary
			var pieceOptions = layer.pieceOptions;
			while (layer.ySpawnMin > -y) {
				if (layer.ordered) {
					var index = layer.pieceIndex++;
					if (layer.pieceIndex === pieceOptions.length) {
						layer.pieceIndex = 0;
					}
					layer.spawnPieceUp(pieceOptions[index], piecePool);
				} else {
					layer.spawnPieceUp(choose(pieceOptions), piecePool);
				}
			}
		}
	};

	/**
	 * moveLayerUp: updates layer position, spawns and releases pieces
	 * ~ layer: the layer to move
	 * ~ dy: how far to move
	 */
	this.moveLayerUp = function(layer, dy) {
		var y = layer.style.y += dy;
		var rvs = this.rootView.style;

		if (layer.yCanRelease) {
			// release pieces that have been pushed too far left
			var pieces = layer.pieces;
			var finished = false;
			while (pieces.length && !finished) {
				var piece = pieces[0];
				if (piece.style.y + piece.style.height <= -y) {
					layer.ySpawnMin = piece.style.y + piece.style.height;
					piecePool.releaseView(pieces.shift());
				} else {
					finished = true;
				}
			}
		}

		if (layer.yCanSpawn) {
			// spawn to the left if necessary
			var pieceOptions = layer.pieceOptions;
			while (layer.ySpawnMax < -y + rvs.height) {
				if (layer.ordered) {
					var index = layer.pieceIndex++;
					if (layer.pieceIndex === pieceOptions.length) {
						layer.pieceIndex = 0;
					}
					layer.spawnPieceDown(pieceOptions[index], piecePool);
				} else {
					layer.spawnPieceDown(choose(pieceOptions), piecePool);
				}
			}
		}
	};
});

// the Parallax Layer Class
var LayerView = exports.LayerView = Class(View, function() {
	var sup = View.prototype;
	var _uid = 0;

	this.init = function(opts) {
		sup.init.call(this, opts);

		// horizontal properties
		this.xSpawnMin = 0;
		this.xSpawnMax = 0;
		this.xMultiplier = 1;
		this.xCanSpawn = true;
		this.xCanRelease = true;
		this.xGapRange = { min: 0, max: 0 };
		// vertical properties
		this.ySpawnMin = 0;
		this.ySpawnMax = 0;
		this.yMultiplier = 1;
		this.yCanSpawn = true;
		this.yCanRelease = true;
		this.yGapRange = { min: 0, max: 0 };
		// misc. layer and piece spawning properties
		this.index = 0;
		this.preventTearing = false;
		this.ordered = false;
		this.pieceIndex = 0;
		this.pieceOptions = [];
		this.pieces = [];
	};

	this.reset = function(config, index) {
		this.xSpawnMin = 0;
		this.xSpawnMax = 0;
		this.xMultiplier = config.xMultiplier || 0;
		this.xGapRange = config.xGapRange || { min: 0, max: 0 };
		this.xCanSpawn = config.xCanSpawn !== void 0
			? config.xCanSpawn
			: true;
		this.xCanRelease = config.xCanRelease !== void 0
			? config.xCanRelease
			: this.xCanSpawn;

		this.ySpawnMin = 0;
		this.ySpawnMax = 0;
		this.yMultiplier = config.yMultiplier || 0;
		this.yGapRange = config.yGapRange || { min: 0, max: 0 };
		this.yCanSpawn = config.yCanSpawn !== void 0
			? config.yCanSpawn
			: true;
		this.yCanRelease = config.yCanRelease !== void 0
			? config.yCanRelease
			: this.yCanSpawn;

		this.index = index;
		this.preventTearing = config.preventTearing || false;
		this.ordered = config.ordered || false;
		this.pieceIndex = 0;
		this.pieceOptions = config.pieceOptions;
		this.pieces = [];

		var s = this.style;
		s.x = config.x || 0;
		s.y = config.y || 0;
		s.width = config.width || 1;
		s.height = config.height || 1;
		s.zIndex = config.zIndex || 1;

		// process layer image data
		var pieceOptions = config.pieceOptions;
		for (var i = 0; i < pieceOptions.length; i++) {
			var pieceData = pieceOptions[i];
			if (pieceData.id === void 0) {
				pieceData.id = _uid++;
			}
			!pieceCache[pieceData.id] && this.cachePieceData(pieceData);
		}
	};

	this.cachePieceData = function(data) {
		var pieceData = pieceCache[data.id] = {};
		pieceData.img = new Image({ url: data.image });
		pieceData.x = data.x || 0;
		pieceData.y = data.y || 0;
		pieceData.zIndex = data.zIndex || 0;
		pieceData.r = data.r || 0;
		var b = pieceData.img.getBounds();
		pieceData.width = data.width || b.width + b.marginLeft + b.marginRight;
		pieceData.height = data.height || b.height + b.marginTop + b.marginBottom;
		pieceData.anchorX = data.anchorX || pieceData.width / 2;
		pieceData.anchorY = data.anchorY || pieceData.height / 2;
		pieceData.scale = data.scale !== void 0 ? data.scale : 1;
		pieceData.scaleX = data.scaleX !== void 0 ? data.scaleX : 1;
		pieceData.scaleY = data.scaleY !== void 0 ? data.scaleY : 1;
		pieceData.opacity = data.opacity !== void 0 ? data.opacity : 1;
		pieceData.flipX = data.flipX || false;
		pieceData.flipY = data.flipY || false;
		pieceData.compositeOperation = data.compositeOperation || "";
		pieceData.styleRanges = data.styleRanges || [];
		pieceData.xAlign = data.xAlign || "left";
		pieceData.yAlign = data.yAlign || "top";
	};

	this.spawnPieceLeft = function(data, pool) {
		var piece = this.addPiece(data, pool);
		var pieceData = pieceCache[data.id];
		// update misc. style properties
		piece.style.x = this.xSpawnMin + pieceData.x - pieceData.width;
		piece.style.y = this.ySpawnMin + pieceData.y;
		this.applyStyleRanges(piece, pieceData);
		this.alignY(piece, pieceData);
		// next spawn with a one pixel overlap to avoid layer tears?
		var tearOffset = this.preventTearing ? 1 : 0;
		var gap = rollInt(this.xGapRange.min, this.xGapRange.max);
		this.xSpawnMin = piece.style.x + tearOffset - gap;
	};

	this.spawnPieceRight = function(data, pool) {
		var piece = this.addPiece(data, pool);
		var pieceData = pieceCache[data.id];
		// update misc. style properties
		piece.style.x = this.xSpawnMax + pieceData.x;
		piece.style.y = this.ySpawnMin + pieceData.y;
		this.applyStyleRanges(piece, pieceData);
		this.alignY(piece, pieceData);
		// next spawn with a one pixel overlap to avoid layer tears?
		var tearOffset = this.preventTearing ? 1 : 0;
		var gap = rollInt(this.xGapRange.min, this.xGapRange.max);
		this.xSpawnMax = piece.style.x + piece.style.width - tearOffset + gap;
	};

	this.spawnPieceUp = function(data, pool) {
		var piece = this.addPiece(data, pool);
		var pieceData = pieceCache[data.id];
		// update misc. style properties
		piece.style.x = this.xSpawnMin + pieceData.x;
		piece.style.y = this.ySpawnMin + pieceData.y - pieceData.height;
		this.applyStyleRanges(piece, pieceData);
		this.alignX(piece, pieceData);
		// next spawn with a one pixel overlap to avoid layer tears?
		var tearOffset = this.preventTearing ? 1 : 0;
		var gap = rollInt(this.yGapRange.min, this.yGapRange.max);
		this.ySpawnMin = piece.style.y + tearOffset - gap;
	};

	this.spawnPieceDown = function(data, pool) {
		var piece = this.addPiece(data, pool);
		var pieceData = pieceCache[data.id];
		// update misc. style properties
		piece.style.x = this.xSpawnMin + pieceData.x;
		piece.style.y = this.ySpawnMax + pieceData.y;
		this.applyStyleRanges(piece, pieceData);
		this.alignX(piece, pieceData);
		// next spawn with a one pixel overlap to avoid layer tears?
		var tearOffset = this.preventTearing ? 1 : 0;
		var gap = rollInt(this.yGapRange.min, this.yGapRange.max);
		this.ySpawnMax = piece.style.y + piece.style.height - tearOffset + gap;
	};

	this.addPiece = function(data, pool) {
		var piece = pool.obtainView({ parent: this });
		var pieceData = pieceCache[data.id];
		piece.updateOpts(pieceData);
		piece.style.compositeOperation = pieceData.compositeOperation;
		// only call setImage if we have to
		if (piece.currImage !== pieceData.img) {
			piece.currImage = pieceData.img;
			piece.setImage(pieceData.img);
		}
		this.pieces.push(piece);
		return piece;
	};

	this.applyStyleRanges = function(piece, pieceData) {
		var ranges = pieceData.styleRanges;
		for (var i = 0; i < ranges.length; i++) {
			var range = ranges[i];
			piece.style[range[0]] = rollFloat(range[1], range[2]);
		}
	};

	this.alignX = function(piece, pieceData) {
		if (pieceData.xAlign === "center") {
			piece.style.x -= piece.style.width / 2;
		} else if (pieceData.xAlign === "right") {
			piece.style.x -= piece.style.width;
		}
	};

	this.alignY = function(piece, pieceData) {
		if (pieceData.yAlign === "center") {
			piece.style.y -= piece.style.height / 2;
		} else if (pieceData.yAlign === "bottom") {
			piece.style.y -= piece.style.height;
		}
	};
});
