DevKit Parallax Module
======================

The [Parallax](https://github.com/gameclosure/devkit-parallax/blob/master/src/Parallax.js) class provides functionality for 2D scrolling (in 4 directions), via powerful config, with multiple layers, varied speeds, and automatic spawning / recycling of views.

## Installation and Imports

Add devkit-parallax to dependencies in your game's manifest.json:
```
  "dependencies": {
    "devkit-parallax": "https://github.com/gameclosure/devkit-parallax#v0.1.3"
  },
```

Feel free to change the `v0.1.3` to a tag or branch of parallax, then run `devkit install` within your game's directory. Once installed, you can import it into your game code:
```
  import parallax.Parallax as Parallax;
```

## Parallax.js

### Initializing Parallax

Like most view-related classes in DevKit, you should create each instance of parallax *once and only once*. This class handles view pooling and recycling itself, so there's usually no reason to create more than one instance or ever throw it away.

The `init` function accepts an opts object. The opts object can contain the following optional properties:

 * `rootView` - type: `View` - (REQUIRED) the parent of all parallax layer views; the width and height of this view are considered to be your screen bounds, and `Parallax` will use them to control spawning and recycling of views, as config permits
 * `layerCtor` - type: `View` - the constructor used for layers, defaults to [LayerView](https://github.com/gameclosure/devkit-parallax/blob/master/src/Parallax.js#L229)
 * `layerInitCount` - type: `number` - number of layers to init in the pool, default is 0
 * `pieceCtor` - type: `View` - the constructor used for pieces, defaults to [ImageView](http://docs.gameclosure.com/api/ui-images.html#class-ui.imageview)
 * `pieceInitCount` - type: `number` - number of pieces to init in the pool, default is 0

### Parallax Lifecycle

The following functions determine how and when your parallax lives and dies.

#### `reset(config)`
When your parallax should appear, call its `reset` function to apply its config. Doing so will recycle any existing parallax layers, initialize fresh layers based on the provided config, and set the parallax coordinates to (0, 0).

#### `update(x, y)`
While a parallax is active, you should call its `update` function once per tick, and pass in the latest coordinates (x, y). Usually these coordinates are relative to the position of your player's avatar in your game-space. Each parallax layer will update automatically based on the change in these coordinates, recycling and spawning views as appropriate (based on the width and height of the provided rootView, parent, or superview).


### Parallax Config

The `reset` function expects the paramater `config`, an array of objects that each represent a parallax layer. Each layer object can have the following properties:

 * `xMultiplier` - type: `number` - used to multiply horizontal movement of the layer; defaults to `1`
 * `xCanSpawn` - type: `boolean` - whether or not horizontal movement allows parallax pieces to spawn; defaults to `true`
 * `xCanRelease` - type: `boolean` - whether or not horizontal movement allows parallax pieces to recycle once off-screen; defaults to `true`
 * `xGapRange` - type: `array` - in the format `[min, max]`, determines the horizontal spacing between parallax pieces on this layer; defaults to `[0, 0]` for no spacing
 * `yMultiplier` - type: `number` - used to multiply vertical movement of the layer; defaults to `1`
 * `yCanSpawn` - type: `boolean` - whether or not vertical movement allows parallax pieces to spawn; defaults to `true`
 * `yCanRelease` - type: `boolean` - whether or not vertical movement allows parallax pieces to recycle once off-screen; defaults to `true`
 * `yGapRange` - type: `array` - in the format `[min, max]`, determines the vertical spacing between parallax pieces on this layer; defaults to `[0, 0]` for no spacing
 * `zIndex` - type: `number` - zIndex of this layer within the rootView; defaults to `0`
 * `scaleMultiplier` - type: `number` - value between 0 and 1, how much a parallax layer should be affected by scaling, like from a camera viewport implementation
 * `ordered` - type: `boolean` - `false` by default, means that a piece is randomly chosen; if `true`, iterates over each piece in order and loops
 * `pieceOptions` - type: `array` - (REQUIRED) an array of config objects representing parallax pieces

Each parallax piece (in the `pieceOptions` array) within a layer can have its own configurable options, defined by the following properties:

 * `id` - type: `string` - unique identifier for this piece, used to cache config data / image; defaults to an auto-generated unique id
 * `image` - type: `string` - (REQUIRED) path to the image asset used to render this piece
 * `x` - type: `number` - horizontal offset from the x spawn-coordinate; defaults to `0`
 * `y` - type: `number` - vertical offset from the y spawn-coordinate; defaults to `0`
 * `zIndex` - type: `number` - zIndex of this piece within the layer; defaults to `0`
 * `r` - type: `number` - rotation of the piece in radians
 * `width` - type: `number` - width of the piece; defaults to the image asset width
 * `height` - type: `number` - height of the piece; defaults to the image asset height
 * `anchorX` - type: `number` - the horizontal anchor of the piece; defaults to centered (half the width)
 * `anchorY` - type: `number` - the vertical anchor of the piece; defaults to centered (half the height)
 * `scale` - type: `number` - the scale of the piece; defaults to `1`
 * `scaleX` - type: `number` - the horizontal scale of the piece; defaults to `1`
 * `scaleY` - type: `number` - the vertical scale of the piece; defaults to `1`
 * `opacity` - type: `number` - ranges from transparent `0` to opaque `1`; defaults to `1`
 * `flipX` - type: `boolean` - if `true`, flips the image horizontally; defaults to `false`
 * `flipY` - type: `boolean` - if `true`, flips the image vertically; defaults to `false`
 * `compositeOperation` - type: `string` - valid [HTML5 composite operation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Compositing) to apply to this piece
 * `xAlign` - type: `string` - one of [`left`, `center`, `right`], horizontal alignment of the piece with respect to its spawn position; defaults to `left`
 * `yAlign` - type: `string` - one of [`top`, `center`, `bottom`], vertical alignment of the piece with respect to its spawn position; defaults to `top`
 * `styleRanges` - type: `object` - any of the numerical `style` properties listed above can be added as properties of this object, and should have array values in the format `[min, max]` to specify a valid range to be generated randomly per piece spawn

That's a lot of config to comprehend, so here's an example of what working config might look like:

 ```
 [
    {
        id: "bg",
        zIndex: 1,
        xMultiplier: 0,
        xCanSpawn: false,
        xCanRelease: false,
        yMultiplier: 0.125,
        yCanSpawn: true,
        yCanRelease: true,
        ordered: true,
        pieceOptions: [
            {
                id: "bg1",
                image: "resources/images/bg1.png"
            },
            {
                id: "bg2",
                image: "resources/images/bg2.png"
            }
        ]
    },
    {
        id: "farClouds",
        zIndex: 2,
        xMultiplier: 0,
        xCanSpawn: false,
        xCanRelease: false,
        yMultiplier: 0.2,
        yCanSpawn: true,
        yCanRelease: true,
        yGapRange: [200, 500],
        pieceOptions: [
            {
                id: "farCloudstream",
                styleRanges: { scale: [1, 2] },
                opacity: 0.125,
                compositeOperation: "lighter",
                image: "resources/images/bgStream.png"
            },
            {
                id: "farCloudstreamFlip",
                flipX: true,
                styleRanges: { scale: [1, 2] },
                opacity: 0.125,
                compositeOperation: "lighter",
                image: "resources/images/bgStream.png"
            }
        ]
    },
    {
        id: "midClouds",
        zIndex: 3,
        xMultiplier: 0,
        xCanSpawn: false,
        xCanRelease: false,
        yMultiplier: 0.4,
        yCanSpawn: true,
        yCanRelease: true,
        yGapRange: [400, 1000],
        pieceOptions: [
            {
                id: "midCloudstream",
                styleRanges: { scale: [2, 4] },
                opacity: 0.175,
                compositeOperation: "lighter",
                image: "resources/images/bgStream.png"
            },
            {
                id: "midCloudstreamFlip",
                flipX: true,
                styleRanges: { scale: [2, 4] },
                opacity: 0.175,
                compositeOperation: "lighter",
                image: "resources/images/bgStream.png"
            }
        ]
    }
]
 ```


## Examples

Open-source example(s) built on DevKit with this module:

 * [Drone Swarm](https://github.com/weebygames/swarm)
