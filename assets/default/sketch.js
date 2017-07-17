function windowResized() {
	createCanvas(windowWidth, windowHeight);
	background(0, 32, 0);
}

function setup() {
	windowResized();
}

function draw() {
	ellipse(mouseX, mouseY, 40, 40);
}
