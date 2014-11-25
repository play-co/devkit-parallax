import ui.View as View;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;
import ui.ViewPool as ViewPool;

import src.lib.utils as utils;

var choose = utils.choose;
var rollInt = utils.rollInt;
var rollFloat = utils.rollFloat;
var random = Math.random;
var imgCache = {};

exports = Class(function() {
	var layerPool;
	var piecePool;

	this.init = function(opts) {
		layerPool = new ViewPool({
			ctor: opts.layerCtor || Layer,
			initCount: opts.layerInitCount || 0
		});
		piecePool = new ViewPool({
			ctor: opts.pieceCtor || ImageView,
			initCount: opts.pieceInitCount || 0
		});
		this.rootView = opts.rootView || opts.parent || opts.superview;
		this.layers = [];
	};

	this.reset = function(config) {
		this.releaseLayers();
		this.initializeLayers(config);
	};

	this.releaseLayers = function() {
		var layers = this.layers;
		while (layers.length) {
			var layer = layers.pop();
			var pieces = layer.pieces;
			while (pieces.length) {
				var piece = pieces.pop();
				piece.removeFromSuperview();
				piecePool.releaseView(piece);
			}
			layer.removeFromSuperview();
			layerPool.releaseView(layer);
		}
	};

	this.initializeLayers = function(config) {
		var layers = this.layers;
		for (var i = 0; i < config.length; i++) {
			var layerConf = config[i];
			var layer = layerPool.obtainView({ parent: this.rootView });
			layer.reset(layerConf, i);
			layers.push(layer);
		}
	};

	this.update = function(x, y) {
		var layers = this.layers;
		for (var l = 0, len = layers.length; l < len; l++) {
			var layer = layers[l];
			var layerX = layer.style.x = ~~(x * layer.speedRatio);
			var layerY = layer.style.y = ~~(y * layer.speedRatio);
			this.releaseHorzPieces(layer, layerX);
			this.releaseVertPieces(layer, layerY);
			this.spawnHorzPieces(layer, layerX);
			this.spawnVertPieces(layer, layerY);
		}
	};

	this.releaseHorzPieces = function(layer, x) {
		var pieces = layer.pieces;
		var piece = pieces[0];
		while (piece && piece.style.y >= y + BG_HEIGHT) {
			pieces.shift();
			piecePool.releaseView(piece);
			piece = pieces[0];
		}
	};

	this.releaseVertPieces = function(layer, y) {
		var pieces = layer.pieces;
		var piece = pieces[0];
		while (piece && piece.style.y >= -y + BG_HEIGHT) {
			pieces.shift();
			piecePool.releaseView(piece);
			piece = pieces[0];
		}
	};

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

var Layer = exports.Layer = Class(View, function() {
	var sup = View.prototype;

	this.init = function(opts) {
		sup.init.call(this, opts);

		this.x = 0;
		this.y = 0;
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
