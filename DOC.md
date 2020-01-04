# Documentation for neat.js

## Network - class

**constructor**

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

WIP.