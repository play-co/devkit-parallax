DevKit Parallax Module
======================

The [Parallax](https://github.com/gameclosure/devkit-parallax/blob/master/src/Parallax.js) class provides functionality for 2D scrolling (in 4 directions), via powerful config, with multiple layers, varied speeds, and automatic spawning / recycling of views.

## Installation and Imports

Add devkit-parallax to dependencies in your game's manifest.json:
```
  "dependencies": {
    "devkit-parallax": "https://github.com/gameclosure/devkit-parallax#v0.1.2"
  },
```

Feel free to change the `v0.1.2` to a tag or branch of parallax, then run `devkit install` within your game's directory. Once installed, you can import it into your game code:
```
  import parallax.Parallax as Parallax;
```

## Parallax.js

### Parallax Config

TODO ...

 * `prop` - type: `type` - description


### Parallax Lifecycle

The following functions determine how and when your parallax lives and dies.

#### `reset(config)`
When your parallax should appear, call its `reset` function to apply its config. Doing so will initialize your parallax layers, recycle any existing layers, and set the parallax coordinates to (0, 0).

#### `update(x, y)`
While a parallax is active, you should call its `update` function once per tick, and pass in the latest (x, y) coordinates. Usually these coordinates refer to the position of your player's avatar in your game-space. Each parallax layer will update automatically based on the change in these coordinates, recycling and spawning views as appropriate (based on the width and height of the provided rootView, parent, or superview).


## Examples

Open-source example(s) built on DevKit with this module:

 * [Drone Swarm](https://github.com/weebygames/swarm)
