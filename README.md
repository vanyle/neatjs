# neat.js

neat.js is a JavaScript library for the browser or node.js. It can be used to create neural networks those shape can evolve.

## How does it work ?

Neat manages neural networks represented as graphs that can evolve. Neat starts with a few simple networks with few nodes and edges and mutates them and selects the one with the best performance based on training data. As the complexity of the network increases, their performance improves.

The networks can perform almost any computation with the right training. Neat is designed to help interesting mutation prosper in the network population to promote genetic innovations.

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

## Upcoming features

- Separate library for visualization
- Better documentation (check the demos for now)

## More about neat

More reading on the topic.

- https://en.wikipedia.org/wiki/Neuroevolution_of_augmenting_topologies
- https://www.mitpressjournals.org/doi/abs/10.1162/106365602320169811