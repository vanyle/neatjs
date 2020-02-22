// Display stuff:
// To canvas:
let canvas = document.getElementById("canvas");
let g = canvas.getContext('2d');
let clickedIndividual;

let cameraX = worldSize/2; // camera is at world center by default
let cameraY = worldSize/2;

let zoomCam = .5;

let camRefX = 0; // used to drag screen around with mouse.
let camRefY = 0;

let isMouseDown = false;
let isMouseDownStart = false;
let mx = 0; // mouse position in canvas coords.
let my = 0;

function computeCanvasPos(x,y){ // world pos -> canvas pos
	return {
		'x':(x - cameraX) * zoomCam * canvas.width / worldSize + canvas.width/2,
		'y':(y - cameraY) * zoomCam * canvas.height / worldSize + canvas.height/2
	};
}
// use to draw things with a specific size.
// This method is correct only if the canvas is the square.
// If not, we'd need to add the angle used by the scalar and circle would be rendered as circles anyway so canvas is a square.
function computeScalarCanvasPos(x){
	return x * zoomCam * canvas.width / worldSize;
}
function reverseCanvasPos(x,y){ // win pos -> world pos
	return {
		'x':(x - canvas.width/2)*worldSize / canvas.width / zoomCam + cameraX + worldSize/2,
		'y':(y - canvas.height/2)*worldSize / canvas.height / zoomCam + cameraY + worldSize/2
	};
}

function drawIndividual(indiv){
	// map indiv from [0 ; 100] to [maxsize ; 100-maxsize]
	// then to screen size.
	let pos = computeCanvasPos(indiv.x,indiv.y);
	g.fillStyle = "rgb(" + indiv.traits.color[0] + "," + indiv.traits.color[1] + "," + indiv.traits.color[2] + ")";

	let drawsize = computeScalarCanvasPos(indiv.traits.size);

	g.beginPath();
	g.arc(pos.x,pos.y,drawsize,0,2*Math.PI);
	g.fill();

	// Smiley face for individuals :)
	const eyeDistanceAngle = Math.PI / 6;
	const eyeDistance = indiv.traits.size * .5;

	let eye1 = computeCanvasPos(indiv.x + Math.cos(indiv.rotation + eyeDistanceAngle)*eyeDistance,indiv.y + Math.sin(indiv.rotation + eyeDistanceAngle)*eyeDistance);
	let eye2 = computeCanvasPos(indiv.x + Math.cos(indiv.rotation - eyeDistanceAngle)*eyeDistance,indiv.y + Math.sin(indiv.rotation - eyeDistanceAngle)*eyeDistance);
	
	g.fillStyle = "black";
	g.beginPath();
	g.arc(eye1.x,eye1.y,drawsize/10,0,2*Math.PI);
	g.arc(eye2.x,eye2.y,drawsize/10,0,2*Math.PI);
	g.fill();

	const mouthDist = 0.8 * indiv.traits.size;
	const smileAmount = 0.2 * indiv.traits.size;

	let mouth1 = computeCanvasPos(indiv.x + Math.cos(indiv.rotation + eyeDistanceAngle)*mouthDist,indiv.y + Math.sin(indiv.rotation + eyeDistanceAngle)*mouthDist);
	let mouth2 = computeCanvasPos(indiv.x + Math.cos(indiv.rotation - eyeDistanceAngle)*mouthDist,indiv.y + Math.sin(indiv.rotation - eyeDistanceAngle)*mouthDist);
	// control point for quadratic curve.
	let mouthC = computeCanvasPos(indiv.x + Math.cos(indiv.rotation)*(mouthDist+smileAmount),indiv.y + Math.sin(indiv.rotation)*(mouthDist+smileAmount));

	g.beginPath();
	g.moveTo(mouth1.x,mouth1.y);
	g.quadraticCurveTo(mouthC.x,mouthC.y,mouth2.x,mouth2.y);
	g.stroke();
}
function drawFood(x,y){
	let pos = computeCanvasPos(x,y);

	g.fillStyle = "black";
	let drawnFoodSize = computeScalarCanvasPos(foodSize);

	g.beginPath();
	g.arc(pos.x,pos.y,drawnFoodSize,0,2*Math.PI);
	g.fill();
}

function render(){
	canvas.width = innerWidth;
	canvas.height = innerWidth;

	for(let i = 0;i < food.length;i++){
		drawFood(food[i].x,food[i].y);
	}
	for(let i = 0;i < displayedPopulation.length;i++){
		drawIndividual(displayedPopulation[i]);
	}

	// draw borders

	let pos1 = computeCanvasPos(0,0);
	let pos2 = computeCanvasPos(0,100);
	let pos3 = computeCanvasPos(100,100);
	let pos4 = computeCanvasPos(100,0);
	g.beginPath();
	g.moveTo(pos1.x,pos1.y);
	g.lineTo(pos2.x,pos2.y);
	g.lineTo(pos3.x,pos3.y);
	g.lineTo(pos4.x,pos4.y);
	g.lineTo(pos1.x,pos1.y);
	g.stroke();

	// draw some debug stuff:

	// What the individual clicked sees and its brain.
	if(clickedIndividual !== undefined){
		let view = getInputs(clickedIndividual,food);
		for(let i = 0;i < view.length;i++){
			g.fillStyle = 'rgb('+Math.floor(view[i]*400)+',0,0)';
			g.fillRect(20*i+10,10,10,10);
		}


	}

	requestAnimationFrame(render);
}
render();

function makeFlash(ind){
	if(ind !== undefined && ind.oldColor === undefined){
		ind.oldColor = ind.traits.color;
		ind.traits.color = [0,0,0];
		setTimeout(function(){
			ind.traits.color = ind.oldColor;
			ind.oldColor = undefined;
		},300);
	}
}

addEventListener('click',function(ev){
	for(let i = 0;i < displayedPopulation.length;i++){
		let indiv = displayedPopulation[i];
		let ipos = computeCanvasPos(indiv.x,indiv.y);
		let drawsize = indiv.traits.size * canvas.height * zoomCam / worldSize;

		let dist = (mx - ipos.x) ** 2 + (my - ipos.y) ** 2;

		if(dist < drawsize ** 2 && indiv.traits.color != [0,0,0]){
			clickedIndividual = indiv;
			makeFlash(clickedIndividual);
			break;
		}

	}
});

canvas.addEventListener('mousedown',function(){
	isMouseDown = true;
	isMouseDownStart = true;
});
canvas.addEventListener('mouseup',function(){
	isMouseDown = false;
});
canvas.addEventListener('mousemove',function(ev){
	let boundingBox = canvas.getBoundingClientRect();
	mx = (ev.clientX - boundingBox.left) * canvas.width / canvas.offsetWidth;
	my = (ev.clientY - boundingBox.top) * canvas.height / canvas.offsetHeight;


	if(isMouseDown){
		// convert x and y to world coords:
		let pos = reverseCanvasPos(mx,my);
		
		if(isMouseDownStart){
			camRefX = pos.x;
			camRefY = pos.y;
		}
		cameraX = (camRefX - pos.x + cameraX);
		cameraY = (camRefY - pos.y + cameraY);
		isMouseDownStart = false;
	}
});
canvas.addEventListener('mousewheel',function(ev){
	let dy = ev.deltaY;
	zoomCam *= Math.exp(-dy/1000);
});

// To overlay:
let nodesToBind = document.querySelectorAll("[bind]");
for(let i = 0;i < nodesToBind.length;i++){
	let node = nodesToBind[i];
	(function(n){
		let varname = node.getAttribute("bind");
		setInterval(function(){
			try{
				node.innerHTML = eval(varname);
			}catch(err){
				console.log("Err while eval for:");
				console.log(node);
				console.log(err);
			}
		},10);
	})(node);
}

// Render network:
let network_container = document.getElementById('network');
let net = new Network(["foodDistance","energyLevel"],["rotateLeft","rotateRight","moveFaster"]);