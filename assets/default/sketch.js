function setup() {
	createCanvas(windowWidth, windowHeight);
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}

function draw() {
	background(0, 32, 0);
	ellipse(mouseX, mouseY, 40, 40);
}
