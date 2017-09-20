function windowResized() {
	createCanvas(windowWidth, windowHeight);
}

function setup() {
	windowResized();
}

function draw() {
	background(0, 32, 0);
	ellipse(mouseX, mouseY, 40, 40);
}
