# neat.js

neat.js is a JavaScript library for the browser but usable with node.js with a few tweaks. It can be used to create neural networks those shape can evolve. The library also contains some methods for visualizing the network.

## Principles

Regular neural networks 

## Getting started

The most basic thing you can do with this library is create a network and use to perform some calculations.

```js
let my_network = new Network(["input1","input2"],["output1","output2"]);
// new Network([ inputs ], [ outputs ], { settings (optional) });

let value_of_input1 = 20;
let value_of_input2 = 10;

let result = my_network.compute([value_of_input1,value_of_input2]);
console.log("Results:",result[0],"|",result[1]);
```

By default, this example will print `Results: 0 | 0` because by default, an untrained network has no connections.

You can mutate a network to add new connections to it. Check `demo.html` for a usage a bit more complex: rendering the output of the network onto a 2d canvas.

Note that **neatjs** has strict no dependencies policy. You can just download `neat.js` , import it to your project and it will work. No typescript, npm or anything else. This promotes ease of installation, usage and readability for beginners and people not using the whole JavaScript ecosystem.

## Upcoming features (contribution is welcomed)

- More settings when making the network
- Better documentation
- Add the ability to zoom with the mouse and move the camera when rendering the network
- Add the ability to set the layout of a network to a classic set of layers
- Add better support for recursion (an output is an input of the network.)