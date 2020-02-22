// Able to render networks, mutate them and do computation on them
// This is a JS library for the neat algorithm.
// Made by vanyle.

"use strict";

// Use the network object to create an evolvable individual.

let activators = {
	relu: function(x){return x>0 ? x : 0},
	sigmoid: function(x){return 1/(1+Math.exp(-x))},
	id: function(x){return x;},

	// According to the following article:
	// https://eplex.cs.ucf.edu/papers/dambrosio_gecco07.pdf
	// Using activator functions with a period or symetry can lead to interesting capabilities for the network.
	// They seem to be more suited for image generation but they are included nonetheless

	periodic: function(x){return Math.sin(x * Math.PI * 2);},
	periodic2: function(x){return Math.floor(x);},
	symetric: function(x){return Math.abs(x);}
};

let uniqueHistoricCounter = 0;

class Network{
	// inputLayout example: ["foodDistance","energyLevel"]
	// outputLayout example: ["rotateLeft","moveFaster"]
	constructor(inputLayout,outputLayout,settings){
		this.nodes = {}; // actual node objects, hashmap. nodeIds are keys.
		this.inputNodes = []; // node ids of inputs (contains strings starts with i)
		this.outputNodes = []; // bide ids of outputs (contains strings starts with o)
		this.edges = {}; // actual edges.

		this.fitness = 0; // bigger = better
		this.fitnessTestsCount = 0; // counts how many time the fitness was tested. Used for averaging the fitness properly.

		// edge example:
		/*
		this.edges = {
			<historicId> : {
				'from':nodeId1,
				'to':nodeId2,
				'weight':.5,
				'historicId':0, // used for mutations and breeding
			}
		}
		*/

		// things saved from the settings object if not undefined.
		if(settings === undefined){
			settings = {};
		}
		this.defaultInputActivator = settings.defaultInputActivator || activators.id;
		this.defaultOuputActivator = settings.defaultOuputActivator || activators.relu;
		this.activators = settings.activators || [activators.relu,activators.sigmoid];

		// default weight for new edges. From -2 to 2 by default.
		this.weightInit = settings.weightInit || function(){return (Math.random()-.5) * 4;};

		for(let i = 0;i < inputLayout.length;i++){
			let n = {
				id:'i'+i,
				color:'#f00',
				x:0,
				y:i,
				value:0,
				activator: this.defaultInputActivator,
				label: inputLayout[i]
			};

			this.nodes[n.id] = n;
			this.inputNodes.push(n.id);
		}
		for(let i = 0;i < outputLayout.length;i++){
			let n = {
				id:'o'+i,
				color:'#00f',
				x:1,
				y:i,
				value:0,
				activator: this.defaultOuputActivator,
				label: outputLayout[i]
			};

			this.nodes[n.id] = n;
			this.outputNodes.push(n.id);
		}


		// data used solely to render the graph (not used currently)
		this.camX = 0; // in canvas coords.
		this.camY = 0;
		this.prevCamX = 0;
		this.prevCamY = 0;
		this.zoom = 1;
	}
	render(canvas,g){ // g is canvas context
		let minx = 0;
		let miny = 0;
		let maxx = 0;
		let maxy = 0;
		for(let i in this.nodes){
			if(this.nodes[i].x < minx){
				minx = this.nodes[i].x;
			}
			if(this.nodes[i].y < miny){
				miny = this.nodes[i].y;
			}
			if(this.nodes[i].x > maxx){
				maxx = this.nodes[i].x;
			}
			if(this.nodes[i].y > maxy){
				maxy = this.nodes[i].y;
			}
		}

		const nodeSize = Math.min(canvas.width,canvas.height) / 35;
		const padding = 2 * nodeSize;
		const scaleX = ((canvas.width-2*padding) / (maxx - minx)) * this.zoom;
		const scaleY = ((canvas.height-2*padding) / (maxy - miny)) * this.zoom;
		const self = this;

		//console.log(minx,miny,maxx,maxy);

		const xval = function(x){
			return x * scaleX + padding + self.camX;
		}
		const yval = function(y){
			return y * scaleY + padding + self.camY;
		}
		// clear canvas.
		g.clearRect(0,0,canvas.width,canvas.height);

		for(let i in this.nodes){
			g.strokeStyle = this.nodes[i].color;
			g.beginPath();
			let nodeX = xval(this.nodes[i].x);
			let nodeY = yval(this.nodes[i].y);
			// x,y, r, angleStart, angleEnd.
			// console.log(nodeX,nodeY);
			g.arc(nodeX,nodeY,nodeSize,0,2*Math.PI);
			g.stroke();
		}

		for(let i in this.edges){
			let nodeBegin = this.nodes[this.edges[i].from];
			let nodeEnd = this.nodes[this.edges[i].to];

			g.strokeStyle = nodeBegin.color;
			g.beginPath();
			g.moveTo(xval(nodeBegin.x),yval(nodeBegin.y));
			g.lineTo(xval(nodeEnd.x),yval(nodeEnd.y));
			g.stroke();
		}

	}
	edgeToNode(edgeId){ // transforms an edge into a node
		// choose an edge at random.
		let ed = this.edges[edgeId];

		if(ed === undefined){
			console.error("Unknown edgeId. Unable to perform node conversion.");
			return;
		}

		let nodeStart = this.nodes[ed.from];
		let nodeEnd = this.nodes[ed.to];

		if(nodeStart === undefined || nodeEnd === undefined){
			console.log(ed);
			console.log(this.nodes);
			throw "Bad integrity";
		}

		function pick(arr){
			return arr[Math.floor(Math.random() * arr.length)];
		}

		let n = {
			id: 'p'+Math.floor(Math.random() * 10000), // unique id search.
			color: '#0f0',
			x: (nodeStart.x + nodeEnd.x) / 2, // put new node in the middle between the 2 others + small offset
			y: (nodeStart.y + nodeEnd.y) / 2,
			value: 0,
			activator: pick(this.activators),
			label: 'process' // some nice info about at what point this node was mutate can be added here of the activator fn or something.
		};
		// Make sure n.id is unique.
		while(true){
			let sameIdFound = false;
			for(let i in this.nodes){
				if(this.nodes[i].id === n.id){
					sameIdFound = true;
					break; // break from for loop
				}
			}
			if(!sameIdFound){
				break; // break from while.
			}
			n.id = 'p' + Math.floor(Math.random() * 10000);
		}

		// connect nodeStart to n and n to nodeEnd.
		let newedge = {
			from: n.id,
			to: ed.to,
			weight: this.weightInit(),
			historicId: uniqueHistoricCounter
		}; // n -> nodeEnd
		
		// We dont change the historic id of the old edge (the ed variable). Is this a good idea ?

		ed.to = n.id; // nodeStart -> n
		this.edges[uniqueHistoricCounter] = newedge;
		uniqueHistoricCounter ++;
		this.nodes[n.id] = n;
	}
	removeNode(nodeId){ // input and output nodes cannot be removed.
		if(this.outputNodes.indexOf(nodeId) !== -1){ // can be easily sped up if perf is an issue.
			return;
		}
		if(this.inputNodes.indexOf(nodeId) !== -1){
			return;
		}
		delete this.nodes[nodeId];
		// remove all edges with nodeId inside.
		for(let i in this.edges){
			if(this.edges[i].from === nodeId || this.edges[i].to === nodeId){
				this.removeEdge(i); // bad perf. use hashmap for edges ?
				// Is infinite recursion possible because of this ? probably not.
				i -= 1;
			}
		}
	}
	removeEdge(edgeId){
		let edge = this.edges[edgeId];
		if(edge === undefined){
			console.error("Bad edge id. No removal performed");
			return;
		}
		// remove it now to prevent infinite recursion w/ removeEdge and removeNode.
		// But keep the index to avoid offset everybody until the removal is finished.
		delete this.edges[edgeId]

		// remove nodes that only have this edge as output / input and are not i/o nodes.
		let nodeFromId = edge.from;
		if(this.inputNodes.indexOf(nodeFromId) === -1){ // not from an input
			let otherEdgeFound = false; // search if another edge uses this node as input
			for(let i in this.edges){
				if(i !== edgeId && this.edges[i].from == nodeFromId){
					otherEdgeFound = true;
					break;
				}
			}
			if(!otherEdgeFound){ // nodeFrom can be removed. (unused)
				this.removeNode(nodeFromId);
			}
		}

		let nodeToId = edge.to; // same code but in the other direction.
		if(this.outputNodes.indexOf(nodeToId) === -1){
			let otherEdgeFound = false;
			for(let i in this.edges){
				if(i !== edgeId && this.edges[i].to == nodeToId){
					otherEdgeFound = true;
					break;
				}
			}
			if(!otherEdgeFound){ // nodeFrom can be removed.
				this.removeNode(nodeToId);
			}
		}
	}
	pickRandomNodeId(){ // picks a node at random.
		let nodeIds = Object.keys(this.nodes);
		return nodeIds[Math.floor(Math.random() * nodeIds.length)]; 
	}
	addRandomEdge(){
		let attempts = 0;
		// give up after 20 attempts to add an edge.
		while(attempts < 20){ // break when sucessfully adding edge. continue if some kind of failure occurs.
			attempts ++;
			let nodeFrom = this.pickRandomNodeId();
			let nodeTo = this.pickRandomNodeId();
			// nodeTo has to be to the right of nodeFrom to avoid infinite loops.
			// This test also prevents edge from having output as from and inputs as to.
			if(this.nodes[nodeTo].x <= this.nodes[nodeFrom].x){
				continue;
			}
			
			let newedge = {
				from: nodeFrom,
				to: nodeTo,
				weight: this.weightInit(),
				historicId: uniqueHistoricCounter
			};

			// check if the edge does not already exists.
			let idEdgeFound = false;
			for(let i in this.edges){
				if(this.edges[i].from == newedge.from && this.edges[i].to == newedge.to){
					idEdgeFound = true;
					break; // break from for
				}
			}
			if(idEdgeFound){
				continue;
			}
			this.edges[uniqueHistoricCounter] = newedge;
			uniqueHistoricCounter ++;

			break;
		}
	}
	// NB: because of math (Central limit theorem),
	// mutateWeights(1) twice is less strong than mutateWeights(2) once.
	mutateWeights(strength){
		// change weights of connections. Does not change overall network topology.
		for(let i in this.edges){
			this.edges[i].weight += (Math.random()-.5) * 2 * strength;
		}
	}
	copy(){
		// return a deep copy of this.
		let net = new Network([],[]);
		net.inputNodes = JSON.parse(JSON.stringify(this.inputNodes));
		net.outputNodes = JSON.parse(JSON.stringify(this.outputNodes));
		net.edges = JSON.parse(JSON.stringify(this.edges));
		// copy the node dict.
		net.nodes = {};
		for(let i in this.nodes){
			net.nodes[i] = JSON.parse(JSON.stringify(this.nodes[i]));
			net.nodes[i].activator = this.nodes[i].activator;
		}
		return net;
	}
	// mutate can change the shape of the network. Add / Remove nodes or edges.
	mutate(strength){ // strength from 0 to 1. Bigger = more mutations

		// add node (rare, 50% chance at most)
		// ie replace an edge by a node.

		const maxComputeNode = 8; // too much nodes slows down the speed of the network. Make this customizable.

		let newNodeAllowed = Object.keys(this.nodes).length < this.inputNodes.length + this.outputNodes.length + maxComputeNode;

		if(Object.keys(this.edges).length > 0 && Math.random()/2 < strength && newNodeAllowed){
			const edgeIds = Object.keys(this.edges);
			this.edgeToNode(edgeIds[Math.floor(Math.random() * edgeIds.length)]);
		}

		if(Math.random() < strength/2 && Object.keys(this.nodes).length > 0){ // remove node add all edge from or to it.
			// Removing a node destroys a lot of edges so it should be rarer than add.
			this.removeNode(this.pickRandomNodeId());
		}

		for(let i = 0;i < 5;i++){
			if(Math.random() < strength){ // add edge.
				this.addRandomEdge();
			}
		}
		for(let i = 0;i < 3;i++){
			const edgeIds = Object.keys(this.edges);
			if(edgeIds.length > 0 && Math.random() < strength){ // remove edge.
				this.removeEdge(edgeIds[Math.floor(Math.random() * edgeIds.length)]);
			}
		}
	}
	breed(otherNet){
		// The child has the same shape as one of its parents.
		
		// This could we faster if the edges were sorted by historic marking.
		// (nbr of edges)^2 -> nbr_of_edges * log(nbr_of_edges) in complexity.

		let childNet = this.copy();
		// Compute average of the edges with the same historic marking.
		for(let i in childNet.edges){
			// Find if otherNet contains an edge with the corresponding historic marking.
			if(otherNet.edges[i] !== undefined){
				// Pick one or the other, not average.
				childNet.edges[i].weight = Math.random()>.5 ? childNet.edges[i].weight : otherNet.edges[i].weight;
				break;
			}
		}

		return childNet;

	}
	compute(inputs){
		let result = new Array(this.outputNodes.length).fill(0);

		if(inputs.length != this.inputNodes.length){
			console.log(inputs);
			console.error("Bad input size for computation: ",inputs.length,this.inputNodes);
			return result;
		}
		for(let i in this.nodes){
			this.nodes[i].value = null;
		}
		for(let i = 0;i < this.inputNodes.length;i++){
			// console.log(this.inputNodes[i]);
			this.nodes[this.inputNodes[i]].value = inputs[i];
		}
		let self = this;

		let computeValue = function(nodeId){
			// console.log("cpt value of ",nodeId);
			let nodeObj = self.nodes[nodeId];
			if(nodeObj === undefined){
				console.log(nodeId);
				console.log(self);
			}
			if(nodeObj.value !== null){
				return nodeObj.value;
			}

			let val = 0; // add values from all nodes pointing to nodeId
			for(let i in self.edges){
				if(self.edges[i].to === nodeId){
					let nodeFromId = self.edges[i].from;
					val += computeValue(nodeFromId) * self.edges[i].weight;
				}
			}
			// val is 0 if there are no connections
			nodeObj.value = nodeObj.activator(val);
			return nodeObj.value;
		}

		// spread values over the whole network.
		for(let i = 0;i < result.length;i++){
			result[i] = computeValue(this.outputNodes[i]);
		}
		return result;
	}
	// Exports network to json format.
	// Exported networks are not supposed to be evolved futher but can be used to compute values.
	// You can still evolve them if you want but its not an intended feature.
	// fitness and default activator functions are not exported.
	export(compress){
		compress = compress === undefined ? true : false; // compress by default ie remove unimportant fields like fitness or color of nodes.

		let outputObject = {};

		outputObject.inputNodes = JSON.parse(JSON.stringify(this.inputNodes));
		outputObject.outputNodes = JSON.parse(JSON.stringify(this.outputNodes));
		outputObject.edges = JSON.parse(JSON.stringify(this.edges));
		// copy the node dict.
		outputObject.nodes = {};

		for(let i in this.nodes){
			outputObject.nodes[i] = JSON.parse(JSON.stringify(this.nodes[i]));
			let actFound = false;
			for(let actName in activators){
				if(this.nodes[i].activators === activators[actName]){
					outputObject.nodes[i].activator = actName;
					actFound = true;
					break;
				}
			}
			if(compress){
				delete outputObject.nodes[i].color;
				delete outputObject.nodes[i].value;
				delete outputObject.nodes[i].label;
				delete outputObject.nodes[i].y;
			}
			if(!actFound){
				console.error("Unable to export network properly, use of custom activators functions. (Replacing them with relu.)");
				outputObject.nodes[i].activator = "relu";
			}
		}
		return JSON.stringify(outputObject);

	}
	// removes all nodes and creates a classic layout with layers
	// ex: layerShape = [5,5] : 4 layers: 1 input, 1 output and 2 hidden of size 5
	setClassicLayout(layerShape){

	}
}

// Convert json data obtained from net.export() to a network.
function importNetworkFromJSON(jsonData){
	let parsedData = JSON.parse(jsonData);
	let net = new Network([],[]);
	net.inputNodes = parsedData.inputNodes;
	net.outputNodes = parsedData.outputNodes;
	net.edges = parsedData.edges;
	net.nodes = parsedData.nodes;
	for(let i in this.nodes){
		let actFound = false;
		for(let actName in activators){
			if(net.nodes[i].activator === actName){
				net.nodes[i].activator = activators[actName];
				actFound = true;
				break;
			}
		}
		if(net.nodes[i].color === undefined){
			net.nodes[i].color = "#f00";
			net.nodes[i].value = 0;
			net.nodes[i].label = "???";
			net.nodes[i].y = Math.random() * 10;
		}
		if(!actFound){
			console.error("Unknown activator function: ",net.nodes[i].activator);
			console.error("Network probably comes from a newer version of neat. Replacing it with relu.");
			net.nodes[i].activator = activators["relu"];
		}
	}
	return net;
}

// represents a set of networks able to evolve.

/*
How does evolution work ie seperate breeding grounds to allow networks of different shapes
the ability to evole weights properly before competing with the "outer world".

Solution used here:
At the start, let's say we have like 10 networks with varying shapes.
Every network shape gets its own pool. Pools have an age.
The pools are evaluated based on the score of the 2 best individuals
of the pool divided by the age of the pool. (It makes sense that new pools have a poor score.)
This will also incentivize the formation of new pools as already existing shapes get older.

Pools with a bad score and an age greater than some value are destroyed.
Pools are like species. Only networks of the same pool can bread.
Every time a pool is destroyed, a new one is created by mutating somebody from the best pool.
The overall number of pools stays constant.
*/
class NetworkPool{
	// populationSize is the number of pools.
	constructor(inputLayout,outputLayout,settings){
		if(typeof settings !== "object"){
			settings = {};
		}

		// 50 * 20 = 1000 networks by default.
		this.poolSize = settings.poolSize || 50;
		this.poolCount = settings.poolCount || 20;

		// groups of similar networks.
		// Similar networks compete together before competing against
		// network with a very different topology to incentivize innovations.
		// Pools are kind of like species.
		this.networkPools = [];

		for(let i = 0;i < this.poolCount;i++){
			let net = new Network(inputLayout,outputLayout);

			for(let j = 0;j < 10;j++){
				net.mutate(0.7);
			}

			this.networkPools.push(this.makePoolFromNetwork(net));
		}

	}
	getPoolName(){ // returns a pronounceable, memorable word.
		const vowels = "aeiou";
		const consonants = "tsmnpklv";
		let name = "";
		for(let i = 0;i < 4;i++){
			name += consonants[Math.floor(Math.random() * vowels.length)];
			name += vowels[Math.floor(Math.random() * vowels.length)];
		}
		return name;
	}
	// poolVariation: how similar are the individuals in the pool when created. 0 = identical. 1 by default
	makePoolFromNetwork(net,poolVariation){
		poolVariation = typeof poolVariation === "number" ? poolVariation : 1;

		let networkPool = {
			age: 1,
			individuals: [net],
			successScore: 1,
			name: "pool-"+this.getPoolName()
		};
		for(let j = 0;j < this.poolSize - 1;j++){
			let newMember = net.copy();
			newMember.mutateWeights(poolVariation); // by default, weights range from -2 to 2.
			networkPool.individuals.push(newMember);
		}
		return networkPool;
	}
	// selection strength = 1: kill everybody, only 1 remains, 0: kill nobody.
	processPool(poolId,evaluationData,selectionStrength){
		// recompute fitness for everybody in the network.
		let individuals = this.networkPools[poolId].individuals;
		
		function error(arr1,arr2){
			let totalError = 0;
			for(let i = 0;i < arr1.length;i++){
				totalError += (arr1[i] - arr2[i]) ** 2;
			}
			return totalError;
		}

		for(let i = 0;i < individuals.length;i++){

			if(evaluationData instanceof Array){
				// evaluation Data is 3d array:
				// array of [arrayWithInput,arrayWithExpectedoutput]

				let oldfitnessTotal = individuals[i].fitness * individuals[i].fitnessTestsCount;
				let errorVal = 0;
				for(let j = 0;j < evaluationData.length;j++){
					let indivResponse = individuals[i].compute(evaluationData[j][0]);
					errorVal += error(indivResponse,evaluationData[j][1]);
				}
				errorVal /= evaluationData.length; // avg error over all data provided.
				oldfitnessTotal += 1/Math.abs(.001 + errorVal) * evaluationData.length;
				individuals[i].fitnessTestsCount += evaluationData.length;
				individuals[i].fitness = oldfitnessTotal / individuals[i].fitnessTestsCount;

			}else if(typeof evaluationData === "function"){
				// evaluationData is a function that takes 1 individual as input and outputs its score. (fitness)
				individuals[i].fitness = evaluationData(individuals[i]);
			}

		}
		
		this.sortPool(poolId,selectionStrength);

	}
	sortPool(poolId,selectionStrength){
		// sort everybody by fitness. (desc order)
		let individuals = this.networkPools[poolId].individuals;
		this.networkPools[poolId].individuals.sort(function(a,b){
			return b.fitness - a.fitness;
		});

		// compute the score of the pool = score of the 2 best individuals
		this.networkPools[poolId].successScore = this.networkPools[poolId].individuals[0].fitness + this.networkPools[poolId].individuals[1].fitness; 
		this.networkPools[poolId].age += 1;

		selectionStrength = selectionStrength || .3;
		// take top 70% if selectionStrength is not defined.
		// replace the others
		let remainCount = Math.max(((1 - selectionStrength) * individuals.length),1);
		for(let i = remainCount;i < individuals.length;i++){
			individuals[i] = null; // tell the garbage collector to remove this object.

			let parent1 = Math.floor(Math.random() * remainCount);
			let parent2 = Math.floor(Math.random() * remainCount/2);
			while(parent2 !== parent1){ // pick 2 good parents, we assume that there are at least 2 individuals remaining.
				parent1 = Math.floor(Math.random() * remainCount);
			}
			let newindiv = individuals[parent1].breed(individuals[parent2]);
			newindiv.mutateWeights(.1); // small mutation after breeding.
			this.networkPools[poolId].individuals[i] = newindiv;
		}
	}
	// This is too slow. Work on speed up. (Use dicts for edges probably.)
	// Also, support for custom evaluation.
	processGeneration(evaluationData,cleanPools){ // cleanPools = .9 recommended. (removes the 2 worst pools everytime.)
		// First, eval the networks of every sub pool.
		// We eval every network in the pool seperatly
		if(typeof evaluationData === "function" || evaluationData instanceof Array){
			for(let i = 0;i < this.networkPools.length;i++){
				this.processPool(i,evaluationData,0.3);
			}
		}else{
			let everybody = [];
			for(let i = 0;i < this.networkPools.length;i++){
				for(let j = 0;j < this.networkPools[i].individuals.length;j++){
					everybody.push(this.networkPools[i].individuals[j]);
				}
			}
			
			evaluationData.update(everybody);
			// Do the sorting inside the pools.
			for(let i = 0;i < this.networkPools.length;i++){
				this.sortPool(i,0.3);
			}

		}
		const successScoreAgeSmoothing = 40;
		// sort pools by score / age
		this.networkPools.sort(function(a,b){
			return b.successScore / (b.age + successScoreAgeSmoothing) - a.successScore / (a.age + successScoreAgeSmoothing);
			// return b.successScore - a.successScore;
		});

		if(typeof cleanPools !== "number"){
			return;
		}
		let remainCount = Math.max( Math.floor(cleanPools * this.networkPools.length),1);

		for(let i = remainCount;i < this.networkPools.length;i++){
			this.networkPools[i] = null;
			// make a new pool by mutating the best networks of some pools
			let rndPool = this.networkPools[Math.floor(Math.random() * remainCount / 2)];
			let originNetwork = rndPool.individuals[0].copy(); // pool individuals are sorted by fitness after processPool

			originNetwork.mutate(.5);
			
			this.networkPools[i] = this.makePoolFromNetwork(originNetwork,.3);
		}
	}
	getBestNetwork(){
		let bestIndivScore = this.networkPools[0].individuals[0].fitness;
		let bestPoolIndex = 0;
		let bestIndivIndex = 0;

		for(let i = 0;i < this.networkPools.length;i++){
			for(let j = 1;j < this.networkPools[i].individuals.length;j++){
				if(this.networkPools[i].individuals[j].fitness > bestIndivScore){
					bestIndivScore = this.networkPools[i].individuals[j].fitness;
					bestPoolIndex = i;
					bestIndivIndex = j;
				}
			}
		}

		console.log("Best is in "+this.networkPools[bestPoolIndex].name);

		return this.networkPools[bestPoolIndex].individuals[bestIndivIndex];
	}
}

// Pool containing objects that are not networks but can contain network themselves.
// For example, individuals with a size, a name and a brain represented by a network.
// Code is very similar to NetworkPool
class CustomPool{
	constructor(template,settings){
		// 50 * 20 = 1000 networks by default.
		this.poolSize = settings.poolSize || 50;
		this.poolCount = settings.poolCount || 20;

		this.networkPools = [];
		this.templateTools = template;

		// template contains a set a function to produce / copy / mutate a given object layout
		// template has to contain :
		/*
		template.copy(indivdual) -> copy of individual
		template.mutate(individual,strength=optional) -> undefined
		template.mutateWeight(individual,strength=optional) -> undefined
		template.new() -> individual (returns the most basic individual)
		The default individual should have a net field containing an initialized network.

		template.breed(indiv1,indiv2) -> individial
		*/

		for(let i = 0;i < this.poolCount;i++){
			let newIndiv = this.templateTools.new();
			if(!(newIndiv.net instanceof Network)){
				console.error("Unable to setup CustomPool, template.new goes not return a valid individual");
				throw 0;
				return;
			}
			for(let j = 0;j < 10;j++){
				this.templateTools.mutate(newIndiv,0.7);
			}
			this.networkPools.push(this.makePoolFromIndividual(newIndiv));
		}
	}
	getPoolName(){ // returns a pronounceable, memorable word.
		const vowels = "aeiou";
		const consonants = "tsmnpklv";
		let name = "";
		for(let i = 0;i < 4;i++){
			name += consonants[Math.floor(Math.random() * vowels.length)];
			name += vowels[Math.floor(Math.random() * vowels.length)];
		}
		return name;
	}
	makePoolFromIndividual(indiv,poolVariation){
		poolVariation = typeof poolVariation === "number" ? poolVariation : 1;

		let networkPool = {
			age: 1,
			individuals: [indiv],
			successScore: 1,
			name: "pool-"+this.getPoolName()
		};

		for(let j = 0;j < this.poolSize - 1;j++){
			let newIndiv = this.templateTools.copy(indiv);
			this.templateTools.mutateWeights(newIndiv,poolVariation); // by default, weights range from -2 to 2.
			networkPool.individuals.push(newIndiv);
		}
		return networkPool;
	}
	processPool(poolId,evaluationData,selectionStrength){
		// recompute fitness for everybody in the network.
		let individuals = this.networkPools[poolId].individuals;
		
		function error(arr1,arr2){
			let totalError = 0;
			for(let i = 0;i < arr1.length;i++){
				totalError += (arr1[i] - arr2[i]) ** 2;
			}
			return totalError;
		}

		for(let i = 0;i < individuals.length;i++){

			if(evaluationData instanceof Array){
				// evaluation Data is 3d array:
				// array of [arrayWithInput,arrayWithExpectedoutput]

				let oldfitnessTotal = individuals[i].net.fitness * individuals[i].net.fitnessTestsCount;
				let errorVal = 0;
				for(let j = 0;j < evaluationData.length;j++){
					let indivResponse = individuals[i].net.compute(evaluationData[j][0]);
					errorVal += error(indivResponse,evaluationData[j][1]);
				}
				errorVal /= evaluationData.length; // avg error over all data provided.
				oldfitnessTotal += 1/Math.abs(.001 + errorVal) * evaluationData.length;
				individuals[i].net.fitnessTestsCount += evaluationData.length;
				individuals[i].net.fitness = oldfitnessTotal / individuals[i].net.fitnessTestsCount;

			}else if(typeof evaluationData === "function"){
				// evaluationData is a function that takes 1 individual as input and outputs its score. (fitness)
				individuals[i].net.fitness = evaluationData(individuals[i].net);
			}

		}
		
		this.sortPool(poolId,selectionStrength);

	}

	sortPool(poolId,selectionStrength){
		// sort everybody by fitness. (desc order)
		let individuals = this.networkPools[poolId].individuals;
		this.networkPools[poolId].individuals.sort(function(a,b){
			return b.net.fitness - a.net.fitness;
		});

		// compute the score of the pool = score of the 2 best individuals
		this.networkPools[poolId].successScore = this.networkPools[poolId].individuals[0].net.fitness + this.networkPools[poolId].individuals[1].net.fitness; 
		this.networkPools[poolId].age += 1;

		selectionStrength = selectionStrength || .3;
		// take top 70% if selectionStrength is not defined.
		// replace the others
		let remainCount = Math.max(((1 - selectionStrength) * individuals.length),1);
		for(let i = remainCount;i < individuals.length;i++){
			individuals[i] = null; // tell the garbage collector to remove this object.

			let parent1 = Math.floor(Math.random() * remainCount);
			let parent2 = Math.floor(Math.random() * remainCount/2);
			while(parent2 !== parent1){ // pick 2 good parents, we assume that there are at least 2 individuals remaining.
				parent1 = Math.floor(Math.random() * remainCount);
			}
			let newindiv = this.templateTools.breed(individuals[parent1],individuals[parent2]);
			this.templateTools.mutateWeights(newindiv,.1); // small mutation after breeding.
			this.networkPools[poolId].individuals[i] = newindiv;
		}
	}
	// returns an array containing all individuals regardless of species
	getEverybody(){
		let everybody = [];
		for(let i = 0;i < this.networkPools.length;i++){
			for(let j = 0;j < this.networkPools[i].individuals.length;j++){
				everybody.push(this.networkPools[i].individuals[j]);
			}
		}
		return everybody;
	}
	// This is too slow. Work on speed up. (Use dicts for edges probably.)
	// Also, support for custom evaluation.
	processGeneration(evaluationData,cleanPools){ // cleanPools = .9 recommended. (removes the 2 worst pools everytime.)
		// First, eval the networks of every sub pool.
		// We eval every network in the pool seperatly
		if(typeof evaluationData === "function" || evaluationData instanceof Array){
			for(let i = 0;i < this.networkPools.length;i++){
				this.processPool(i,evaluationData,0.3);
			}
		}else{
			let everybody = getEverybody();
			
			evaluationData.update(everybody);
			// Do the sorting inside the pools.
			for(let i = 0;i < this.networkPools.length;i++){
				this.sortPool(i,0.3);
			}

		}
		const successScoreAgeSmoothing = 40;
		// sort pools by score / age
		this.networkPools.sort(function(a,b){
			return b.successScore / (b.age + successScoreAgeSmoothing) - a.successScore / (a.age + successScoreAgeSmoothing);
			// return b.successScore - a.successScore;
		});

		if(typeof cleanPools !== "number"){
			return;
		}
		let remainCount = Math.max( Math.floor(cleanPools * this.networkPools.length),1);

		for(let i = remainCount;i < this.networkPools.length;i++){
			this.networkPools[i] = null;
			// make a new pool by mutating the best networks of some pools
			let rndPool = this.networkPools[Math.floor(Math.random() * remainCount / 2)];
			let originNetwork = this.templateTools.copy(rndPool.individuals[0]); // pool individuals are sorted by fitness after processPool

			originNetwork.mutate(.5);
			
			this.networkPools[i] = this.makePoolFromNetwork(originNetwork,.3);
		}
	}
	getBestNetwork(){
		let bestIndivScore = this.networkPools[0].individuals[0].net.fitness;
		let bestPoolIndex = 0;
		let bestIndivIndex = 0;

		for(let i = 0;i < this.networkPools.length;i++){
			for(let j = 1;j < this.networkPools[i].individuals.length;j++){
				if(this.networkPools[i].individuals[j].net.fitness > bestIndivScore){
					bestIndivScore = this.networkPools[i].individuals[j].net.fitness;
					bestPoolIndex = i;
					bestIndivIndex = j;
				}
			}
		}

		console.log("Best is in "+this.networkPools[bestPoolIndex].name);

		return this.networkPools[bestPoolIndex].individuals[bestIndivIndex];
	}
}