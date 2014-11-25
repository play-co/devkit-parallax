import animate;
import ui.View as View;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;
import ui.ViewPool as ViewPool;

import src.lib.utils as utils;
import src.conf.parallaxConfig as parallaxConfig;

var random = Math.random;
var choose = utils.choose;
var rollInt = utils.rollInt;
var rollFloat = utils.rollFloat;

var BG_WIDTH = G_BG_WIDTH;
var BG_HEIGHT = G_BG_HEIGHT;
var FADE_TIME = 250;

var gameView;
var imgCache = {};

var ParallaxLayer = Class(View, function() {
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
		imgData.anchorX = imgData.width / 2;
		imgData.anchorY = imgData.height / 2;
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

exports = Class(function() {
	var layerPool = new ViewPool({
		ctor: ParallaxLayer,
		initCount: 5
	});
	var piecePool = new ViewPool({
		ctor: ImageView,
		initCount: 20
	});

	this.init = function(opts) {
		gameView = opts.gameView;
		this.rootView = opts.parent;
		this.layers = [];
	};

	this.reset = function(levelID) {
		this.releaseLayers();
		this.initializeLayers(parallaxConfig[levelID]);
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

	this.update = function(dt) {
		var layers = this.layers;
		var screenY = gameView.player.getScreenY();
		for (var l = 0, len = layers.length; l < len; l++) {
			var layer = layers[l];
			var layerY = layer.style.y = ~~(-screenY * layer.speedRatio);
			this.releaseOffscreenPieces(layer, layerY);
			this.spawnPieces(layer, layerY);
		}
	};

	this.releaseOffscreenPieces = function(layer, y) {
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

	this.fadeLayer = function(index, opacity) {
		animate(this.layers[index]).now({
			opacity: opacity
		}, FADE_TIME, animate.linear);
	};
});
