# Documentation for neat.js

## Network - class

Network represent a neural network that can evolve or be used to compute a value. Its the core of the library.

### constructor

parameters: inputLayout, outputLayout, settings
*inputLayout*: The name of the inputs of the network. Array of string.
*outputLayout*: The name of the outputs of the network. Array of strings
*settings*: (optional) Settings object for the network.

```js
// A possible network to predict the strength required when throwing an object to reach a specific distance.

// The settings object here is the one used by default.
const networkSettings = {
    defaultInputActivator: activators.id,
    defaultOuputActivator: activators.relu,
    activators: [activators.relu],
    weightInit:function(){return (Math.random()-.5) * 4}
};

let net = new Network(["throwAngle","throwDistance"],["throwStrength"],networkSettings);
```

### render
Draws the network onto a canvas

parameters: canvas, context
*canvas*: The canvas onto which the network should be drawn. Can be of any size.
*context*: The context of the canvas. Obtained with `canvas.getContext('2d')`

```js
let net = ...
let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");
net.render(canvas,context);
```

### edgeToNode  (private)
Replaces an edge of the network the a node and 2 edges coming from and to the node.

parameters: edgeId
*edgeId*: the index of the edge inside the edges array of the network (int)

### removeNode
Removes a node from the network as well as all edges coming to and from it. If the removal of those edges creates nodes with no links to input or output nodes, those nodes are also removed in order that all nodes of the network have a use when carrying the computation.

parameters: nodeId
*nodeId*: The id of the node, its key inside the nodes dict (str)

### removeEdge
Removes an edge from the network. If the removal of this edge creaes nodes with no links to input or output nodes, those nodes are removed like in removeNode.

parameters: edgeId
*edgeId*: the index of the edge inside the edges array of the network (int)

### pickRandomNode
Returns the id of a node at random inside the network.

parameters: none

### addRandomEdge
Add an edge randomly inside the network.

parameters: none

### mutateWeights
Changes the weights of the edges of the network by adding or substracting a random value between 0 and strength.

parameters: strength
*strength*: The strength of the weight change (float)

### mutate
Changes the layout of the network by randomly adding/removing nodes and adding/removing edges. The amount of change done to the network can be controlled with a strength value that is the probability of a change occuring. Multiple change attempts are done by the function.

parameters: strength
*strength*: Probability of changes occuring. Bigger = more changes. (float ranging from  0 to 1)

### breed
Combines the weights of two networks with the same shape.

parameters: otherNet
*otherNet*: A network object with which the breeding is performed.
returns: The result of the breeding.

### compute
Computes the response of the network when given some inputs.

parameters: inputs
*inputs*: The input to the network. (float array)
returns: An array of float containing the response of the network.

### copy
Returns a copy of the network

parameters: none
returns: A copy of the network.

### export
Exports the network to JSON

parameters: compress (optional)
*compress*: When true, the colors of the nodes are not exported not are their values and some other fields not affecting the compute function of the network.
returns: A JSON-formatted string that can be converted to a network with `importNetworkFromJSON`