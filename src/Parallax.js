import ui.View as View;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;
import ui.ViewPool as ViewPool;

// math and random utilities
var floor = Math.floor;
var random = Math.random;
var rollFloat = function(mn, mx) { return mn + random() * (mx - mn); };
var rollInt = function(mn, mx) { return floor(mn + random() * (1 + mx - mn)); };

// image object and config data cache
var pieceCache = {};

// the Parallax Class
exports = Class(function() {
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
		this.layerPool = new ViewPool({
			ctor: opts.layerCtor || LayerView,
			initCount: opts.layerInitCount || 0
		});
		// save opts for later
		this._opts = opts;
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
		this.layerPool.forEachActiveView(function(layer, i) {
			layer.pieces.length = 0;
			layer.removeFromSuperview();
			layer.piecePool.releaseAllViews();
			this.layerPool.releaseView(layer);
		}, this);
	};

	/**
	 * initializeLayers: prepare layers based on config for a fresh parallax
	 * ~ see README.md for details on config parameter
	 */
	this.initializeLayers = function(config) {
		for (var i = 0, len = config.length; i < len; i++) {
			var layerOpts = merge({ parent: this.rootView }, this._opts);
			var layer = this.layerPool.obtainView(layerOpts);
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
		this.layerPool.forEachActiveView(function(layer, i) {
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
				var px = layer.getMinPieceX(pieces[pieces.length - 1]);
				if (px >= -x + rvs.width) {
					layer.xSpawnMax = px;
					layer.piecePool.releaseView(pieces.pop());
				} else {
					finished = true;
				}
			}
		}

		if (layer.xCanSpawn) {
			// spawn pieces about to appear on the left
			while (layer.xSpawnMin > -x) {
				layer.spawnPieceLeft();
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
				var px = layer.getMaxPieceX(pieces[0]);
				if (px <= -x) {
					layer.xSpawnMin = px;
					layer.piecePool.releaseView(pieces.shift());
				} else {
					finished = true;
				}
			}
		}

		if (layer.xCanSpawn) {
			// spawn pieces about to appear on the right
			while (layer.xSpawnMax < -x + rvs.width) {
				layer.spawnPieceRight();
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
			// release pieces that have been pushed too far down
			var pieces = layer.pieces;
			var finished = false;
			while (pieces.length && !finished) {
				var py = layer.getMinPieceY(pieces[pieces.length - 1]);
				if (py >= -y + rvs.height) {
					layer.ySpawnMax = py;
					layer.piecePool.releaseView(pieces.pop());
				} else {
					finished = true;
				}
			}
		}

		if (layer.yCanSpawn) {
			// spawn pieces about to appear on the top
			while (layer.ySpawnMin > -y) {
				layer.spawnPieceUp();
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
			// release pieces that have been pushed too far up
			var pieces = layer.pieces;
			var finished = false;
			while (pieces.length && !finished) {
				var py = layer.getMaxPieceY(pieces[0]);
				if (py <= -y) {
					layer.ySpawnMin = py;
					layer.piecePool.releaseView(pieces.shift());
				} else {
					finished = true;
				}
			}
		}

		if (layer.yCanSpawn) {
			// spawn pieces about to appear on the bottom
			while (layer.ySpawnMax < -y + rvs.height) {
				layer.spawnPieceDown();
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
		this.xGapRange = [0, 0];
		// vertical properties
		this.ySpawnMin = 0;
		this.ySpawnMax = 0;
		this.yMultiplier = 1;
		this.yCanSpawn = true;
		this.yCanRelease = true;
		this.yGapRange = [0, 0];
		// misc. layer and piece spawning properties
		this.index = 0;
		this.ordered = false;
		this.pieceOptions = [];
		this.pieces = [];
		// views placed on layers: recycled as layers move
		this.piecePool = new ViewPool({
			ctor: opts.pieceCtor || ImageView,
			initCount: opts.pieceInitCount || 0
		});
	};

	this.reset = function(config, index) {
		this.xMultiplier = config.xMultiplier !== void 0
			? config.xMultiplier
			: 1;
		this.xGapRange = config.xGapRange || [0, 0];
		this.xCanSpawn = config.xCanSpawn !== void 0
			? config.xCanSpawn
			: true;
		this.xCanRelease = config.xCanRelease !== void 0
			? config.xCanRelease
			: this.xCanSpawn;
		this.xSpawnMin = 0;
		this.xSpawnMax = this.getGapX();

		this.yMultiplier = config.yMultiplier !== void 0
			? config.yMultiplier
			: 1;
		this.yGapRange = config.yGapRange || [0, 0];
		this.yCanSpawn = config.yCanSpawn !== void 0
			? config.yCanSpawn
			: true;
		this.yCanRelease = config.yCanRelease !== void 0
			? config.yCanRelease
			: this.yCanSpawn;
		this.ySpawnMin = 0;
		this.ySpawnMax = this.getGapY();

		this.index = index;
		this.ordered = config.ordered || false;
		this.pieceOptions = config.pieceOptions;
		this.pieces = [];

		var s = this.style;
		s.x = config.x || 0;
		s.y = config.y || 0;
		s.width = config.width || 1;
		s.height = config.height || 1;
		s.zIndex = config.zIndex || 0;

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
		pieceData.x = data.x;
		pieceData.y = data.y;
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
		pieceData.xAlign = data.xAlign || "left";
		pieceData.yAlign = data.yAlign || "top";
		// parse styleRanges into an array of arrays
		pieceData.styleRanges = [];
		var ranges = data.styleRanges || {};
		for (var key in ranges) {
			var range = ranges[key];
			pieceData.styleRanges.push([key, range[0], range[1]]);
		}
	};

	this.spawnPieceLeft = function() {
		var index = this.getNextPieceIndex(-1);
		var data = this.pieceOptions[index];
		var piece = this.addPiece(data);
		var pieceData = pieceCache[data.id];
		var x = pieceData.x || 0;
		var y = pieceData.y !== void 0
			? pieceData.y
			: rollInt(this.ySpawnMin, this.ySpawnMax);
		piece.index = index;
		piece.style.x = this.xSpawnMin + x - pieceData.width;
		piece.style.y = y;
		this.applyStyleRanges(piece, pieceData);
		this.alignPieceY(piece, pieceData);
		this.pieces.unshift(piece);
		this.updateSpawnX(piece);
		this.yCanSpawn && this.updateSpawnY(piece);
	};

	this.spawnPieceRight = function() {
		var index = this.getNextPieceIndex(1);
		var data = this.pieceOptions[index];
		var piece = this.addPiece(data);
		var pieceData = pieceCache[data.id];
		var x = pieceData.x || 0;
		var y = pieceData.y !== void 0
			? pieceData.y
			: rollInt(this.ySpawnMin, this.ySpawnMax);
		piece.index = index;
		piece.style.x = this.xSpawnMax + x;
		piece.style.y = y;
		this.applyStyleRanges(piece, pieceData);
		this.alignPieceY(piece, pieceData);
		this.pieces.push(piece);
		this.updateSpawnX(piece);
		this.yCanSpawn && this.updateSpawnY(piece);
	};

	this.spawnPieceUp = function() {
		var index = this.getNextPieceIndex(-1);
		var data = this.pieceOptions[index];
		var piece = this.addPiece(data);
		var pieceData = pieceCache[data.id];
		var x = pieceData.x !== void 0
			? pieceData.x
			: rollInt(this.xSpawnMin, this.xSpawnMax);
		var y = pieceData.y || 0;
		piece.index = index;
		piece.style.x = x;
		piece.style.y = this.ySpawnMin + y - pieceData.height;
		this.applyStyleRanges(piece, pieceData);
		this.alignPieceX(piece, pieceData);
		this.pieces.unshift(piece);
		this.updateSpawnY(piece);
		this.xCanSpawn && this.updateSpawnX(piece);
	};

	this.spawnPieceDown = function() {
		var index = this.getNextPieceIndex(1);
		var data = this.pieceOptions[index];
		var piece = this.addPiece(data);
		var pieceData = pieceCache[data.id];
		var x = pieceData.x !== void 0
			? pieceData.x
			: rollInt(this.xSpawnMin, this.xSpawnMax);
		var y = pieceData.y || 0;
		piece.index = index;
		piece.style.x = x;
		piece.style.y = this.ySpawnMax + y;
		this.applyStyleRanges(piece, pieceData);
		this.alignPieceX(piece, pieceData);
		this.pieces.push(piece);
		this.updateSpawnY(piece);
		this.xCanSpawn && this.updateSpawnX(piece);
	};

	this.getNextPieceIndex = function(deltaIndex) {
		var pieces = this.pieces;
		var options = this.pieceOptions;
		var maxIndex = options.length - 1;
		if (this.ordered) {
			var lastPiece = pieces[deltaIndex > 0 ? pieces.length - 1 : 0];
			var index = ((lastPiece && lastPiece.index) + deltaIndex) || 0;
			if (index < 0) {
				index = maxIndex;
			} else if (index > maxIndex) {
				index = 0;
			}
			return index;
		} else {
			return rollInt(0, maxIndex);
		}
	};

	this.addPiece = function(data) {
		var piece = this.piecePool.obtainView({ parent: this });
		var pieceData = pieceCache[data.id];
		piece.updateOpts(pieceData);
		piece.style.compositeOperation = pieceData.compositeOperation;
		// only call setImage if we have to
		if (piece.currImage !== pieceData.img) {
			piece.currImage = pieceData.img;
			piece.setImage(pieceData.img);
		}
		return piece;
	};

	this.applyStyleRanges = function(piece, pieceData) {
		var ranges = pieceData.styleRanges;
		for (var i = 0; i < ranges.length; i++) {
			var range = ranges[i];
			piece.style[range[0]] = rollFloat(range[1], range[2]);
		}
	};

	this.alignPieceX = function(piece, pieceData) {
		if (pieceData.xAlign === "center") {
			piece.style.x -= piece.style.width / 2;
		} else if (pieceData.xAlign === "right") {
			piece.style.x -= piece.style.width;
		}
	};

	this.alignPieceY = function(piece, pieceData) {
		if (pieceData.yAlign === "center") {
			piece.style.y -= piece.style.height / 2;
		} else if (pieceData.yAlign === "bottom") {
			piece.style.y -= piece.style.height;
		}
	};

	this.updateSpawnX = function(piece) {
		var pxMin = this.getMinPieceX(piece);
		if (pxMin <= this.xSpawnMin) {
			this.xSpawnMin = pxMin - this.getGapX();
		}
		var pxMax = this.getMaxPieceX(piece);
		if (pxMax >= this.xSpawnMax) {
			this.xSpawnMax = pxMax + this.getGapX();
		}
	};

	this.updateSpawnY = function(piece) {
		var pyMin = this.getMinPieceY(piece);
		if (pyMin <= this.ySpawnMin) {
			this.ySpawnMin = pyMin - this.getGapY();
		}
		var pyMax = this.getMaxPieceY(piece);
		if (pyMax >= this.ySpawnMax) {
			this.ySpawnMax = pyMax + this.getGapY();
		}
	};

	this.getMinPieceX = function(piece) {
		var ps = piece.style;
		var scale = ps.scale * ps.scaleX;
		return ps.x + (1 - scale) * ps.anchorX;
	};

	this.getMaxPieceX = function(piece) {
		var ps = piece.style;
		var scale = ps.scale * ps.scaleX;
		return ps.x + (1 - scale) * ps.anchorX + scale * ps.width;
	};

	this.getMinPieceY = function(piece) {
		var ps = piece.style;
		var scale = ps.scale * ps.scaleY;
		return ps.y + (1 - scale) * ps.anchorY;
	};

	this.getMaxPieceY = function(piece) {
		var ps = piece.style;
		var scale = ps.scale * ps.scaleY;
		return ps.y + (1 - scale) * ps.anchorY + scale * ps.height;
	};

	this.getGapX = function() {
		return rollInt(this.xGapRange[0], this.xGapRange[1]);
	};

	this.getGapY = function() {
		return rollInt(this.yGapRange[0], this.yGapRange[1])
	};
});
